// --- CHEF D'ORCHESTRE DES 4 AGENTS IA (VERSION UNIVERSELLE FIRESTORE) ---

import { db } from "../firebase.js"; 
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Lecture sécurisée de la clé API depuis le navigateur (zéro blocage GitHub)
const GEMINI_API_KEY = localStorage.getItem("GEMINI_API_KEY") || "";

export const OrchestrateurAI = {

  // =========================================================================
  // AGENT 1 : Vision & Analyse du document (Extraction du cours réel par l'IA)
  // =========================================================================
  async analyserFiche(eleveId, fichierUrl, nomFichier, base64Data) {
    console.log("👁️ Agent 1 (Vision) : Analyse approfondie du document...", nomFichier);
    
    // Demande de clé si absente du navigateur
    let cleActive = GEMINI_API_KEY;
    if (!cleActive) {
      const saisie = prompt("Entre ta clé API Gemini pour analyser le cours de Coco :");
      if (saisie) {
        cleActive = saisie.trim();
        localStorage.setItem("GEMINI_API_KEY", cleActive);
      }
    }

    let sujetPropre = nomFichier ? nomFichier.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : "Leçon";
    let donneesExtraites = null;

    // 1. Définition du prompt système structuré
    const promptInstruction = `
Tu es le tuteur pédagogique personnel de l'élève Coco.
Analyse attentivement l'intégralité du document scolaire fourni (texte, leçons, notions).

Retourne STRICTEMENT un objet JSON valide, sans balises markdown, avec cette structure exacte :
{
  "titre": "Titre exact et complet de la leçon",
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
Génère entre 8 et 12 notions détaillées dans le tableau "notions".
    `;

    // 2. Appel direct à l'API Gemini 1.5 Flash
    try {
      if (base64Data && cleActive) {
        const base64Clean = base64Data.split(",")[1] || base64Data;
        const mimeType = base64Data.split(";")[0].split(":")[1] || "image/jpeg";

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleActive}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: promptInstruction },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Clean
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.2,
              response_mime_type: "application/json"
            }
          })
        });

        const resJson = await response.json();
        const texteReponse = resJson.candidates[0].content.parts[0].text;
        donneesExtraites = JSON.parse(texteReponse);
      }
    } catch (err) {
      console.warn("Échec de l'appel Gemini direct ou clé invalide. Utilisation du repli structuré.", err);
    }

    // Structure de repli propre si aucun fichier ou pas de connexion API
    if (!donneesExtraites) {
      donneesExtraites = {
        titre: sujetPropre,
        matiere: "Général",
        resume_complet: `Synthèse de la leçon portant sur ${sujetPropre}. Ce chapitre présente l'ensemble des notions indispensables pour comprendre le sujet et réussir les révisions.`,
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

    // 3. Transmission à l'Agent 2 pour sauvegarde Firestore
    await this.transmettreAuTuteur(eleveId, donneesExtraites, nomFichier);
    return donneesExtraites;
  },

  // =========================================================================
  // AGENT 2 : Le Tuteur Pédagogue (Sauvegarde du résumé et notions dans Firestore)
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
  // AGENT 3 : Le Maître du Jeu (Alimentation dynamique des 15 modes)
  // =========================================================================
  genererDefiJeu(modeJeu, ficheActive) {
    console.log(`🎮 Agent 3 (Maître du Jeu) : Création instantanée du défi '${modeJeu}'`);
    
    let titre = ficheActive && ficheActive.titre ? ficheActive.titre : "Leçon";
    let notions = ficheActive && Array.isArray(ficheActive.notions) ? ficheActive.notions : [];
    let conceptRef = notions.length > 0 ? notions[0].concept : titre;

    let descriptionDefi = `Maîtrise les principes fondamentaux de : ${titre}`;

    if (modeJeu.includes("Chasse aux erreurs")) {
      descriptionDefi = `Aide Nox à identifier les erreurs discrètement glissées dans les explications sur : ${conceptRef}.`;
    } else if (modeJeu.includes("Combat") || modeJeu.includes("monstre")) {
      descriptionDefi = `Déclenche tes attaques élémentaires en répondant juste aux questions sur : ${titre} !`;
    } else if (modeJeu.includes("Construis")) {
      descriptionDefi = `Récolte du bois et de la pierre à chaque bonne réponse sur : ${titre}.`;
    } else if (modeJeu.includes("Détective")) {
      descriptionDefi = `Résous l'enquête en t'appuyant sur les indices du cours sur : ${conceptRef}.`;
    }

    return {
      jeu: modeJeu,
      defi: descriptionDefi
    };
  },

  // =========================================================================
  // AGENT 4 : Le Ninja (Journal d'erreurs)
  // =========================================================================
  async surveillerErreurs(eleveId, erreurDetectee) {
    console.log("🥷 Agent 4 (Ninja) : Enregistrement de l'erreur...");
    try {
      await addDoc(collection(db, "utilisateurs", eleveId, "erreurs_ninja"), {
        matiere: erreurDetectee.matiere || "Général",
        detail: erreurDetectee.detail || "Erreur de révision",
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Erreur Ninja :", e);
    }
  }
};
