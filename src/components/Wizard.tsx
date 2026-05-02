"use client";

import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/ai';
import { stockService } from '../services/stock';
import { packagerService } from '../services/packager';
import { videoExportService } from '../services/videoExport';
import VideoPreview from './VideoPreview';
import { ScriptResponse, StockAsset, SelectedMedia, Scene } from '../types';
import { ApiKeys } from './Settings';
import { Loader2, Download, Search, Check, ChevronRight, Wand2, Info, Zap, LayoutPanelLeft } from 'lucide-react';

interface WizardProps {
  apiKeys: ApiKeys;
}

export default function Wizard({ apiKeys }: WizardProps) {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState<ScriptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Record<number, StockAsset[]>>({});
  const [selection, setSelection] = useState<SelectedMedia[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const sceneNavRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active scene in nav
  useEffect(() => {
    if (sceneNavRef.current && activeSceneIndex >= 0) {
      const activeBtn = sceneNavRef.current.children[activeSceneIndex] as HTMLElement;
      if (activeBtn) {
        sceneNavRef.current.scrollTo({
          left: activeBtn.offsetLeft - sceneNavRef.current.offsetWidth / 2 + activeBtn.offsetWidth / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [activeSceneIndex]);

  // Step 1: Generate Script
  const handleGenerateScript = async () => {
    setIsLoading(true);
    try {
      const res = await aiService.generateScript(prompt, apiKeys);
      setScript(res);
      setStep(2);
    } catch (e: any) {
      alert(`Failed to generate script: ${e.message}. Check your ${apiKeys.provider.toUpperCase()} settings.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> 3: Load Search Results
  const handleProceedToSearch = async () => {
    if (!script) return;
    setStep(3);
    loadSearchForScene(0);
  };

  const handleBulkDiscovery = async () => {
    if (!script) return;
    setStep(3);
    setIsBulkLoading(true);
    for (let i = 0; i < script.scenes.length; i++) {
      setActiveSceneIndex(i);
      await loadSearchForScene(i);
    }
    setIsBulkLoading(false);
  };

  const loadSearchForScene = async (index: number) => {
    const scene = script?.scenes[index];
    if (!scene) return;
    
    if (searchResults[scene.id]) {
       autoSelectIfEmpty(scene.id, searchResults[scene.id]);
       return;
    }

    setIsLoading(true);
    try {
      const results = await stockService.search(scene.visualQuery, apiKeys.pexels, apiKeys.pixabay);
      setSearchResults(prev => ({ ...prev, [scene.id]: results }));
      autoSelectIfEmpty(scene.id, results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const autoSelectIfEmpty = (sceneId: number, assets: StockAsset[]) => {
    setSelection(prev => {
      const alreadySelected = prev.find(s => s.sceneId === sceneId);
      if (alreadySelected || assets.length === 0) return prev;
      return [...prev, { sceneId, asset: assets[0] }];
    });
  };

  const handleSelectAsset = (sceneId: number, asset: StockAsset) => {
    setSelection(prev => {
      const filtered = prev.filter(s => s.sceneId !== sceneId);
      return [...filtered, { sceneId, asset }];
    });
  };

  const handleDownload = async () => {
    if (!script) return;
    setIsLoading(true);
    try {
      await packagerService.downloadAndZip(selection, script.title);
    } catch (e) {
      alert("Download failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportVideo = async () => {
    if (!script) return;
    setIsLoading(true);
    setExportProgress(0);
    try {
      const blob = await videoExportService.exportSequence(selection, script, setExportProgress);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.title.replace(/\s+/g, '_')}_preview.webm`;
      a.click();
    } catch (e: any) {
      alert("Video export failed: " + e.message);
    } finally {
      setIsLoading(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Progress Bar */}
      <div className="flex items-center gap-4 mb-12 overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex-1 min-w-[100px] flex flex-col gap-2">
            <div className={`h-1.5 rounded-full transition-colors ${step >= s ? 'bg-blue-600' : 'bg-zinc-200'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s ? 'text-blue-500' : 'text-zinc-400'}`}>
              Phase 0{s}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2 text-center max-w-2xl mx-auto">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 mb-4">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Video Engine</span>
             </div>
            <h1 className="text-6xl font-black uppercase tracking-tighter leading-[0.9]">Infinite Asset<br/><span className="text-blue-600 italic">Packer</span></h1>
            <p className="text-zinc-500 font-medium mt-6 text-lg">Input a script of any length. We'll handle the curation.</p>
          </div>

          <div className="space-y-6 bg-zinc-50 border border-zinc-200 p-10 rounded-[3rem] max-w-4xl mx-auto shadow-2xl shadow-zinc-200/50">
            <div className="space-y-2">
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Production Script</label>
                {!apiKeys[apiKeys.provider] && (
                   <span className="text-[8px] font-bold text-orange-500 uppercase flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                     <Info className="w-2.5 h-2.5" /> Mock Mode Active
                   </span>
                )}
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Paste your 200+ scene script here... The AI will automatically slice it into beats."
                className="w-full h-64 bg-white border border-zinc-200 rounded-3xl px-8 py-6 text-sm focus:border-blue-500 outline-none transition-all resize-none shadow-inner"
              />
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={isLoading || !prompt}
              className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Wand2 className="w-6 h-6" />}
              Initialize Scene Extraction
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Script Review */}
      {step === 2 && script && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-black uppercase tracking-tighter">{script.title}</h2>
                <span className="bg-zinc-100 px-3 py-1 rounded-full text-[10px] font-black uppercase text-zinc-500 border border-zinc-200">
                  {script.scenes.length} Scenes Detected
                </span>
              </div>
              <p className="text-zinc-500 text-sm max-w-2xl">{script.description}</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button
                onClick={handleBulkDiscovery}
                className="flex-1 md:flex-none px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
              >
                <Zap className="w-4 h-4 fill-blue-500 text-blue-500" /> Auto-Select All
              </button>
              <button
                onClick={handleProceedToSearch}
                className="flex-1 md:flex-none px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20"
              >
                Manual Review <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-4 no-scrollbar">
            {script.scenes.map((scene, i) => (
              <div key={scene.id} className="bg-zinc-50 border border-zinc-200 p-8 rounded-[2rem] flex items-start gap-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-zinc-200/50 group">
                <div className="w-12 h-12 shrink-0 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-900 font-black shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-4">
                  <p className="text-sm leading-relaxed text-zinc-600 font-medium italic">"{scene.narration}"</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Visual DNA:</span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl text-blue-600 border border-blue-100">
                      {scene.visualQuery}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Media Finder */}
      {step === 3 && script && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex flex-col bg-white/90 backdrop-blur-xl p-8 border border-zinc-200 rounded-[3rem] sticky top-4 z-50 shadow-2xl shadow-zinc-200/60 gap-8">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <LayoutPanelLeft className="w-5 h-5 text-blue-600" />
                  <h3 className="font-black uppercase tracking-widest text-xs">Timeline Orchestrator</h3>
               </div>
               <button
                  onClick={() => setStep(4)}
                  disabled={selection.length === 0}
                  className="px-10 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
                >
                  Finalize Package ({selection.length}/{script.scenes.length})
                </button>
            </div>

            <div 
              ref={sceneNavRef}
              className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mask-fade-edges"
            >
              {script.scenes.map((s, i) => {
                const isSelected = selection.find(sel => sel.sceneId === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSceneIndex(i); loadSearchForScene(i); }}
                    className={`w-14 h-14 rounded-2xl font-black transition-all flex items-center justify-center shrink-0 relative border-2 ${activeSceneIndex === i ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-2xl shadow-blue-500/40 z-10' : 'bg-white border-zinc-200 text-zinc-400 hover:border-blue-500/50 hover:text-blue-500'}`}
                  >
                    {i + 1}
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-white stroke-[4]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-8 pb-20">
            <div className="bg-zinc-50 p-10 rounded-[3rem] border border-dashed border-zinc-300 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-200">
                 <div className="h-full bg-blue-600 transition-all duration-700 ease-out" style={{ width: `${((activeSceneIndex + 1) / script.scenes.length) * 100}%` }} />
               </div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Processing Beat {activeSceneIndex + 1}</p>
              <h3 className="text-4xl font-black uppercase italic text-zinc-900 tracking-tighter leading-none">"{script.scenes[activeSceneIndex].visualQuery}"</h3>
            </div>

            {isLoading && !isBulkLoading ? (
              <div className="h-96 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                  <Search className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] animate-pulse">Deep Scanning Libraries...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {searchResults[script.scenes[activeSceneIndex].id]?.map(asset => {
                  const isChosen = selection.find(s => s.asset.id === asset.id);
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectAsset(script.scenes[activeSceneIndex].id, asset)}
                      className={`group relative aspect-[4/5] bg-zinc-100 rounded-[2.5rem] overflow-hidden border-4 transition-all duration-500 cursor-pointer ${isChosen ? 'border-blue-600 shadow-3xl shadow-blue-500/40 -translate-y-2' : 'border-transparent hover:border-blue-500/20'}`}
                    >
                      <img src={asset.thumbnail} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                      
                      {asset.type === 'video' && (
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                           <span className="text-[8px] font-black text-white uppercase tracking-widest">Video</span>
                        </div>
                      )}

                      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${isChosen ? 'bg-blue-600/20 backdrop-blur-[2px] opacity-100' : 'bg-white/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]'}`}>
                        <div className={`bg-blue-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl transform transition-transform duration-500 ${isChosen ? 'scale-110' : 'translate-y-8 group-hover:translate-y-0'}`}>
                          {isChosen ? 'Selected' : 'Capture Asset'}
                        </div>
                      </div>

                      <div className="absolute bottom-6 left-6 right-6">
                         <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-zinc-200 shadow-sm flex justify-between items-center transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                            <span className="text-[9px] font-black uppercase text-zinc-900">{asset.provider}</span>
                            {isChosen && <Check className="w-4 h-4 text-blue-600 stroke-[4]" />}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Finalize */}
      {step === 4 && script && (
        <div className="space-y-12 animate-in fade-in zoom-in duration-700 py-12">
          <div className="text-center space-y-6">
             <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">Production <span className="text-blue-600">Review</span></h2>
             <p className="text-zinc-500 font-medium text-lg max-w-xl mx-auto">Preview your sequence and export the final masterpiece.</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <VideoPreview selection={selection} script={script} />
          </div>

          <div className="flex flex-col items-center gap-8 bg-zinc-50 p-12 rounded-[4rem] border border-zinc-200">
            {exportProgress !== null ? (
               <div className="w-full max-w-md space-y-4 text-center">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Rendering Production...</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{Math.round(exportProgress)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                  </div>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Please keep this tab active during render</p>
               </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
                 <button
                  onClick={() => setStep(3)}
                  className="px-10 py-6 bg-white border border-zinc-200 text-zinc-900 rounded-[2rem] font-black uppercase tracking-widest transition-all hover:bg-zinc-50"
                >
                  Edit Scenes
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isLoading}
                  className="px-10 py-6 bg-zinc-900 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all hover:bg-zinc-800 shadow-xl"
                >
                  <LayoutPanelLeft className="w-5 h-5" />
                  Media Bundle (ZIP)
                </button>
                <button
                  onClick={handleExportVideo}
                  disabled={isLoading}
                  className="px-12 py-6 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-6 transition-all hover:bg-blue-500 shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95"
                >
                  <Download className="w-6 h-6" />
                  Export Full Video
                </button>
              </div>
            )}
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-4">Organized Assets for Premiere, DaVinci, and Browser Preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
