"use client";

import { SelectedMedia, ScriptResponse } from "../types";
import { ApiKeys } from "../components/Settings";
import { voiceService } from "./voice";

export const videoExportService = {
  async exportSequence(selection: SelectedMedia[], script: ScriptResponse, apiKeys: ApiKeys, onProgress: (p: number) => void): Promise<Blob> {
    const RecordRTC = (await import('recordrtc')).default;
    
    // 1. Generate Voiceovers if enabled
    const audioBlobs: Record<number, Blob> = {};
    if (apiKeys.useVoiceover && apiKeys.elevenlabs) {
       for (let i = 0; i < script.scenes.length; i++) {
         const scene = script.scenes[i];
         onProgress((i / script.scenes.length) * 10);
         try {
           const blob = await voiceService.generateSpeech(scene.narration, apiKeys.elevenlabs, apiKeys.voiceId);
           audioBlobs[scene.id] = blob;
         } catch (e) {
           console.error(`Voiceover failed for scene ${i}:`, e);
         }
       }
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error("Canvas context not available");

    const canvasStream = (canvas as any).captureStream(30);
    
    // Setup Audio Mixer
    const audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();
    
    // IMPORTANT: Mix Canvas Stream + Audio Stream
    const recorder = new RecordRTC([canvasStream, dest.stream], {
      type: 'video',
      mimeType: 'video/webm;codecs=vp9',
      bitsPerSecond: 12800000,
    });

    recorder.startRecording();

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const sel = selection.find(s => s.sceneId === scene.id);
      if (!sel) continue;

      onProgress(10 + ((i + 1) / script.scenes.length) * 90);

      let media: HTMLImageElement | HTMLVideoElement;
      if (sel.asset.type === 'video') {
        const video = document.createElement('video');
        video.src = sel.asset.url;
        video.muted = true;
        video.crossOrigin = "anonymous";
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');
        media = video;
        await new Promise((resolve) => {
          video.onloadeddata = resolve;
          video.onerror = resolve;
          video.load();
        });
        await video.play().catch(e => console.error("Play failed", e));
      } else {
        const img = new Image();
        img.src = sel.asset.url;
        img.crossOrigin = "anonymous";
        media = img;
        await new Promise(r => {
          img.onload = r;
          img.onerror = r;
        });
      }

      let audioDuration = 5000;
      if (audioBlobs[scene.id]) {
        const audioUrl = URL.createObjectURL(audioBlobs[scene.id]);
        const audio = new Audio(audioUrl);
        const source = audioContext.createMediaElementSource(audio);
        source.connect(dest);
        source.connect(audioContext.destination);
        
        await new Promise(r => {
          audio.onloadedmetadata = r;
          audio.onerror = r;
        });
        audioDuration = (audio.duration * 1000) + 200;
        audio.play();
      }

      const startTime = Date.now();
      while (Date.now() - startTime < audioDuration) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (media.width > 0) {
          const scale = Math.max(canvas.width / media.width, canvas.height / media.height);
          const w = media.width * scale;
          const h = media.height * scale;
          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          ctx.drawImage(media, x, y, w, h);
        }

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
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(ctx, 200, canvas.height - totalHeight - 150, canvas.width - 400, totalHeight + 40, 30);
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
