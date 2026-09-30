// --- CHEF D'ORCHESTRE DES AGENTS IA (AVEC SUPPORT MULTIPAGE & RELAIS SECURISE) ---

import { db } from "../firebase.js"; 
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// L'URL de ton relais Apps Script
const RELAIS_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzbvHkVRVNowyy_98Dpv44WinuqK0FmQ88HO4Q-DvcWg45P4UhH9vzzw10jmraVEDzx/exec";

export const OrchestrateurAI = {

  // =========================================================================
  // AGENT 1 : Vision & Analyse du document (Support 1 photo OU plusieurs pages PDF)
  // =========================================================================
  async analyserFiche(eleveId, fichierUrl, nomFichier, imagesData) {
    console.log("👁️ Agent 1 (Vision) : Analyse approfondie du document...", nomFichier);

    let sujetPropre = nomFichier ? nomFichier.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : "Leçon";
    let donneesExtraites = null;

    // Harmonise sous forme de tableau (qu'on reçoive 1 image Base64 ou une liste de pages)
    const listePages = Array.isArray(imagesData) ? imagesData : [imagesData];

    const promptInstruction = `
Tu es le tuteur pédagogique personnel de l'élève.
Analyse attentivement l'intégralité du document scolaire fourni (texte, leçons, schémas, tableaux) sur l'ensemble des pages transmises.

Retourne STRICTEMENT un objet JSON valide, sans balises markdown, avec cette structure exacte :
{
  "titre": "Titre exact de la leçon",
  "matiere": "Matière scolaire (ex: Univers social, Sciences, Français, Mathématiques)",
  "resume_complet": "Une synthèse rédigée exhaustive, fluide et complète du cours. Développe chaque notion clé de manière à ce que l'élève puisse tout réviser et comprendre sans avoir besoin du document d'origine.",
  "sections_fiche": [
    {
      "titre": "Titre du bloc de révision",
      "icone": "fa-book-open",
      "points": ["Point clé 1", "Point clé 2", "Point clé 3"]
    }
  ],
  "notions": [
    {
      "concept": "Nom du concept ou terme clé",
      "definition": "Explication claire et vraie du concept selon le cours.",
      "faux1": "Une affirmation fausse mais plausible sur ce concept",
      "faux2": "Une deuxième affirmation erronée sur ce concept"
    }
  ]
}
Génère l'ensemble des notions clés nécessaires pour maîtriser le chapitre complet.
`;

    try {
      if (listePages.length > 0 && listePages[0]) {
        // Préparation des "parts" : le prompt texte suivi de chaque page en inline_data
        const parts = [{ text: promptInstruction }];

        listePages.forEach((pageBase64) => {
          const cleanBase64 = pageBase64.split(",")[1] || pageBase64;
          const mimeType = pageBase64.split(";")[0].split(":")[1] || "image/jpeg";
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: cleanBase64
            }
          });
        });

        const payloadGemini = {
          contents: [{ parts: parts }],
          generationConfig: {
            temperature: 0.2,
            response_mime_type: "application/json"
          }
        };

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

    // Structure de secours si hors-ligne ou erreur
    if (!donneesExtraites) {
      donneesExtraites = {
        titre: sujetPropre,
        matiere: "Général",
        resume_complet: `Synthèse de la leçon portant sur ${sujetPropre}. Ce chapitre présente l'ensemble des notions indispensables.`,
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

    // Sauvegarde dans Firestore pour l'élève actif
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
      console.log("✅ Fiche enregistrée avec succès dans Firestore ! ID:", docRef.id);
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
