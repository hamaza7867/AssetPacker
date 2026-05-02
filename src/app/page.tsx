"use client";

import React, { useState, useEffect } from 'react';
import Wizard from "@/components/Wizard";
import Settings, { ApiKeys } from "@/components/Settings";
import { LayoutGrid, Settings as SettingsIcon } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'packer' | 'settings'>('packer');
  const [mounted, setMounted] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => {
    const defaultKeys: ApiKeys = { 
      provider: 'gemini',
      gemini: '', 
      openai: '',
      groq: '',
      custom: '',
      model: '',
      baseUrl: '',
      pexels: 'B3HNHOqA8U3QU0JTFasjSVlssIUJBIgIPu1cTLuq2rzQ9XHasVvtfHgH', 
      pixabay: '51036990-45a2a759750e0c9f66bc483d1',
      elevenlabs: '',
      voiceId: 'cgSgSjLCjtvcBway7TXK', // Default: Bella
      useVoiceover: false,
      mediaPreference: 'both'
    };

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ap_keys');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...defaultKeys, ...parsed };
        } catch (e) {
          return defaultKeys;
        }
      }
    }
    return defaultKeys;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('ap_keys', JSON.stringify(apiKeys));
    }
  }, [apiKeys, mounted]);

  return (
    <main className="min-h-screen bg-white text-zinc-900 selection:bg-blue-600/10">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.05)_0%,transparent_50%)]"></div>
      </div>

      {/* Header */}
      <header className="h-20 border-b border-zinc-200 flex items-center justify-between px-4 md:px-12 relative z-50 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
            <img src="/favicon.png" className="w-5 h-5 invert" alt="Logo" />
          </div>
          <span className="font-black uppercase tracking-widest text-xs md:text-sm text-zinc-900 truncate">AssetPacker<span className="text-blue-500">.ai</span></span>
        </div>

        <nav className="flex items-center gap-1 md:gap-2 p-1 bg-zinc-100 rounded-2xl border border-zinc-200 scale-90 md:scale-100">
           <button 
            onClick={() => setActiveTab('packer')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all duration-300 ${activeTab === 'packer' ? 'bg-white text-blue-600 shadow-md ring-1 ring-zinc-200' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
           >
             <LayoutGrid className="w-3.5 h-3.5" />
             <span className="hidden sm:inline">Packer</span>
           </button>
           <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase transition-all duration-300 ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-md ring-1 ring-zinc-200' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
           >
             <SettingsIcon className="w-3.5 h-3.5" />
             <span className="hidden sm:inline">Settings</span>
           </button>
        </nav>

        <div className="hidden lg:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
          <div className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-200">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Active: {mounted ? apiKeys.provider : '...'}
          </div>
        </div>
      </header>

      <div className="relative z-10 py-12">
        {mounted ? (
          activeTab === 'packer' ? (
            <Wizard apiKeys={apiKeys} />
          ) : (
            <Settings keys={apiKeys} onSave={setApiKeys} />
          )
        ) : (
          <div className="max-w-6xl mx-auto p-6 h-96 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </main>
  );
}
