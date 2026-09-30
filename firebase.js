import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { OrchestrateurAI } from "./ai/orchestrateur.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0GbueWsIm8kaUnB6sZYykYSZl11s2JTs",
  authDomain: "tuteur-ai.firebaseapp.com",
  projectId: "tuteur-ai",
  storageBucket: "tuteur-ai.firebasestorage.app",
  messagingSenderId: "1025983965857",
  appId: "1:1025983965857:web:121d32b494c8433f9f1ee0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
console.log("🔥 Architecture Pro Firestore & IA initialisée !");

const ELEVE_ID = "coco";

// Système Ninja structuré avec sécurité anti-null
async function verifierMemoireNinjaPro() {
  let zoneAlerte = document.getElementById('ninja-alert');
  let listeErreurs = document.getElementById('erreurs-list');
  
  if (!zoneAlerte || !listeErreurs) return;
  
  try {
    const querySnapshot = await getDocs(collection(db, "utilisateurs", ELEVE_ID, "erreurs_ninja"));
    
    if (!querySnapshot.empty) {
      listeErreurs.innerHTML = ''; 
      querySnapshot.forEach((docInfos) => {
        let erreur = docInfos.data();
        let li = document.createElement('li');
        li.textContent = erreur.matiere + " : " + erreur.detail;
        listeErreurs.appendChild(li);
      });
      zoneAlerte.style.display = 'block';
    } else {
      zoneAlerte.style.display = 'none';
    }
  } catch (e) {
    console.log("Chargement Ninja en attente de connexion Firestore...");
  }
}

// L'Agent 3 (Maître du Jeu) connecté à Firestore en temps réel lorsqu'on clique sur un jeu
window.lancerJeu = async function(nomMode) {
  let messageTuteur = document.getElementById('tutor-message');
  let titreTuteur = document.getElementById('tutor-title');
  let zoneAlerte = document.getElementById('ninja-alert');
  
  if (titreTuteur) titreTuteur.textContent = "Mode " + nomMode;
  if (messageTuteur) messageTuteur.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Le Maître du Jeu prépare ton défi...';
  if (zoneAlerte) zoneAlerte.style.display = 'block';
  
  try {
    // 1. Récupérer la dernière fiche de cours enregistrée dans Firestore
    const q = query(collection(db, "utilisateurs", ELEVE_ID, "fiches_cours"), orderBy("timestamp", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    
    let notionsFic = { conceptsCles: ["Notions générales", "Exercices de révision"] };
    let titreCours = "Cours général";

    if (!querySnapshot.empty) {
      querySnapshot.forEach((document) => {
        let data = document.data();
        if (data.conceptsCles) notionsFic.conceptsCles = data.conceptsCles;
        if (data.titre) titreCours = data.titre;
      });
    }

    // 2. Appel de l'Agent 3 pour générer le défi sur mesure
    let defiGenere = OrchestrateurAI.genererDefiJeu(nomMode, notionsFic);

    // 3. Affichage du défi personnalisé dans l'interface
    if (messageTuteur) {
      messageTuteur.innerHTML = `
        <b>Sujet :</b> ${titreCours}<br>
        <b>Défi :</b> ${defiGenere.defi}
      `;
    }

  } catch (err) {
    console.log("Erreur lors de la génération du jeu :", err);
    if (messageTuteur) {
      messageTuteur.innerHTML = "Session initialisée en mode " + nomMode + " ! Prépare-toi à jouer.";
    }
  }
};

// Gestion de l'import et enregistrement Firestore
document.addEventListener("DOMContentLoaded", () => {
  verifierMemoireNinjaPro();

  const cameraInput = document.getElementById('camera-input');
  if (cameraInput) {
    cameraInput.addEventListener('change', async function(event) {
      const fichier = event.target.files[0];
      
      if (fichier) {
        const nomFichier = fichier.name;
        const previewZone = document.getElementById('preview-zone');
        const imagePreview = document.getElementById('image-preview');
        const texteAnalyse = document.getElementById('analysis-text');

        if (previewZone) previewZone.style.display = 'block';
        if (imagePreview) imagePreview.style.display = 'none';
        
        if (texteAnalyse) {
          texteAnalyse.style.color = "#00f2fe";
          texteAnalyse.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyse et enregistrement par les IA...';
        }

        try {
          let base64Image = null;

          if (fichier.type.startsWith('image/')) {
            const lecteur = new FileReader();
            lecteur.onload = async function(e) {
              base64Image = e.target.result;
              if (imagePreview) {
                imagePreview.src = base64Image;
                imagePreview.style.display = 'block';
              }
            };
            lecteur.readAsDataURL(fichier);
          }

          // Appel direct à l'orchestrateur pour stocker dans Firestore
          await OrchestrateurAI.analyserFiche(ELEVE_ID, "local_file", nomFichier, base64Image);

          if (texteAnalyse) {
            texteAnalyse.style.color = "#4facfe";
            texteAnalyse.innerHTML = '<i class="fa-solid fa-check-circle"></i> Fiche analysée et enregistrée dans Firestore !';
          }

        } catch (erreur) {
          console.error("Erreur pipeline : ", erreur);
          if (texteAnalyse) {
            texteAnalyse.style.color = "#ff5858";
            texteAnalyse.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Erreur lors du traitement.';
          }
        }
      }
    });
  }
});
