// --- CHEF D'ORCHESTRE DES 4 AGENTS IA ---

import { db } from "../firebase.js"; // Importe ta connexion Firebase
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export const OrchestrateurAI = {
  
  // AGENT 1 : Analyse de la matière scannée (Vision / Extraction)
  async analyserFiche(eleveId, fichierUrl, nomFichier) {
    console.log("👁️ Agent 1 (Vision) : Analyse de la fiche pour", eleveId);
    
    // Simulation d'une analyse structurée par l'IA (Ici on branchera l'API Gemini Flash)
    const resultatAnalyse = {
      matiere: "Sciences & Nature",
      titre: nomFichier,
      conceptsCles: ["Cellule", "Noyau", "Membrane"],
      resume: "Document analysé avec succès. Prêt pour l'apprentissage !",
      date: new Date().toLocaleDateString()
    };

    // Transmission automatique à l'Agent 2 (Le Tuteur)
    await this.transmettreAuTuteur(eleveId, resultatAnalyse);
    return resultatAnalyse;
  },

  // AGENT 2 : Le Tuteur Pédagogue
  async transmettreAuTuteur(eleveId, donneesFiche) {
    console.log("🧠 Agent 2 (Tuteur) : Structuration des notions pour l'enfant...");
    
    // Enregistrement de la fiche structurée dans le profil Firestore de l'élève
    await addDoc(collection(db, "utilisateurs", eleveId, "fiches_cours"), {
      ...donneesFiche,
      statut: "Validé par le Tuteur"
    });
  },

  // AGENT 3 : Le Maître du Jeu (Générateur de défis pour les 15 modes)
  genererDefiJeu(modeJeu, notionsFiche) {
    console.log(`🎮 Agent 3 (Maître du Jeu) : Création d'une session '${modeJeu}'`);
    // Ici, le maître du jeu adaptera les notions de la fiche au mini-jeu choisi (Donjon, Quiz, etc.)
    return {
      jeu: modeJeu,
      defi: `Affronte le défi basé sur : ${notionsFiche.conceptsCles.join(', ')}`
    };
  },

  // AGENT 4 : Le Ninja (Analyse des erreurs et déclenchement des révisions)
  async surveillerErreurs(eleveId, erreurDetectee) {
    console.log("🥷 Agent 4 (Ninja) : Analyse des erreurs de l'élève...");
    
    await addDoc(collection(db, "utilisateurs", eleveId, "erreurs_ninja"), {
      matiere: erreurDetectee.matiere,
      detail: erreurDetectee.detail,
      timestamp: new Date()
    });
  }
};
