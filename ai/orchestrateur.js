// ============================================================================
// ORCHESTRATEUR CLIENT (ai/orchestrateur.js) - AVEC CONVERSION AUTOMATIQUE FILE -> BASE64
// ============================================================================

import { db } from "../firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const URL_RELAIS = "https://script.google.com/macros/s/AKfycbzbvHkVRVNowyy_98Dpv44WinuqK0FmQ88HO4Q-DvcWg45P4UhH9vzzw10jmraVEDzx/exec";

// Fonction utilitaire pour convertir un File ou Blob en chaîne Base64
function fileVersBase64(fichier) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result);
    lecteur.onerror = (err) => reject(err);
    lecteur.readAsDataURL(fichier);
  });
}

export const OrchestrateurAI = {
  async analyserFiche(donneesImages, eleveId = "coco") {
    return await this.traiterDocumentComplet(donneesImages, eleveId);
  },

  async traiterDocumentComplet(donneesImages, eleveId = "coco") {
    let listeBrute = Array.isArray(donneesImages) ? donneesImages : [donneesImages];

    // Si donneesImages est une FileList de l'élément <input type="file">
    if (donneesImages instanceof FileList) {
      listeBrute = Array.from(donneesImages);
    }

    // Conversion de chaque élément reçu (qu'il s'agisse d'un File, Blob, texte Base64 ou objet)
    const promessesBase64 = listeBrute.map(async (item) => {
      if (!item) return "";

      // Cas 1 : C'est déjà un File ou un Blob brut
      if (item instanceof File || item instanceof Blob) {
        return await fileVersBase64(item);
      }

      // Cas 2 : C'est un objet qui contient un File
      if (typeof item === "object" && (item.file instanceof File || item.file instanceof Blob)) {
        return await fileVersBase64(item.file);
      }

      // Cas 3 : C'est déjà une chaîne Base64
      if (typeof item === "string") {
        return item;
      }

      // Cas 4 : Objet avec une propriété contenant le Base64
      return item.base64 || item.data || item.image || item.src || "";
    });

    const resultats = await Promise.all(promessesBase64);
    const imagesNettoyees = resultats.filter(str => typeof str === "string" && str.length > 50);

    console.log(`🚀 [Orchestrateur] Envoi de ${imagesNettoyees.length} image(s) valide(s) aux agents...`);

    if (imagesNettoyees.length === 0) {
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
