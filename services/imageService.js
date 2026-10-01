// ============================================================================
// SERVICE D'IMAGES UNIVERSEL (Wikipédia FR / EN + Wikimedia)
// ============================================================================

export const ImageService = {
  cacheImages: {},

  async trouverImage(terme) {
    if (!terme) return "";
    const cle = terme.trim().toLowerCase();
    if (this.cacheImages[cle]) return this.cacheImages[cle];

    try {
      // 1. Recherche par mot-clé sur Wikipédia (FR puis EN)
      const urlRecherche = `https://fr.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cle
      )}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*`;

      const rep = await fetch(urlRecherche);
      if (rep.ok) {
        const data = await rep.json();
        if (data.query && data.query.pages) {
          const page = Object.values(data.query.pages)[0];
          if (page.thumbnail && page.thumbnail.source) {
            this.cacheImages[cle] = page.thumbnail.source;
            return page.thumbnail.source;
          }
        }
      }

      // 2. Repli direct sur Wikimedia Commons
      const urlCommons = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cle
      )}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json&origin=*`;

      const repCommons = await fetch(urlCommons);
      if (repCommons.ok) {
        const dataCommons = await repCommons.json();
        if (dataCommons.query && dataCommons.query.pages) {
          const page = Object.values(dataCommons.query.pages)[0];
          if (page.thumbnail && page.thumbnail.source) {
            this.cacheImages[cle] = page.thumbnail.source;
            return page.thumbnail.source;
          }
        }
      }

      return "";
    } catch (e) {
      console.warn("Image non trouvée pour :", terme);
      return "";
    }
  }
};
