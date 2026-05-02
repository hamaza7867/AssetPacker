import { StockAsset } from "../types";

export const stockService = {
  async search(query: string, pexelsKey: string, pixabayKey: string): Promise<StockAsset[]> {
    const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`;
    const pexelsVideoUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15`;
    const pixabayUrl = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=all&per_page=15`;

    try {
      const promises: Promise<any>[] = [];
      
      if (pexelsKey) {
        promises.push(fetch(pexelsUrl, { headers: { Authorization: pexelsKey } }).then(r => r.json()));
        promises.push(fetch(pexelsVideoUrl, { headers: { Authorization: pexelsKey } }).then(r => r.json()));
      } else {
        promises.push(Promise.resolve({ photos: [] }));
        promises.push(Promise.resolve({ videos: [] }));
      }

      if (pixabayKey) {
        promises.push(fetch(pixabayUrl).then(r => r.json()));
      } else {
        promises.push(Promise.resolve({ hits: [] }));
      }

      const [pexRes, pexVidRes, pixRes] = await Promise.all(promises);

      const pexAssets: StockAsset[] = (pexRes.photos || []).map((p: any) => ({
        id: `pex-${p.id}`,
        url: p.src.large2x,
        thumbnail: p.src.medium,
        type: 'image',
        provider: 'pexels',
        description: p.alt || query,
        tags: []
      }));

      const pexVidAssets: StockAsset[] = (pexVidRes.videos || []).map((v: any) => ({
        id: `vid-${v.id}`,
        url: v.video_files[0]?.link,
        thumbnail: v.image,
        type: 'video',
        provider: 'pexels',
        description: `Video: ${query}`,
        tags: v.tags?.map((t: any) => t.name) || []
      }));

      const pixAssets: StockAsset[] = (pixRes.hits || []).map((h: any) => ({
        id: `pix-${h.id}`,
        url: h.largeImageURL,
        thumbnail: h.webformatURL,
        type: 'image',
        provider: 'pixabay',
        description: h.tags || query,
        tags: h.tags?.split(',').map((t: string) => t.trim()) || []
      }));

      const results: StockAsset[] = [];
      const maxLength = Math.max(pexAssets.length, pexVidAssets.length, pixAssets.length);
      
      for (let i = 0; i < maxLength; i++) {
        if (pexVidAssets[i]) results.push(pexVidAssets[i]);
        if (pexAssets[i]) results.push(pexAssets[i]);
        if (pixAssets[i]) results.push(pixAssets[i]);
      }

      return results;
    } catch (e) {
      console.error("Stock search failed", e);
      return [];
    }
  }
};
