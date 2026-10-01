// --- CONFIGURATION FIREBASE & GESTIONNAIRE D'UPLOAD MULTIPAGE ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { OrchestrateurAI } from "./ai/orchestrateur.js";

// 1. Initialisation Firebase avec tes vrais identifiants
const firebaseConfig = {
  apiKey: "AIzaSyD0GbueWsIm8kaUnB6sZYykYSZl11s2JTs",
  authDomain: "tuteur-ai.firebaseapp.com",
  projectId: "tuteur-ai",
  storageBucket: "tuteur-ai.firebasestorage.app",
  messagingSenderId: "1025983965857",
  appId: "1:1025983965857:web:121d32b494c8433f9f1ee0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ID de l'élève correspondant exactement à ta collection Firestore
const eleveActifId = "coco";

// =========================================================================
// UTILITAIRE : Extraction optimisée d'une photo ou d'un PDF multipage
// =========================================================================
async function convertirDocumentEnImagesHD(file, maxPages = 6) {
  // CAS 1 : Fichier image (JPG, PNG, WEBP)
  if (file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve([e.target.result]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // CAS 2 : Fichier PDF
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
      
      // Échelle 1.2 : compromis idéal entre lisibilité parfaite du texte et légèreté d'envoi
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      // Compression JPEG à 0.75 pour éviter les lenteurs et timeouts
      const base64Page = canvas.toDataURL("image/jpeg", 0.75);
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
      // 1. Extraction des pages
      const pagesExtraites = await convertirDocumentEnImagesHD(file, 6);

      // Aperçu visuel de la première page
      if (imagePreview && pagesExtraites.length > 0) {
        imagePreview.src = pagesExtraites[0];
        imagePreview.style.display = "block";
      }

      if (analysisText) {
        analysisText.textContent = `Analyse par Nox de ${pagesExtraites.length} page(s) en cours... ⏳`;
      }

      // 2. Transmission à l'Orchestrateur IA
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
      fileInput.value = "";
    }
  });

  // Écoute en direct des erreurs de révision (Agent 4 Ninja)
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
