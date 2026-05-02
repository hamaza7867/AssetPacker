"use client";

import { SelectedMedia, ScriptResponse } from "../types";

export const videoExportService = {
  async exportSequence(selection: SelectedMedia[], script: ScriptResponse, onProgress: (p: number) => void): Promise<Blob> {
    const RecordRTC = (await import('recordrtc')).default;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // Capture stream from canvas at 30 FPS
    const stream = (canvas as any).captureStream(30);

    const recorder = new RecordRTC(stream, {
      type: 'video',
      mimeType: 'video/webm;codecs=vp9',
      bitsPerSecond: 12800000, 
    });

    recorder.startRecording();

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const sel = selection.find(s => s.sceneId === scene.id);
      if (!sel) continue;

      onProgress(((i + 1) / script.scenes.length) * 100);

      let media: HTMLImageElement | HTMLVideoElement;
      if (sel.asset.type === 'video') {
        media = document.createElement('video');
        media.src = sel.asset.url;
        media.muted = true;
        media.crossOrigin = "anonymous";
        media.setAttribute('webkit-playsinline', 'true');
        media.setAttribute('playsinline', 'true');
        await new Promise((resolve) => {
          media.onloadeddata = resolve;
          media.load();
        });
        await (media as HTMLVideoElement).play();
      } else {
        media = new Image();
        media.src = sel.asset.url;
        media.crossOrigin = "anonymous";
        await new Promise(r => media.onload = r);
      }

      const startTime = Date.now();
      const sceneDuration = 5000;

      while (Date.now() - startTime < sceneDuration) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const scale = Math.max(canvas.width / media.width, canvas.height / media.height);
        const w = media.width * scale;
        const h = media.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(media, x, y, w, h);

        const text = scene.narration;
        ctx.font = 'bold 50px Inter, sans-serif';
        const words = text.split(' ');
        let line = '';
        const lines = [];
        const maxWidth = canvas.width - 400;

        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const testMetrics = ctx.measureText(testLine);
          if (testMetrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        const lineHeight = 70;
        const totalHeight = lines.length * lineHeight;
        const bgPadding = 40;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(ctx, 200, canvas.height - totalHeight - 150, canvas.width - 400, totalHeight + bgPadding, 30);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        lines.forEach((l, index) => {
          ctx.fillText(l.trim(), canvas.width / 2, canvas.height - totalHeight - 150 + (index + 1) * lineHeight - 10);
        });

        await new Promise(r => requestAnimationFrame(r));
      }

      if (sel.asset.type === 'video') (media as HTMLVideoElement).pause();
    }

    return new Promise((resolve) => {
      recorder.stopRecording(() => {
        const blob = recorder.getBlob();
        resolve(blob);
      });
    });
  },

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
};
