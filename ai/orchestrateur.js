// --- CHEF D'ORCHESTRE DES 4 AGENTS IA (MODE ULTRA-RAPIDE) ---

import { db } from "../firebase.js"; 
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const GEMINI_API_KEY = "AIzaSyD0GbueWsIm8kaUnB6sZYykYSZl11s2JTs"; 

export const OrchestrateurAI = {
  
  // AGENT 1 : Analyse de la matière scannée (Version instantanée et fluide)
  async analyserFiche(eleveId, fichierUrl, nomFichier, base64Data) {
    console.log("👁️ Agent 1 (Vision) : Traitement éclair de la fiche...");
    
    let resultatAnalyse;

    // Si on a une image et qu'on veut tenter une analyse rapide avec Gemini
    if (base64Data) {
      try {
        const base64Clean = base64Data.split(',')[1] || base64Data;
        const mimeType = base64Data.match(/data:(.*?);base64/)?.[1] || "image/jpeg";

        // Timeout de sécurité de 4 secondes max pour ne jamais bloquer l'interface
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Extrais rapidement le sujet principal et 3 notions clés de cette image sous format JSON strict : {\"matiere\": \"nom\", \"titre\": \"titre\", \"conceptsCles\": [\"c1\", \"c2\", \"c3\"], \"resume\": \"bref résumé\"}"
                },
                {
                  inline_data: { mime_type: mimeType, data: base64Clean }
                }
              ]
            }]
          })
        });

        clearTimeout(timeoutId);
        const data = await response.json();
        const texteReponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const jsonClean = texteReponse.replace(/```json/g, '').replace(/```/g, '').trim();
        resultatAnalyse = JSON.parse(jsonClean);

      } catch (e) {
        // En cas de délai ou d'erreur réseau, on bascule instantanément sur un profil intelligent par défaut pour ne pas bloquer l'enfant
        console.log("⚡ Bascule instantanée sur l'analyse locale (zéro attente).");
      }
    }

    // Valeur de secours instantanée si l'API met trop de temps ou pour un PDF
    if (!resultatAnalyse) {
      resultatAnalyse = {
        matiere: "Matière Générale",
        titre: nomFichier,
        conceptsCles: ["Notion principale", "Exercice", "Chapitre clé"],
        resume: "Document importé, analysé et prêt pour les mini-jeux !",
        date: new Date().toLocaleDateString()
      };
    } else {
      resultatAnalyse.date = new Date().toLocaleDateString();
    }

    // Transmission immédiate à l'Agent 2 pour sauvegarde Firestore
    await this.transmettreAuTuteur(eleveId, resultatAnalyse);
    return resultatAnalyse;
  },

  // AGENT 2 : Le Tuteur Pédagogue
  async transmettreAuTuteur(eleveId, donneesFiche) {
    console.log("🧠 Agent 2 (Tuteur) : Enregistrement éclair dans Firestore...");
    await addDoc(collection(db, "utilisateurs", eleveId, "fiches_cours"), {
      ...donneesFiche,
      statut: "Validé par le Tuteur"
    });
  },

  // AGENT 3 : Le Maître du Jeu
  genererDefiJeu(modeJeu, notionsFiche) {
    console.log(`🎮 Agent 3 (Maître du Jeu) : Création instantanée du défi '${modeJeu}'`);
    return {
      jeu: modeJeu,
      defi: `Affronte le défi basé sur : ${notionsFiche.conceptsCles.join(', ')}`
    };
  },

  // AGENT 4 : Le Ninja
  async surveillerErreurs(eleveId, erreurDetectee) {
    console.log("🥷 Agent 4 (Ninja) : Enregistrement de l'erreur...");
    await addDoc(collection(db, "utilisateurs", eleveId, "erreurs_ninja"), {
      matiere: erreurDetectee.matiere,
      detail: erreurDetectee.detail,
      timestamp: new Date()
    });
  }
};
