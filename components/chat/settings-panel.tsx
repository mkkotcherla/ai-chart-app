"use client";

import { useEffect, useState } from "react";
import { Settings, Eye, EyeOff, Check, Key } from "lucide-react";
import { getSettings, saveSettings, MODELS, type Settings as ISettings } from "@/lib/store";

export function SettingsPanel({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const [s, setS] = useState<ISettings>({ provider: "openai", apiKey: "", model: "gpt-4o-mini" });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setS(getSettings()); }, []);

  const save = () => {
    saveSettings(s);
    setSaved(true);
    onChange();
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 mx-4"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,.12)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Settings</h2>
            <p className="text-xs text-gray-400">Configure your AI provider and model</p>
          </div>
        </div>

        {/* Provider */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Provider</label>
          <div className="flex gap-2">
            {(["openai", "anthropic"] as const).map((p) => (
              <button key={p} onClick={() => setS({ ...s, provider: p, model: MODELS[p][0].id })}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all
                  ${s.provider === p
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"}`}>
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">API Key</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Key className="w-4 h-4" />
            </div>
            <input
              type={showKey ? "text" : "password"}
              value={s.apiKey}
              onChange={e => setS({ ...s, apiKey: e.target.value })}
              placeholder={s.provider === "openai" ? "sk-..." : "sk-ant-..."}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm
                text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            <button onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <span>🔒</span> Stored locally in your browser only — never sent to our servers
          </p>
        </div>

        {/* Model */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Model</label>
          <select value={s.model} onChange={e => setS({ ...s, model: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white">
            {MODELS[s.provider].map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={save} disabled={!s.apiKey}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5
              ${saved
                ? "bg-emerald-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"}`}
            style={{ boxShadow: s.apiKey ? "0 4px 12px rgba(99,102,241,.3)" : undefined }}>
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
