// ============================================================================
// SERVICE D'IMAGES UNIVERSEL (Wikipédia API - Toutes matières)
// Histoire, Géographie, Sciences, Éducation citoyenne, etc.
// ============================================================================

export const ImageService = {
  cacheImages: {},

  /**
   * Trouve l'illustration encyclopédique officielle pour n'importe quelle notion
   * @param {string} notion - Ex: "Parc national de la Mauricie", "Plaines d'Abraham", "Mitochondrie"
   * @returns {Promise<string>} URL de l'image officielle de la page
   */
  async trouverImage(notion) {
    if (!notion) return "";

    const cle = notion.trim();
    if (this.cacheImages[cle.toLowerCase()]) {
      return this.cacheImages[cle.toLowerCase()];
    }

    try {
      // 1. Appel direct à l'API Wikipédia REST (renvoie l'image d'en-tête officielle de l'article)
      // Exemple : https://fr.wikipedia.org/api/rest_v1/page/summary/Parc_national_de_la_Mauricie
      const urlDirecte = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cle.replace(/ /g, "_"))}`;
      const rep = await fetch(urlDirecte);

      if (rep.ok) {
        const data = await rep.json();
        if (data.thumbnail && data.thumbnail.source) {
          const imgUrl = data.thumbnail.source;
          this.cacheImages[cle.toLowerCase()] = imgUrl;
          return imgUrl;
        }
        if (data.originalimage && data.originalimage.source) {
          const imgUrl = data.originalimage.source;
          this.cacheImages[cle.toLowerCase()] = imgUrl;
          return imgUrl;
        }
      }

      // 2. Si le titre n'est pas le titre exact de la page, recherche via l'API Query Wikipédia
      const urlRecherche = `https://fr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cle
      )}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*`;

      const repRecherche = await fetch(urlRecherche);
      const dataRecherche = await repRecherche.json();

      if (dataRecherche.query && dataRecherche.query.pages) {
        const premierResultat = Object.values(dataRecherche.query.pages)[0];
        if (premierResultat.thumbnail && premierResultat.thumbnail.source) {
          const imgTrouvee = premierResultat.thumbnail.source;
          this.cacheImages[cle.toLowerCase()] = imgTrouvee;
          return imgTrouvee;
        }
      }

      // 3. Dernier repli : Image Wikimedia Commons filtrée (cartes, plans, vues réelles)
      const urlCommons = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cle
      )}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*`;

      const repCommons = await fetch(urlCommons);
      const dataCommons = await repCommons.json();

      if (dataCommons.query && dataCommons.query.pages) {
        const p = Object.values(dataCommons.query.pages)[0];
        if (p.thumbnail && p.thumbnail.source) {
          return p.thumbnail.source;
        }
      }

      return ""; // Laisse vide si rien de pertinent n'existe plutôt que de mettre une fausse image

    } catch (err) {
      console.warn("Recherche d'image impossible pour :", cle, err);
      return "";
    }
  }
};
