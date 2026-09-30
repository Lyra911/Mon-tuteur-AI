import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0GbueWsIm8kaUnB6sZYykYSZl11s2JTs",
  authDomain: "tuteur-ai.firebaseapp.com",
  projectId: "tuteur-ai",
  storageBucket: "tuteur-ai.firebasestorage.app",
  messagingSenderId: "1025983965857",
  appId: "1:1025983965857:web:121d32b494c8433f9f1ee0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
console.log("🔥 Architecture Pro Firebase initialisée !");

const ELEVE_ID = "coco";

// Système Ninja structuré
async function verifierMemoireNinjaPro() {
  let zoneAlerte = document.getElementById('ninja-alert');
  let listeErreurs = document.getElementById('erreurs-list');
  
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
}

window.lancerJeu = function(nomMode) {
  let messageTuteur = document.getElementById('tutor-message');
  document.getElementById('tutor-title').textContent = "Mode " + nomMode;
  messageTuteur.innerHTML = "Chargement de la session pour <b>" + ELEVE_ID.toUpperCase() + "</b> en mode <b>" + nomMode + "</b>...";
};

// Sauvegarde des fiches par profil
document.getElementById('camera-input').addEventListener('change', async function(event) {
  const fichier = event.target.files[0];
  
  if (fichier) {
    const typeFichier = fichier.type;
    const nomFichier = fichier.name;
    
    document.getElementById('preview-zone').style.display = 'block';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('doc-preview').style.display = 'none';
    
    let texteAnalyse = document.getElementById('analysis-text');
    texteAnalyse.style.color = "#00f2fe";
    texteAnalyse.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Stockage dans le profil...';

    if (typeFichier.startsWith('image/')) {
      const lecteur = new FileReader();
      lecteur.onload = async function(e) {
        let base64Image = e.target.result;
        document.getElementById('image-preview').src = base64Image;
        document.getElementById('image-preview').style.display = 'block';

        try {
          const storageRef = ref(storage, 'utilisateurs/' + ELEVE_ID + '/fiches/' + Date.now() + '_' + nomFichier);
          await uploadString(storageRef, base64Image, 'data_url');
          let lienImage = await getDownloadURL(storageRef);

          await addDoc(collection(db, "utilisateurs", ELEVE_ID, "fiches_cours"), {
            nomFiche: nomFichier,
            urlFiche: lienImage,
            type: "Image",
            date: new Date().toLocaleDateString()
          });

          texteAnalyse.style.color = "#4facfe";
          texteAnalyse.innerHTML = '<i class="fa-solid fa-check-circle"></i> Fiche enregistrée avec succès !';
        } catch (erreur) {
          console.error("Erreur de sauvegarde : ", erreur);
          texteAnalyse.style.color = "#ff5858";
          texteAnalyse.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Erreur d\'enregistrement.';
        }
      };
      lecteur.readAsDataURL(fichier);
    } else {
      document.getElementById('doc-name').textContent = nomFichier;
      document.getElementById('doc-preview').style.display = 'block';
      
      try {
        await addDoc(collection(db, "utilisateurs", ELEVE_ID, "fiches_cours"), {
          nomFiche: nomFichier,
          type: "Document",
          date: new Date().toLocaleDateString()
        });

          texteAnalyse.style.color = "#4facfe";
          texteAnalyse.innerHTML = '<i class="fa-solid fa-check-circle"></i> Document ajouté !';
      } catch (erreur) {
        console.error("Erreur : ", erreur);
      }
    }
  }
});

verifierMemoireNinjaPro();
