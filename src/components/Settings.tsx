"use client";

import React, { useState } from 'react';
import { Save, Key, ShieldCheck, Cpu, Globe, Layers } from 'lucide-react';

export interface ApiKeys {
  provider: 'gemini' | 'openai' | 'groq' | 'custom';
  gemini: string;
  openai: string;
  groq: string;
  custom: string;
  model: string;
  baseUrl: string;
  pexels: string;
  pixabay: string;
}

interface SettingsProps {
  keys: ApiKeys;
  onSave: (keys: ApiKeys) => void;
}

export default function Settings({ keys, onSave }: SettingsProps) {
  const [localKeys, setLocalKeys] = useState<ApiKeys>(keys);

  const handleSave = () => {
    onSave(localKeys);
    alert("BYOAPI Credentials Synchronized!");
  };

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-black uppercase tracking-tighter">BYOAPI Settings</h1>
        <p className="text-zinc-500 font-medium">Bring Your Own API. Configure your preferred LLM and Stock Media credentials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LLM Configuration */}
        <div className="md:col-span-2 space-y-6 bg-zinc-50 border border-zinc-200 p-8 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
             <Cpu className="w-5 h-5 text-blue-600" />
             <h3 className="font-black uppercase tracking-widest text-sm">LLM Intelligence</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Provider</label>
              <select
                value={localKeys.provider}
                onChange={e => setLocalKeys({ ...localKeys, provider: e.target.value as any })}
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all cursor-pointer font-bold"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="groq">Groq (Llama-3)</option>
                <option value="custom">Custom OpenAI-Compatible</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">API Key</label>
              <input
                type="password"
                value={localKeys[localKeys.provider] || ''}
                onChange={e => setLocalKeys({ ...localKeys, [localKeys.provider]: e.target.value })}
                placeholder={`Enter ${localKeys.provider.toUpperCase()} Key...`}
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {(localKeys.provider === 'openai' || localKeys.provider === 'groq' || localKeys.provider === 'custom') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-3 h-3 text-zinc-400" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Model Name</label>
                  </div>
                  <input
                    type="text"
                    value={localKeys.model}
                    onChange={e => setLocalKeys({ ...localKeys, model: e.target.value })}
                    placeholder={localKeys.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-3 h-3 text-zinc-400" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Base URL</label>
                  </div>
                  <input
                    type="text"
                    value={localKeys.baseUrl}
                    onChange={e => setLocalKeys({ ...localKeys, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stock Media */}
        <div className="space-y-6 bg-zinc-50 border border-zinc-200 p-8 rounded-[2rem] shadow-sm">
           <div className="flex items-center gap-2 mb-4">
             <Globe className="w-5 h-5 text-blue-600" />
             <h3 className="font-black uppercase tracking-widest text-sm">Media Libraries</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pexels Key</label>
              <input
                type="password"
                value={localKeys.pexels}
                onChange={e => setLocalKeys({ ...localKeys, pexels: e.target.value })}
                placeholder="Pexels Key..."
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-[10px] focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pixabay Key</label>
              <input
                type="password"
                value={localKeys.pixabay}
                onChange={e => setLocalKeys({ ...localKeys, pixabay: e.target.value })}
                placeholder="Pixabay Key..."
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-[10px] focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <button
          onClick={handleSave}
          className="px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all shadow-[0_15px_40px_rgba(37,99,235,0.2)] hover:scale-105 active:scale-95"
        >
          <Save className="w-6 h-6" />
          Synchronize BYOAPI
        </button>

        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4 max-w-xl">
          <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-blue-900 uppercase tracking-tight">Enterprise Privacy</p>
            <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
              Your credentials remain local. The engine connects directly to the providers you specify. No intermediary servers store your secrets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
