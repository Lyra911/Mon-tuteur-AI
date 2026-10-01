// ============================================================================
// ORCHESTRATEUR CLIENT (ai/orchestrateur.js) - DÉTECTION UNIVERSELLE D'IMAGES
// ============================================================================

import { db } from "../firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const URL_RELAIS = "https://script.google.com/macros/s/AKfycbzbvHkVRVNowyy_98Dpv44WinuqK0FmQ88HO4Q-DvcWg45P4UhH9vzzw10jmraVEDzx/exec";

function fileVersBase64(fichier) {
  return new Promise((resolve) => {
    if (!fichier || !(fichier instanceof Blob || fichier instanceof File)) {
      return resolve("");
    }
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result || "");
    lecteur.onerror = () => resolve("");
    lecteur.readAsDataURL(fichier);
  });
}

export const OrchestrateurAI = {
  async analyserFiche(donneesImages, eleveId = "coco") {
    return await this.traiterDocumentComplet(donneesImages, eleveId);
  },

  async traiterDocumentComplet(donneesImages, eleveId = "coco") {
    console.log("🔍 [Orchestrateur] Type de données reçu :", typeof donneesImages, donneesImages);

    let elementsAExtraire = [];

    // Cas 1 : L'argument est un événement JS (ex: e.target.files)
    if (donneesImages && donneesImages.target && donneesImages.target.files) {
      elementsAExtraire = Array.from(donneesImages.target.files);
    }
    // Cas 2 : L'argument est directement l'élément <input type="file">
    else if (donneesImages && donneesImages.files) {
      elementsAExtraire = Array.from(donneesImages.files);
    }
    // Cas 3 : C'est une FileList
    else if (donneesImages instanceof FileList) {
      elementsAExtraire = Array.from(donneesImages);
    }
    // Cas 4 : C'est déjà un tableau
    else if (Array.isArray(donneesImages)) {
      elementsAExtraire = donneesImages;
    }
    // Cas 5 : Un seul élément direct (File, Blob, string ou objet)
    else if (donneesImages) {
      elementsAExtraire = [donneesImages];
    }

    // Traitement et conversion asynchrone
    const promesses = elementsAExtraire.map(async (item) => {
      if (!item) return "";

      // Si c'est déjà un fichier / blob
      if (item instanceof File || item instanceof Blob) {
        return await fileVersBase64(item);
      }

      // Si c'est une string directe
      if (typeof item === "string") {
        return item;
      }

      // Si c'est un objet imbriqué
      if (typeof item === "object") {
        if (item.file instanceof File || item.file instanceof Blob) {
          return await fileVersBase64(item.file);
        }
        return item.base64 || item.data || item.image || item.src || item.url || "";
      }

      return "";
    });

    const resultats = await Promise.all(promesses);
    const imagesNettoyees = resultats.filter(str => typeof str === "string" && str.length > 50);

    console.log(`🚀 [Orchestrateur] Envoi de ${imagesNettoyees.length} image(s) valide(s) aux agents...`);

    if (imagesNettoyees.length === 0) {
      console.error("❌ Données brutes reçues non convertibles :", donneesImages);
      throw new Error("Impossible d'extraire les données Base64 des images fournies.");
    }

    // Envoi au relais Apps Script
    const rep = await fetch(URL_RELAIS, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ images: imagesNettoyees })
    });

    const resultat = await rep.json();
    if (!resultat.success) {
      throw new Error(resultat.error || "Erreur de traitement des agents");
    }

    const coursFinal = resultat.donnees;

    // Enregistrement dans Firestore
    const payloadFirestore = {
      titre: coursFinal.titre,
      matiere: coursFinal.matiere,
      message_nox: coursFinal.message_nox,
      notions_cles: coursFinal.notions_cles,
      date_creation: new Date().toISOString(),
      timestamp: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "utilisateurs", eleveId, "fiches_cours"), payloadFirestore);
    console.log("💾 [Orchestrateur] Cours enrichi sauvegardé avec succès | ID :", docRef.id);

    return { id: docRef.id, ...payloadFirestore };
  }
};
