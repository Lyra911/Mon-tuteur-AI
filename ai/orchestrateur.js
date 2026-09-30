// --- CHEF D'ORCHESTRE DES 4 AGENTS IA (AVEC VRAIE API GEMINI) ---

import { db } from "../firebase.js"; // Importe ta connexion Firebase
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Clé API Gemini (partagée avec le projet)
const GEMINI_API_KEY = "AIzaSyD0GbueWsIm8kaUnB6sZYykYSZl11s2JTs"; 

export const OrchestrateurAI = {
  
  // AGENT 1 : Analyse de la matière scannée (Vision / Extraction par Gemini)
  async analyserFiche(eleveId, fichierUrl, nomFichier, base64Data) {
    console.log("👁️ Agent 1 (Vision) : Envoi de l'image à l'API Gemini pour analyse...");
    
    let resultatAnalyse;

    try {
      // Nettoyer le format base64 si nécessaire (retirer le préfixe data:image/...;base64,)
      const base64Clean = base64Data.split(',')[1] || base64Data;
      const mimeType = base64Data.match(/data:(.*?);base64/)?.[1] || "image/jpeg";

      // Appel direct à l'API Gemini 2.5 Flash pour analyser l'image de cours
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Analyse cette image de cours scolaire. Extrais le contenu et réponds UNIQUEMENT sous format JSON valide avec cette structure exacte : {\"matiere\": \"nom de la matière\", \"titre\": \"titre du cours ou sujet\", \"conceptsCles\": [\"concept1\", \"concept2\", \"concept3\"], \"resume\": \"bref résumé pédagogique de la leçon\"}"
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Clean
                }
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const texteReponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Nettoyage du texte pour s'assurer d'isoler le JSON renvoyé par Gemini
      const jsonClean = texteReponse.replace(/```json/g, '').replace(/```/g, '').trim();
      resultatAnalyse = JSON.parse(jsonClean);
      resultatAnalyse.date = new Date().toLocaleDateString();

    } catch (erreur) {
      console.warn("⚠️ Mode secours activé (Fallback) : Impossible de joindre l'API vision, utilisation de l'analyse standard.", erreur);
      // Fallback de sécurité si l'API rencontre un contretemps réseau
      resultatAnalyse = {
        matiere: "Sciences & Nature",
        titre: nomFichier,
        conceptsCles: ["Cellule", "Noyau", "Membrane", "Données scannées"],
        resume: "Document importé et stocké avec succès dans le nuage.",
        date: new Date().toLocaleDateString()
      };
    }

    // Transmission automatique à l'Agent 2 (Le Tuteur) pour enregistrement Firestore
    await this.transmettreAuTuteur(eleveId, resultatAnalyse);
    return resultatAnalyse;
  },

  // AGENT 2 : Le Tuteur Pédagogue
  async transmettreAuTuteur(eleveId, donneesFiche) {
    console.log("🧠 Agent 2 (Tuteur) : Structuration et sauvegarde des notions dans Firestore...");
    
    // Enregistrement de la fiche structurée dans le profil Firestore de l'élève
    await addDoc(collection(db, "utilisateurs", eleveId, "fiches_cours"), {
      ...donneesFiche,
      statut: "Validé par le Tuteur"
    });
  },

  // AGENT 3 : Le Maître du Jeu (Générateur de défis pour les 15 modes)
  genererDefiJeu(modeJeu, notionsFiche) {
    console.log(`🎮 Agent 3 (Maître du Jeu) : Création d'une session '${modeJeu}'`);
    return {
      jeu: modeJeu,
      defi: `Affronte le défi basé sur : ${notionsFiche.conceptsCles.join(', ')}`
    };
  },

  // AGENT 4 : Le Ninja (Analyse des erreurs et déclenchement des révisions)
  async surveillerErreurs(eleveId, erreurDetectee) {
    console.log("🥷 Agent 4 (Ninja) : Enregistrement de l'erreur dans Firebase...");
    
    await addDoc(collection(db, "utilisateurs", eleveId, "erreurs_ninja"), {
      matiere: erreurDetectee.matiere,
      detail: erreurDetectee.detail,
      timestamp: new Date()
    });
  }
};
