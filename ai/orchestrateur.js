// ============================================================================
// ORCHESTRATEUR CLIENT (ai/orchestrateur.js) - 100% SÉCURISÉ SANS CLÉS
// ============================================================================

import { db } from "../firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// L'URL de ton Web App Apps Script
const URL_RELAIS = "https://script.google.com/macros/s/AKfycbzR7fX4F_p5Vv7G-F_Zf_y6c_w0vH8bE/exec"; // Mets ton URL /exec ici

export const Orchestrateur = {
  async traiterDocumentComplet(imagesBase64, eleveId = "coco") {
    console.log(`🚀 [Orchestrateur] Envoi de ${imagesBase64.length} page(s) aux 4 agents...`);

    const rep = await fetch(URL_RELAIS, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ images: imagesBase64 })
    });

    const resultat = await rep.json();
    if (!resultat.success) {
      throw new Error(resultat.error || "Erreur de traitement des agents");
    }

    const coursFinal = resultat.donnees;

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
