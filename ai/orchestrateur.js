// --- CHEF D'ORCHESTRE DES AGENTS IA (AVEC RELAIS SECURISE SCRIPT GOOGLE) ---

import { db } from "../firebase.js"; 
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// L'URL de ton relais privé Apps Script (qui protège ta clé Gemini)
const RELAIS_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw-t_UCrnLyFo-TOoRqqLuq0GbhfA0cyhFe35qWkIgs_0xunmCIj6ZpcosMC5FlT0_KgA/exec";

export const OrchestrateurAI = {

  // =========================================================================
  // AGENT 1 : Vision & Analyse du document (Extraction du cours réel par l'IA)
  // =========================================================================
  async analyserFiche(eleveId, fichierUrl, nomFichier, base64Data) {
    console.log("👁️ Agent 1 (Vision) : Analyse approfondie du document...", nomFichier);

    let sujetPropre = nomFichier ? nomFichier.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : "Leçon";
    let donneesExtraites = null;

    // Définition de la consigne et de la structure du JSON Pivot
    const promptInstruction = `
Tu es le tuteur pédagogique de l'élève.
Analyse attentivement l'intégralité du document scolaire fourni (texte, leçons, notions).

Retourne STRICTEMENT un objet JSON valide, sans balises markdown, avec cette structure exacte :
{
  "titre": "Titre exact de la leçon",
  "matiere": "Matière scolaire (ex: Univers social, Sciences, Français, Mathématiques)",
  "resume_complet": "Une synthèse rédigée exhaustive, fluide et complète du cours. Développe chaque notion clé pour que l'élève puisse tout réviser sans le document d'origine.",
  "sections_fiche": [
    {
      "titre": "Titre du bloc de révision",
      "icone": "fa-book-open",
      "points": ["Point clé 1", "Point clé 2", "Point clé 3"]
    }
  ],
  "notions": [
    {
      "concept": "Nom du concept clé",
      "definition": "Explication claire et vraie du concept selon le cours.",
      "faux1": "Une affirmation fausse mais plausible sur ce concept",
      "faux2": "Une deuxième affirmation erronée sur ce concept"
    }
  ]
}
Génère l'ensemble des notions clés nécessaires à la compréhension globale du document.
`;

    try {
      if (base64Data) {
        const cleanBase64 = base64Data.split(",")[1] || base64Data;
        const mimeType = base64Data.split(";")[0].split(":")[1] || "image/jpeg";

        // Préparation du payload Gemini standard
        const payloadGemini = {
          contents: [{
            parts: [
              { text: promptInstruction },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            response_mime_type: "application/json"
          }
        };

        // Envoi au relais Apps Script
        const response = await fetch(RELAIS_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ payload: payloadGemini })
        });

        const resJson = await response.json();

        if (resJson.candidates && resJson.candidates[0].content.parts[0].text) {
          const texteReponse = resJson.candidates[0].content.parts[0].text;
          donneesExtraites = JSON.parse(texteReponse);
        } else if (resJson.error) {
          console.error("Erreur renvoyée par l'API :", resJson.error);
        }
      }
    } catch (err) {
      console.warn("Échec de la communication avec le relais. Utilisation du repli local.", err);
    }

    // Structure de secours si hors-ligne ou erreur réseau
    if (!donneesExtraites) {
      donneesExtraites = {
        titre: sujetPropre,
        matiere: "Général",
        resume_complet: `Synthèse de la leçon portant sur ${sujetPropre}. Ce chapitre présente l'ensemble des notions indispensables pour comprendre le cours.`,
        sections_fiche: [
          {
            titre: "Points essentiels",
            icone: "fa-lightbulb",
            points: ["Compréhension des définitions", "Observation des règles", "Mémorisation active"]
          }
        ],
        notions: [
          {
            concept: sujetPropre,
            definition: "Notion centrale étudiée au cours de ce chapitre.",
            faux1: "est totalement inutile dans la matière",
            faux2: "fonctionne à l'inverse des règles établies"
          }
        ]
      };
    }

    // Sauvegarde automatique dans Firestore pour l'élève actif
    await this.transmettreAuTuteur(eleveId, donneesExtraites, nomFichier);
    return donneesExtraites;
  },

  // =========================================================================
  // AGENT 2 : Enregistrement de la fiche dans Firestore
  // =========================================================================
  async transmettreAuTuteur(eleveId, donneesFiche, nomFichier) {
    console.log("🧠 Agent 2 (Tuteur) : Écriture dans Firestore pour", eleveId);
    try {
      const docRef = await addDoc(collection(db, "utilisateurs", eleveId, "fiches_cours"), {
        titre: donneesFiche.titre,
        matiere: donneesFiche.matiere,
        resume_complet: donneesFiche.resume_complet,
        sections_fiche: donneesFiche.sections_fiche,
        notions: donneesFiche.notions,
        nom_fichier_source: nomFichier || "",
        timestamp: serverTimestamp()
      });
      console.log("✅ Fiche de cours enregistrée avec succès dans Firestore ! ID:", docRef.id);
    } catch (e) {
      console.error("❌ Erreur lors de l'écriture Firestore :", e);
    }
  },

  // =========================================================================
  // AGENT 3 : Préparation des données pour les modes de jeu
  // =========================================================================
  genererDefiJeu(modeJeu, ficheActive) {
    let titre = ficheActive && ficheActive.titre ? ficheActive.titre : "Leçon";
    let notions = ficheActive && Array.isArray(ficheActive.notions) ? ficheActive.notions : [];
    let conceptRef = notions.length > 0 ? notions[0].concept : titre;

    let descriptionDefi = `Maîtrise les principes fondamentaux de : ${titre}`;

    if (modeJeu.includes("Chasse aux erreurs")) {
      descriptionDefi = `Identifie les erreurs discrètement glissées dans les explications sur : ${conceptRef}.`;
    } else if (modeJeu.includes("Combat") || modeJeu.includes("monstre")) {
      descriptionDefi = `Déclenche tes attaques élémentaires en répondant juste aux questions sur : ${titre} !`;
    } else if (modeJeu.includes("Construis")) {
      descriptionDefi = `Récolte des ressources à chaque bonne réponse sur : ${titre}.`;
    } else if (modeJeu.includes("Détective")) {
      descriptionDefi = `Résous l'enquête en t'appuyant sur les indices du cours sur : ${conceptRef}.`;
    }

    return {
      jeu: modeJeu,
      defi: descriptionDefi
    };
  },

  // =========================================================================
  // AGENT 4 : Journal d'erreurs (Suivi pédagogique)
  // =========================================================================
  async surveillerErreurs(eleveId, erreurDetectee) {
    console.log("🥷 Agent 4 : Enregistrement de l'erreur...");
    try {
      await addDoc(collection(db, "utilisateurs", eleveId, "erreurs_ninja"), {
        matiere: erreurDetectee.matiere || "Général",
        detail: erreurDetectee.detail || "Erreur de révision",
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Erreur de suivi :", e);
    }
  }
};
