// ============================================================================
// ORCHESTRATEUR CLIENT (ai/orchestrateur.js) - INTERCEPTION DIRECTE DU HTML
// ============================================================================

import { db } from "../firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const URL_RELAIS = "https://script.google.com/macros/s/AKfycbzbvHkVRVNowyy_98Dpv44WinuqK0FmQ88HO4Q-DvcWg45P4UhH9vzzw10jmraVEDzx/exec";

// Convertisseur Base64 ultra-fiable
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
  async analyserFiche(arg1, arg2) {
    let donneesImages = arg1;
    let eleveId = arg2 || "coco";

    // 1. Correction de l'inversion "coco" / image
    if (typeof arg1 === "string" && arg1.length < 50) {
      eleveId = arg1;
      donneesImages = arg2; 
    }

    // 2. INTERCEPTION DOM DIRECTE (Le Bypass magique)
    // Si firebase.js a passé du vide parce qu'il n'a pas attendu le chargement...
    const estVide = !donneesImages 
                 || (typeof donneesImages === "string" && donneesImages.trim().length < 50) 
                 || (Array.isArray(donneesImages) && donneesImages.length === 0);

    if (estVide) {
      console.warn("⚠️ firebase.js a envoyé une image vide. L'Orchestrateur force la récupération depuis la page web !");
      
      // On fouille la page web pour trouver le bouton d'importation
      const inputHTML = document.querySelector('input[type="file"]');
      
      if (inputHTML && inputHTML.files && inputHTML.files.length > 0) {
        donneesImages = Array.from(inputHTML.files);
        console.log("✅ Image attrapée avec succès directement depuis la page !");
      } else {
        throw new Error("Aucun fichier détecté. Veuillez sélectionner une image avant d'envoyer.");
      }
    }

    return await this.traiterDocumentComplet(donneesImages, eleveId);
  },

  async traiterDocumentComplet(donneesImages, eleveId = "coco") {
    let elementsAExtraire = [];

    // Normalisation
    if (donneesImages && donneesImages.target && donneesImages.target.files) {
      elementsAExtraire = Array.from(donneesImages.target.files);
    } else if (donneesImages && donneesImages.files) {
      elementsAExtraire = Array.from(donneesImages.files);
    } else if (donneesImages instanceof FileList) {
      elementsAExtraire = Array.from(donneesImages);
    } else if (Array.isArray(donneesImages)) {
      elementsAExtraire = donneesImages;
    } else if (donneesImages) {
      elementsAExtraire = [donneesImages];
    }

    // Conversion de chaque image
    const promesses = elementsAExtraire.map(async (item) => {
      if (!item) return "";

      if (item instanceof File || item instanceof Blob) {
        return await fileVersBase64(item);
      }

      if (typeof item === "string") {
        if (item.startsWith("blob:")) {
          try {
            const rep = await fetch(item);
            const blob = await rep.blob();
            return await fileVersBase64(blob);
          } catch (e) { return ""; }
        }
        return item;
      }

      if (typeof item === "object") {
        if (item.file instanceof File || item.file instanceof Blob) return await fileVersBase64(item.file);
        return item.base64 || item.data || item.image || item.src || item.url || "";
      }

      return "";
    });

    const resultats = await Promise.all(promesses);
    
    // On ne garde que les vrais Base64 complets
    const imagesNettoyees = resultats.filter(str => typeof str === "string" && str.length > 50);

    console.log(`🚀 [Orchestrateur] Envoi de ${imagesNettoyees.length} page(s) HD au relais Apps Script...`);

    if (imagesNettoyees.length === 0) {
      throw new Error("Le fichier est illisible. Essaie avec une autre photo.");
    }

    // Envoi au serveur Apps Script
    const rep = await fetch(URL_RELAIS, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ images: imagesNettoyees })
    });

    const resultat = await rep.json();
    if (!resultat.success) {
      throw new Error(resultat.error || "Erreur de connexion avec l'IA.");
    }

    const coursFinal = resultat.donnees;

    // Enregistrement dans la base de données
    const payloadFirestore = {
      titre: coursFinal.titre,
      matiere: coursFinal.matiere,
      message_nox: coursFinal.message_nox,
      notions_cles: coursFinal.notions_cles,
      date_creation: new Date().toISOString(),
      timestamp: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "utilisateurs", eleveId, "fiches_cours"), payloadFirestore);
    console.log("💾 [Orchestrateur] Cours magique généré et sauvegardé ! ID :", docRef.id);

    return { id: docRef.id, ...payloadFirestore };
  }
};
