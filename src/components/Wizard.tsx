"use client";

import React, { useState, useRef } from 'react';
import { 
  Wand2, 
  Loader2, 
  ChevronRight, 
  Check, 
  Search, 
  Zap, 
  Info, 
  LayoutPanelLeft, 
  Download
} from 'lucide-react';
import { Scene, ScriptResponse, StockAsset, SelectedMedia } from '../types';
import { aiService } from '../services/ai';
import { stockService } from '../services/stock';
import { packagerService } from '../services/packager';
import { videoExportService } from '../services/videoExport';
import { ApiKeys } from './Settings';
import VideoPreview from './VideoPreview';

interface WizardProps {
  apiKeys: ApiKeys;
}

export default function Wizard({ apiKeys }: WizardProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState<ScriptResponse | null>(null);
  const [searchResults, setSearchResults] = useState<Record<number, StockAsset[]>>({});
  const [selection, setSelection] = useState<SelectedMedia[]>([]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  
  const sceneNavRef = useRef<HTMLDivElement>(null);

  // Step 1 -> 2: Generate Script
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
    setActiveSceneIndex(0);
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

  const loadSearchForScene = async (index: number, customQuery?: string) => {
    const scene = script?.scenes[index];
    if (!scene) return;
    
    const query = customQuery || scene.visualQuery;
    if (!customQuery) setManualQuery(scene.visualQuery);

    if (!customQuery && searchResults[scene.id]) {
       autoSelectIfEmpty(scene.id, searchResults[scene.id]);
       return;
    }

    setIsLoading(true);
    try {
      const results = await stockService.search(query, apiKeys.pexels, apiKeys.pixabay);
      setSearchResults(prev => ({ ...prev, [scene.id]: results }));
      
      // NEW: Intelligent AI Selection
      let selectedIndex = 0;
      if (results.length > 1 && !customQuery) {
         selectedIndex = await aiService.rankMedia({ narration: scene.narration, query: scene.visualQuery }, results, apiKeys);
      }
      
      setSelection(prev => {
        const filtered = prev.filter(s => s.sceneId !== scene.id);
        return [...filtered, { sceneId: scene.id, asset: results[selectedIndex] || results[0] }];
      });
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

  const handleDeleteScene = (id: number) => {
    if (!script) return;
    setScript({
      ...script,
      scenes: script.scenes.filter(s => s.id !== id)
    });
    setSelection(prev => prev.filter(s => s.sceneId !== id));
  };

  const handleAddScene = () => {
    if (!script) return;
    const newId = Math.max(0, ...script.scenes.map(s => s.id)) + 1;
    const newScene: Scene = {
      id: newId,
      narration: "New narration beat...",
      visualQuery: "cinematic concept"
    };
    setScript({
      ...script,
      scenes: [...script.scenes, newScene]
    });
  };

  const handleUpdateScene = (id: number, updates: Partial<Scene>) => {
    if (!script) return;
    setScript({
      ...script,
      scenes: script.scenes.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down' | 'left' | 'right') => {
    if (!script) return;
    const newScenes = [...script.scenes];
    const targetIndex = (direction === 'up' || direction === 'left') ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newScenes.length) return;
    
    [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
    setScript({ ...script, scenes: newScenes });
    setActiveSceneIndex(targetIndex);
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
      const blob = await videoExportService.exportSequence(selection, script, apiKeys, setExportProgress);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `production_${Date.now()}.webm`;
      a.click();
    } catch (e: any) {
      alert(e.message || "Export failed");
    } finally {
      setIsLoading(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8">
      {/* Progress Tracker */}
      <div className="flex justify-center mb-12 md:mb-16">
        <div className="flex items-center gap-2 md:gap-4 bg-zinc-50 p-2 md:p-3 rounded-full border border-zinc-200">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => {
                  if (s < step) setStep(s);
                  if (s === 2 && script) setStep(2);
                  if (s === 3 && script) setStep(3);
                }}
                disabled={s > step && !script}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-zinc-200 text-zinc-400'} ${s <= step || script ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}`}
              >
                {s}
              </button>
              {s < 4 && <div className={`w-6 md:w-12 h-1 rounded-full transition-all duration-700 ${step > s ? 'bg-blue-600' : 'bg-zinc-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Input */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2 text-center max-w-2xl mx-auto">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 mb-4">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">Enterprise Video Engine</span>
             </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9]">Infinite Asset<br/><span className="text-blue-600 italic">Packer</span></h1>
            <p className="text-zinc-500 font-medium mt-4 md:mt-6 text-base md:text-lg">Input a script of any length. We'll handle the curation.</p>
          </div>

          <div className="space-y-6 bg-zinc-50 border border-zinc-200 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] max-w-4xl mx-auto shadow-2xl shadow-zinc-200/50">
            <div className="space-y-2">
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Production Script</label>
                {!apiKeys[apiKeys.provider] && (
                   <span className="text-[8px] font-bold text-orange-500 uppercase flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                     <Info className="w-2.5 h-2.5" /> Mock Mode
                   </span>
                )}
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Paste your 200+ scene script here... The AI will automatically slice it into beats."
                className="w-full h-48 md:h-64 bg-white border border-zinc-200 rounded-2xl md:rounded-3xl px-6 md:px-8 py-4 md:py-6 text-sm focus:border-blue-500 outline-none transition-all resize-none shadow-inner"
              />
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={isLoading || !prompt}
              className="w-full py-5 md:py-6 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 text-xs md:text-sm"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
              Initialize Extraction
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Curation */}
      {step === 2 && script && (
        <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
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

          <div className="grid gap-6 max-h-[60vh] overflow-y-auto pr-4 no-scrollbar pb-10">
            {script.scenes.map((scene, i) => (
              <div key={scene.id} className="bg-zinc-50 border border-zinc-200 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-start gap-6 md:gap-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-zinc-200/50 group relative">
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="w-12 h-12 bg-white border border-zinc-200 rounded-2xl flex items-center justify-center text-zinc-900 font-black shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
                    {i + 1}
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                      disabled={i === 0}
                      onClick={() => handleMoveScene(i, 'up')}
                      className="p-1 hover:bg-blue-50 text-zinc-400 hover:text-blue-600 disabled:opacity-0 transition-all rounded-md"
                     >
                       <ChevronRight className="w-4 h-4 -rotate-90" />
                     </button>
                     <button 
                      disabled={i === script.scenes.length - 1}
                      onClick={() => handleMoveScene(i, 'down')}
                      className="p-1 hover:bg-blue-50 text-zinc-400 hover:text-blue-600 disabled:opacity-0 transition-all rounded-md"
                     >
                       <ChevronRight className="w-4 h-4 rotate-90" />
                     </button>
                  </div>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <textarea 
                    value={scene.narration}
                    onChange={e => handleUpdateScene(scene.id, { narration: e.target.value })}
                    className="w-full bg-transparent border-none p-0 text-sm leading-relaxed text-zinc-600 font-medium italic focus:ring-0 resize-none min-h-[60px]"
                    placeholder="Describe the narration..."
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Visual DNA:</span>
                    <input 
                      value={scene.visualQuery}
                      onChange={e => handleUpdateScene(scene.id, { visualQuery: e.target.value })}
                      className="text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl text-blue-600 border border-blue-100 outline-none focus:border-blue-500 min-w-[200px]"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteScene(scene.id)}
                  className="absolute top-6 right-6 p-2 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Search className="w-4 h-4 rotate-45" /> {/* Close/Delete icon approximation */}
                </button>
              </div>
            ))}
            
            <button 
              onClick={handleAddScene}
              className="w-full py-6 border-4 border-dashed border-zinc-100 rounded-[2.5rem] text-zinc-300 font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:border-blue-200 hover:text-blue-400 transition-all group"
            >
              <Zap className="w-5 h-5 text-zinc-200 group-hover:text-blue-300" />
              Inject New Beat
            </button>
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
              className="flex gap-4 overflow-x-auto no-scrollbar py-4 px-2 items-start"
            >
              {script.scenes.map((s, i) => {
                const isSelected = selection.find(sel => sel.sceneId === s.id);
                return (
                  <div key={s.id} className="relative flex flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setActiveSceneIndex(i); loadSearchForScene(i); }}
                      className={`w-16 h-16 rounded-2xl font-black transition-all flex items-center justify-center relative border-2 ${activeSceneIndex === i ? 'bg-blue-600 border-blue-600 text-white scale-105 shadow-2xl shadow-blue-500/40 z-10' : 'bg-white border-zinc-200 text-zinc-400 hover:border-blue-500/50 hover:text-blue-500'}`}
                    >
                      {i + 1}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                          <Check className="w-3.5 h-3.5 text-white stroke-[4]" />
                        </div>
                      )}
                    </button>
                    
                    {/* Action Controls - Permanently Visible */}
                    <div className="flex gap-1.5 mt-1">
                       <button 
                        disabled={i === 0}
                        onClick={(e) => { e.stopPropagation(); handleMoveScene(i, 'left'); }}
                        className="w-7 h-7 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:border-blue-200 shadow-sm disabled:opacity-30 transition-all active:scale-75"
                       >
                         <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteScene(s.id); if (activeSceneIndex >= i) setActiveSceneIndex(Math.max(0, activeSceneIndex - 1)); }}
                        className="w-7 h-7 bg-red-50 border border-red-100 text-red-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-red-500 hover:text-white transition-all active:scale-75"
                       >
                         <span className="text-sm font-black leading-none">×</span>
                       </button>
                       <button 
                        disabled={i === script.scenes.length - 1}
                        onClick={(e) => { e.stopPropagation(); handleMoveScene(i, 'right'); }}
                        className="w-7 h-7 bg-white border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:border-blue-200 shadow-sm disabled:opacity-30 transition-all active:scale-75"
                       >
                         <ChevronRight className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                );
              })}
              
              {/* Add Scene Button - Aligned with the others */}
              <button
                onClick={() => { handleAddScene(); setActiveSceneIndex(script.scenes.length); }}
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-300 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center shrink-0 hover:bg-blue-50 group mt-0"
              >
                <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          <div className="space-y-8 pb-20">
            <div className="bg-zinc-50 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-dashed border-zinc-300 relative overflow-hidden space-y-6">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-200">
                 <div className="h-full bg-blue-600 transition-all duration-700 ease-out" style={{ width: `${((activeSceneIndex + 1) / script.scenes.length) * 100}%` }} />
               </div>
              <div className="text-center space-y-2">
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">Processing Beat {activeSceneIndex + 1}</p>
                <h3 className="text-2xl md:text-4xl font-black uppercase italic text-zinc-900 tracking-tighter leading-none line-clamp-1">"{script.scenes[activeSceneIndex].visualQuery}"</h3>
              </div>

              <div className="flex gap-2 max-w-2xl mx-auto">
                 <div className="relative flex-1">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                   <input 
                    type="text"
                    value={manualQuery}
                    onChange={e => setManualQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadSearchForScene(activeSceneIndex, manualQuery)}
                    placeholder="Search new media for this scene..."
                    className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                   />
                 </div>
                 <button 
                  onClick={() => loadSearchForScene(activeSceneIndex, manualQuery)}
                  className="px-8 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all active:scale-95 shadow-lg"
                 >
                   Explore
                 </button>
              </div>
            </div>

            {isLoading && !isBulkLoading ? (
              <div className="h-96 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600 fill-current" />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-sm font-black uppercase tracking-widest text-zinc-900">AI Verification Active</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Scanning metadata for the perfect match...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
                {searchResults[script.scenes[activeSceneIndex].id]?.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleSelectAsset(script.scenes[activeSceneIndex].id, asset)}
                    className={`group relative aspect-video rounded-[2rem] overflow-hidden border-4 transition-all hover:scale-[1.02] active:scale-95 ${
                      selection.find(s => s.sceneId === script.scenes[activeSceneIndex].id && s.asset.id === asset.id)
                        ? 'border-blue-600 shadow-2xl shadow-blue-500/20'
                        : 'border-white hover:border-blue-500/30'
                    }`}
                  >
                    <img src={asset.thumbnail} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                       <div className="flex justify-between items-center text-white">
                         <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-white/20 backdrop-blur-md rounded-md">{asset.type}</span>
                         <span className="text-[8px] font-bold uppercase opacity-60">{asset.provider}</span>
                       </div>
                    </div>
                    {selection.find(s => s.sceneId === script.scenes[activeSceneIndex].id && s.asset.id === asset.id) && (
                      <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                           <Check className="w-6 h-6 text-white stroke-[4]" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Finalize */}
      {step === 4 && script && (
        <div className="space-y-8 md:space-y-12 animate-in fade-in zoom-in duration-700 py-6 md:py-12">
          <div className="text-center space-y-4 md:space-y-6">
             <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">Production <span className="text-blue-600">Review</span></h2>
             <p className="text-zinc-500 font-medium text-sm md:text-lg max-w-xl mx-auto px-4">Preview your sequence and export the final masterpiece.</p>
          </div>

          <div className="max-w-4xl mx-auto px-2 md:px-0">
            <VideoPreview selection={selection} script={script} />
          </div>

          <div className="flex flex-col items-center gap-6 md:gap-8 bg-zinc-50 p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] border border-zinc-200">
            {exportProgress !== null ? (
               <div className="w-full max-w-md space-y-4 text-center">
                  <div className="flex justify-between items-end px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Rendering...</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{Math.round(exportProgress)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-200 rounded-full overflow-hidden mx-2">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                  </div>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Keep tab active</p>
               </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full justify-center">
                 <button
                  onClick={() => setStep(3)}
                  className="w-full md:w-auto px-8 py-4 md:py-6 bg-white border border-zinc-200 text-zinc-900 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest transition-all hover:bg-zinc-50 text-xs md:text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isLoading}
                  className="w-full md:w-auto px-8 py-4 md:py-6 bg-zinc-900 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 md:gap-4 transition-all hover:bg-zinc-800 shadow-xl text-xs md:text-sm"
                >
                  <LayoutPanelLeft className="w-4 h-4 md:w-5 md:h-5" />
                  Assets (ZIP)
                </button>
                <button
                  onClick={handleExportVideo}
                  disabled={isLoading}
                  className="w-full md:w-auto px-10 py-5 md:py-6 bg-blue-600 text-white rounded-[2rem] md:rounded-[2.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 md:gap-6 transition-all hover:bg-blue-500 shadow-xl hover:scale-105 text-xs md:text-sm"
                >
                  <Download className="w-5 h-5 md:w-6 md:h-6" />
                  Export Video
                </button>
              </div>
            )}
            <p className="hidden md:block text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-4 text-center">Organized for Premiere, DaVinci, and Browser Preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
