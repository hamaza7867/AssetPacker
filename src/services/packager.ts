import JSZip from "jszip";
import { saveAs } from "file-saver";
import { SelectedMedia } from "../types";

export const packagerService = {
  async downloadAndZip(selection: SelectedMedia[], zipName: string): Promise<void> {
    const zip = new JSZip();
    const folder = zip.folder("assets");

    const downloadPromises = selection.map(async (item, index) => {
      const response = await fetch(item.asset.url);
      const blob = await response.blob();
      const extension = item.asset.type === 'video' ? 'mp4' : 'jpg';
      const fileName = `scene_${item.sceneId}_${item.asset.provider}_${index}.${extension}`;
      folder?.file(fileName, blob);
    });

    await Promise.all(downloadPromises);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${zipName.replace(/\s+/g, '_')}_assets.zip`);
  }
};
