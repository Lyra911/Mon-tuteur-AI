// ============================================================================
// SERVICE D'IMAGES ÉDUCATIVES RAPIDE (Wikimedia Commons avec chrono coupe-circuit)
// ============================================================================

export const ImageService = {
  cacheImages: {},
  imageSecours: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80",

  async trouverImage(requete) {
    if (!requete) return this.imageSecours;

    const cle = requete.trim().toLowerCase();
    if (this.cacheImages[cle]) {
      return this.cacheImages[cle];
    }

    try {
      const urlWiki = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        requete
      )}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`;

      // Coupe après 2 secondes max pour ne jamais faire attendre Coco
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const rep = await fetch(urlWiki, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await rep.json();

      if (data.query && data.query.pages) {
        const premier = Object.values(data.query.pages)[0];
        if (premier.thumbnail && premier.thumbnail.source) {
          const urlTrouvee = premier.thumbnail.source;
          this.cacheImages[cle] = urlTrouvee;
          return urlTrouvee;
        }
      }

      this.cacheImages[cle] = this.imageSecours;
      return this.imageSecours;
    } catch (e) {
      return this.imageSecours;
    }
  }
};
