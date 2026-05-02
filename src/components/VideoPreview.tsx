"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Type, Loader2, Maximize } from 'lucide-react';
import { SelectedMedia, ScriptResponse } from '../types';

interface VideoPreviewProps {
  selection: SelectedMedia[];
  script: ScriptResponse;
}

export default function VideoPreview({ selection, script }: VideoPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Defensive checks for current scene
  const currentScene = script.scenes[currentIndex] || script.scenes[0];
  const currentSelection = selection.find(s => s.sceneId === currentScene?.id);

  // Safety check: Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= script.scenes.length) {
      setCurrentIndex(0);
    }
  }, [script.scenes.length, currentIndex]);

  // Force buffer state on scene change
  useEffect(() => {
    setIsBuffering(true);
    setProgress(0);
    
    if (currentSelection?.asset.type === 'image') {
      const img = new Image();
      img.src = currentSelection.asset.url;
      img.onload = () => setIsBuffering(false);
    }
  }, [currentIndex, currentSelection]);

  // Pre-fetch future assets
  useEffect(() => {
    const nextIndices = [currentIndex + 1, currentIndex + 2];
    nextIndices.forEach(idx => {
      if (idx < script.scenes.length) {
        const nextScene = script.scenes[idx];
        const sel = selection.find(s => s.sceneId === nextScene?.id);
        if (sel) {
          const img = new Image();
          img.src = sel.asset.url;
        }
      }
    });
  }, [currentIndex, selection, script.scenes]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && !isBuffering) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            if (currentIndex < script.scenes.length - 1) {
              setCurrentIndex(prevIndex => prevIndex + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return prev + 0.6;
        });
      }, 40);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isBuffering, currentIndex, script.scenes.length]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const totalScenes = script.scenes.length;
    if (totalScenes === 0) return;
    
    const globalSceneValue = (percentage / 100) * totalScenes;
    const newIndex = Math.min(totalScenes - 1, Math.floor(globalSceneValue));
    const newInternalProgress = (globalSceneValue - newIndex) * 100;
    setCurrentIndex(newIndex);
    setProgress(newInternalProgress);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  if (!currentScene) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-center gap-4">
        <button onClick={() => setCurrentIndex(0)} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Start</button>
        <button onClick={() => setCurrentIndex(Math.floor(script.scenes.length/2))} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Center</button>
        <button onClick={() => setCurrentIndex(script.scenes.length-1)} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-widest">End</button>
      </div>

      <div className="relative aspect-video bg-zinc-950 rounded-[3rem] overflow-hidden shadow-2xl group ring-1 ring-white/5">
        
        {isBuffering && isPlaying && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black text-white uppercase tracking-widest mt-4">Stabilizing Production...</p>
          </div>
        )}

        <div className={`w-full h-full relative transition-opacity duration-500 ${isBuffering ? 'opacity-40' : 'opacity-100'}`}>
          {currentSelection?.asset.type === 'video' ? (
            <video
              key={currentSelection.asset.url}
              ref={videoRef}
              src={currentSelection.asset.url}
              autoPlay={isPlaying}
              muted
              playsInline
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onCanPlayThrough={() => setIsBuffering(false)}
              onLoadedData={() => setIsBuffering(false)}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={currentSelection?.asset.url}
              src={currentSelection?.asset.url}
              onLoad={() => setIsBuffering(false)}
              className="w-full h-full object-cover animate-ken-burns"
            />
          )}
        </div>

        <div className="absolute bottom-16 inset-x-0 px-16 text-center pointer-events-none z-20">
          <p className="inline-block bg-black/60 backdrop-blur-3xl px-10 py-5 rounded-2xl text-white font-medium text-xl leading-tight shadow-2xl border border-white/10">
            {currentScene.narration}
          </p>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-12 z-40">
           <div className="space-y-6">
              <div 
                ref={progressBarRef}
                onClick={handleSeek}
                className="h-2.5 bg-white/10 rounded-full relative cursor-pointer overflow-hidden group/bar"
              >
                <div 
                  className="h-full bg-blue-600 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(37,99,235,0.6)]" 
                  style={{ width: `${((currentIndex + progress / 100) / script.scenes.length) * 100}%` }} 
                />
              </div>

              <div className="flex justify-between items-center text-white">
                <div className="flex items-center gap-10">
                  <div className="flex gap-4 items-center">
                    <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="hover:text-blue-400 transition-transform active:scale-90"><SkipBack className="w-7 h-7" /></button>
                    <button 
                      onClick={togglePlay} 
                      className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-3xl active:scale-95"
                    >
                      {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-0.5" />}
                    </button>
                    <button onClick={() => setCurrentIndex(Math.min(script.scenes.length - 1, currentIndex + 1))} className="hover:text-blue-400 transition-transform active:scale-90"><SkipForward className="w-7 h-7" /></button>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black uppercase tracking-[0.2em]">Scene {currentIndex + 1}</span>
                    <span className="text-[8px] font-bold uppercase text-white/40 tracking-widest">{currentSelection?.asset.provider || 'AI Search'}</span>
                  </div>
                </div>
                <div className="flex gap-6 items-center">
                  <Volume2 className="w-6 h-6 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
                  <Maximize className="w-6 h-6 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-6 px-8 bg-zinc-50 border border-zinc-200 rounded-[3rem]">
         {script.scenes.map((s, i) => {
           const isSel = selection.find(sel => sel.sceneId === s.id);
           return (
             <button
               key={i}
               onClick={() => setCurrentIndex(i)}
               className={`shrink-0 w-24 aspect-video rounded-2xl overflow-hidden border-4 transition-all ${currentIndex === i ? 'border-blue-600 scale-105 shadow-xl' : 'border-transparent opacity-50 hover:opacity-100'}`}
             >
               <img src={isSel?.asset.thumbnail} className="w-full h-full object-cover" />
             </button>
           );
         })}
      </div>
    </div>
  );
}
