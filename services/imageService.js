// ============================================================================
// SERVICE DE RECHERCHE D'IMAGES ÉDUCATIVES (Wikimedia Commons & Unsplash)
// ============================================================================

export const ImageService = {
  // Cache local pour éviter de répéter les requêtes réseau
  cacheImages: {},

  /**
   * Trouve une image pertinente à partir d'un mot-clé en anglais ou français.
   * @param {string} requete - Ex: "plant cell diagram", "microscope", "mitochondria"
   * @returns {Promise<string>} URL de l'image prête à afficher
   */
  async trouverImage(requete) {
    if (!requete) return "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80"; // Image par défaut

    const cleNettoyee = requete.trim().toLowerCase();
    if (this.cacheImages[cleNettoyee]) {
      return this.cacheImages[cleNettoyee];
    }

    try {
      // 1. Recherche prioritaire sur Wikimedia Commons (idéal schémas & sciences)
      const urlWiki = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        requete
      )}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`;

      const repWiki = await fetch(urlWiki);
      const dataWiki = await repWiki.json();

      if (dataWiki.query && dataWiki.query.pages) {
        const premierResultat = Object.values(dataWiki.query.pages)[0];
        if (premierResultat.thumbnail && premierResultat.thumbnail.source) {
          const urlTrouvee = premierResultat.thumbnail.source;
          this.cacheImages[cleNettoyee] = urlTrouvee;
          return urlTrouvee;
        }
      }

      // 2. Repli automatique sur Unsplash si Wikimedia n'a rien trouvé
      const urlRepli = `https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80`;
      this.cacheImages[cleNettoyee] = urlRepli;
      return urlRepli;

    } catch (err) {
      console.warn("Échec de récupération d'image pour :", requete, err);
      return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80";
    }
  }
};
