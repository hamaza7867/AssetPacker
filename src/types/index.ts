
export interface Scene {
  id: number;
  narration: string;
  visualQuery: string;
}

export interface ScriptResponse {
  title: string;
  description: string;
  scenes: Scene[];
}

export interface StockAsset {
  id: string;
  url: string;
  thumbnail: string;
  type: 'image' | 'video';
  provider: 'pexels' | 'pixabay';
}

export interface SelectedMedia {
  sceneId: number;
  asset: StockAsset;
}
