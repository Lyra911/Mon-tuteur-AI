// ============================================================================
// ORCHESTRATEUR CLIENT (ai/orchestrateur.js) - 100% SÉCURISÉ SANS CLÉS
// ============================================================================

import { db } from "../firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Ton URL Web App Apps Script
const URL_RELAIS = "https://script.google.com/macros/s/AKfycbzbvHkVRVNowyy_98Dpv44WinuqK0FmQ88HO4Q-DvcWg45P4UhH9vzzw10jmraVEDzx/exec";

export const OrchestrateurAI = {
  async analyserFiche(donneesImages, eleveId = "coco") {
    return await this.traiterDocumentComplet(donneesImages, eleveId);
  },

  async traiterDocumentComplet(donneesImages, eleveId = "coco") {
    // 1. Extraction universelle de la chaîne Base64
    let listeBrute = Array.isArray(donneesImages) ? donneesImages : [donneesImages];

    const imagesNettoyees = listeBrute.map(item => {
      if (!item) return "";
      if (typeof item === "string") return item;
      // Si firebase.js envoie un objet du style { base64: "...", data: "...", image: "..." }
      return item.base64 || item.data || item.image || item.src || "";
    }).filter(str => str.length > 50);

    console.log(`🚀 [Orchestrateur] Envoi de ${imagesNettoyees.length} image(s) valide(s) aux agents...`);

    if (imagesNettoyees.length === 0) {
      throw new Error("Impossible d'extraire les données Base64 des images fournies.");
    }

    // 2. Envoi au relais Apps Script
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

    // 3. Sauvegarde dans Firestore
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
