// --- CONFIGURATION FIREBASE & GESTIONNAIRE D'UPLOAD MULTIPAGE ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { OrchestrateurAI } from "./ai/orchestrateur.js";

// 1. Initialisation Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey", // Firebase utilise les règles Firestore, pas de risque ici
  authDomain: "mon-tuteur-ai.firebaseapp.com",
  projectId: "mon-tuteur-ai",
  storageBucket: "mon-tuteur-ai.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Élève par défaut pour le prototype
const eleveActifId = "coco_01";

// =========================================================================
// UTILITAIRE : Extraction HD d'une photo ou d'un PDF multipage
// =========================================================================
async function convertirDocumentEnImagesHD(file, maxPages = 6) {
  // CAS 1 : C'est une image (JPG, PNG, WEBP)
  if (file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve([e.target.result]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // CAS 2 : C'est un PDF
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const nbPagesATraiter = Math.min(totalPages, maxPages);
    const pagesHD = [];

    const statusText = document.getElementById("analysis-text");
    if (statusText) {
      statusText.textContent = `Conversion du PDF : 0/${nbPagesATraiter} page(s)...`;
    }

    for (let numPage = 1; numPage <= nbPagesATraiter; numPage++) {
      const page = await pdf.getPage(numPage);
      
      // Facteur d'échelle 1.8 pour une excellente netteté des schémas et textes
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      // Compression JPEG 0.85 pour un envoi ultra-rapide
      const base64Page = canvas.toDataURL("image/jpeg", 0.85);
      pagesHD.push(base64Page);

      if (statusText) {
        statusText.textContent = `Conversion du PDF : ${numPage}/${nbPagesATraiter} page(s)...`;
      }
    }

    return pagesHD;
  }

  throw new Error("Format non pris en charge. Utilise un PDF ou une image.");
}

// =========================================================================
// ÉCOUTEUR D'UPLOAD SUR L'INTERFACE
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("camera-input");
  const previewZone = document.getElementById("preview-zone");
  const imagePreview = document.getElementById("image-preview");
  const analysisText = document.getElementById("analysis-text");

  if (!fileInput) return;

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (previewZone) previewZone.style.display = "block";
    if (analysisText) analysisText.textContent = "Préparation du document...";
    if (imagePreview) imagePreview.style.display = "none";

    try {
      // 1. Extraction des pages HD
      const pagesExtraites = await convertirDocumentEnImagesHD(file, 6);

      // Aperçu de la première page dans l'interface
      if (imagePreview && pagesExtraites.length > 0) {
        imagePreview.src = pagesExtraites[0];
        imagePreview.style.display = "block";
      }

      if (analysisText) {
        analysisText.textContent = `Analyse par Nox de ${pagesExtraites.length} page(s) en cours... ⏳`;
      }

      // 2. Envoi des pages à l'Agent Vision (qui utilise le relais Apps Script)
      const resultatFiche = await OrchestrateurAI.analyserFiche(
        eleveActifId,
        "",
        file.name,
        pagesExtraites
      );

      if (analysisText) {
        analysisText.textContent = `✅ "${resultatFiche.titre}" analysé avec succès !`;
      }

    } catch (err) {
      console.error("Erreur lors du traitement du document :", err);
      if (analysisText) {
        analysisText.textContent = "❌ Erreur lors de l'analyse. Réessaie avec une image plus nette.";
      }
    } finally {
      fileInput.value = ""; // Réinitialise l'input
    }
  });

  // Écoute des erreurs de l'élève en direct (Agent 4 Ninja)
  const ninjaList = document.getElementById("erreurs-list");
  const ninjaAlert = document.getElementById("ninja-alert");

  if (ninjaList && ninjaAlert) {
    const q = query(
      collection(db, "utilisateurs", eleveActifId, "erreurs_ninja"),
      orderBy("timestamp", "desc")
    );

    onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        ninjaAlert.style.display = "none";
      } else {
        ninjaAlert.style.display = "block";
        ninjaList.innerHTML = "";
        snapshot.docs.slice(0, 3).forEach((doc) => {
          const item = doc.data();
          const li = document.createElement("li");
          li.textContent = `${item.matiere} : ${item.detail}`;
          ninjaList.appendChild(li);
        });
      }
    });
  }
});
