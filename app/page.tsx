"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "ai/react";
import { MessageItem, type Message } from "@/components/chat/message-item";
import { FileUpload, type FileInfo } from "@/components/upload/file-upload";
import { SQLPanel, type DBConfig, type DBSchema } from "@/components/sql/sql-panel";
import { SettingsPanel } from "@/components/chat/settings-panel";
import { getSettings, type Settings } from "@/lib/store";
import {
  Send, Settings as SettingsIcon, Plus, BarChart2, Trash2,
  Brain, Loader2, FileSpreadsheet, TrendingUp, MessageSquare,
  FileText, Database, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Toaster, toast } from "sonner";

type Tab = "chat" | "files" | "sql";

function buildFilePrompt(files: FileInfo[]): string {
  const fileList = files.map(f => `File: ${f.name}`).join("\n");
  const combined = files.map(f => `=== ${f.name} ===\n${f.text.slice(0, 4000)}`).join("\n\n");
  return `[AUTO_FILE_ANALYSIS] ${files.length} file(s): ${files.map(f => f.name).join(", ")}\n\n${fileList}\n\nData:\n\`\`\`\n${combined}\n\`\`\`\n\nFull analysis:\n1. **KPI summary card** with key metrics\n2. **Most insightful chart** with prediction\n3. **Trend/forecast chart** if time-series data exists\n4. **3 key insights** as bullet points\n\nEvery chart must include a prediction with confidence, trend, insight, and key factors.`;
}

function buildSQLAnalysisPrompt(columns: string[], rows: Record<string, unknown>[], sql: string): string {
  const preview = rows.slice(0, 20).map(r => Object.values(r).join(", ")).join("\n");
  return `[AUTO_SQL_ANALYSIS] Query: ${sql}\n\nColumns: ${columns.join(", ")}\nRows (${rows.length}):\n${preview}\n\nAnalyze:\n1. **KPI summary card**\n2. **Best chart** for this data with prediction\n3. **Trend or comparison chart** with forecast\n4. **3 key insights**\n\nUse the actual column names and values.`;
}

interface ChatRecord { id: string; title: string; tab: Tab }

export default function Home() {
  const [settings, setSettings]         = useState<Settings>({ provider: "openai", apiKey: "", model: "gpt-4o-mini" });
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab]                   = useState<Tab>("chat");
  const [loadedFiles, setLoadedFiles]   = useState<FileInfo[]>([]);
  const [sqlConfig, setSqlConfig]       = useState<DBConfig | null>(null);
  const [sqlContext, setSqlContext]     = useState<string | null>(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [history, setHistory]           = useState<ChatRecord[]>([]);
  // Collapsible panel (files/sql) shown above chat
  const [panelOpen, setPanelOpen]       = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, input, setInput, isLoading, handleSubmit, stop, setMessages, append } = useChat({
    api: "/api/chat",
    body: {
      apiKey: settings.apiKey,
      provider: settings.provider,
      model: settings.model,
      csvContext: loadedFiles.length > 0 ? loadedFiles.map(f => f.text).join("\n\n").slice(0, 8000) : null,
      sqlContext,
      sqlMode: tab === "sql",
    },
    onError: (e) => {
      setAnalyzing(false);
      toast.error(e.message.includes("API key") ? "Add your API key in Settings ⚙️" : e.message);
    },
    onFinish: () => setAnalyzing(false),
  });

  useEffect(() => {
    setSettings(getSettings());
    if (!getSettings().apiKey) setShowSettings(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveHistory = useCallback(() => {
    if (!messages.length) return;
    const label = loadedFiles[0]?.name ?? sqlConfig?.database ?? messages.find(m => m.role === "user")?.content.replace(/^\[AUTO_[A-Z_]+\]\s*/, "").slice(0, 42) ?? "Chat";
    setHistory(h => [{ id: Date.now().toString(), title: label, tab }, ...h.slice(0, 9)]);
  }, [messages, loadedFiles, sqlConfig, tab]);

  const handleFiles = useCallback((files: FileInfo[]) => {
    const s = getSettings();
    if (!s.apiKey) { toast.error("Add your API key ⚙️"); setShowSettings(true); return; }
    setLoadedFiles(files);
    if (!files.length) return;
    saveHistory(); setMessages([]); setAnalyzing(true);
    setPanelOpen(false); // collapse panel after upload to give chat more space
    toast.success(`Analyzing ${files.length} file(s)…`);
    const allText = files.map(f => f.text).join("\n\n");
    setTimeout(() => {
      append(
        { role: "user", content: buildFilePrompt(files) },
        { body: { apiKey: s.apiKey, provider: s.provider, model: s.model, csvContext: allText, sqlMode: false } }
      );
    }, 80);
  }, [append, setMessages, saveHistory]);

  const handleSQLConnect = useCallback((config: DBConfig, schema: DBSchema, context: string) => {
    const s = getSettings();
    setSqlConfig(config); setSqlContext(context);
    saveHistory(); setMessages([]); setAnalyzing(true);
    setPanelOpen(false);
    const prompt = `[AUTO_SQL_SCHEMA] Database: ${config.database}\n${schema.tables.length} tables: ${schema.tables.map(t => t.table_name).join(", ")}\n\nAnalyze:\n1. **KPI card** of database structure\n2. Suggest charts for the most interesting metrics\n3. **3 insights** about what to analyze further\n\nEvery chart must have a prediction.`;
    setTimeout(() => {
      append({ role: "user", content: prompt }, { body: { apiKey: s.apiKey, provider: s.provider, model: s.model, sqlContext: context, sqlMode: true } });
    }, 80);
  }, [append, setMessages, saveHistory]);

  const handleSQLQuery = useCallback(async (sql: string, config: DBConfig) => {
    const s = getSettings();
    if (!s.apiKey) { toast.error("Add your API key ⚙️"); return; }
    setAnalyzing(true); setPanelOpen(false);
    toast.info("Running query…");
    try {
      const res = await fetch("/api/sql/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, query: sql }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      toast.success(`${data.rowCount} rows · ${data.duration}ms`);
      append(
        { role: "user", content: buildSQLAnalysisPrompt(data.columns, data.rows, sql) },
        { body: { apiKey: s.apiKey, provider: s.provider, model: s.model, sqlContext, sqlMode: true } }
      );
    } catch (err) { toast.error(String(err)); setAnalyzing(false); }
  }, [append, sqlContext]);

  const handleFollowUp = useCallback((prompt: string) => {
    const s = getSettings();
    if (!s.apiKey) { toast.error("Add your API key ⚙️"); return; }
    append({ role: "user", content: prompt }, {
      body: { apiKey: s.apiKey, provider: s.provider, model: s.model, csvContext: loadedFiles.length ? loadedFiles.map(f => f.text).join("\n\n").slice(0, 8000) : null, sqlContext, sqlMode: tab === "sql" }
    });
  }, [append, loadedFiles, sqlContext, tab]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !busy) handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setPanelOpen(true);
  };

  const clearAll = () => {
    saveHistory();
    setMessages([]); setLoadedFiles([]); setSqlConfig(null); setSqlContext(null); setAnalyzing(false); setPanelOpen(true);
  };

  const noKey   = !settings.apiKey;
  const busy    = isLoading || analyzing;
  const isEmpty = messages.length === 0 && !busy;

  // Context badge for topbar
  const contextBadge = tab === "files" && loadedFiles.length > 0
    ? { icon: FileSpreadsheet, text: `${loadedFiles.length} file${loadedFiles.length > 1 ? "s" : ""}`, color: "bg-emerald-50 border-emerald-200 text-emerald-700" }
    : tab === "sql" && sqlConfig
    ? { icon: Database, text: sqlConfig.database, color: "bg-blue-50 border-blue-200 text-blue-700" }
    : null;

  const NAV = [
    { id: "chat" as Tab, icon: MessageSquare, label: "Chat" },
    { id: "files" as Tab, icon: FileText, label: "Files" },
    { id: "sql" as Tab, icon: Database, label: "SQL DB" },
  ];

  return (
    <div className="flex h-screen bg-[#f8f9fc] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"
            style={{ boxShadow: "0 4px 10px rgba(99,102,241,.3)" }}>
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">AI Charts</span>
        </div>

        {/* New Chat */}
        <div className="p-3 pb-1">
          <button onClick={clearAll}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600
              border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        {/* Nav tabs */}
        <nav className="px-3 pt-2 pb-1 space-y-0.5">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => switchTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${tab === id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
              <Icon className="w-4 h-4" />
              {label}
              {/* context dot */}
              {id === "files" && loadedFiles.length > 0 && (
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === "files" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                  {loadedFiles.length}
                </span>
              )}
              {id === "sql" && sqlConfig && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${tab === "sql" ? "bg-white" : "bg-emerald-400"}`} />
              )}
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-3 my-2 border-t border-gray-100" />

        {/* History */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {history.length > 0 ? (
            <>
              <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider px-2 py-1">Recent</p>
              {history.map(h => (
                <div key={h.id} className="flex items-start gap-2 px-2 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 cursor-default">
                  {h.tab === "files" ? <FileText className="w-3.5 h-3.5 mt-0.5 text-gray-300 flex-shrink-0" />
                    : h.tab === "sql" ? <Database className="w-3.5 h-3.5 mt-0.5 text-gray-300 flex-shrink-0" />
                    : <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-300 flex-shrink-0" />}
                  <span className="leading-snug line-clamp-2">{h.title}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full pb-8 text-center px-2">
              <TrendingUp className="w-7 h-7 text-gray-200 mb-2" />
              <p className="text-[11px] text-gray-400 leading-relaxed">Upload files, connect a DB or ask a question</p>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="p-3 border-t border-gray-100">
          <button onClick={() => setShowSettings(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
              ${noKey ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-gray-600 hover:bg-gray-100"}`}>
            <SettingsIcon className="w-4 h-4" />
            {noKey ? "Add API Key !" : "Settings"}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-sm font-medium text-gray-700">{settings.model}</span>
          </div>
          {contextBadge && (
            <div className={`flex items-center gap-1.5 text-xs border rounded-full px-2.5 py-0.5 font-medium ${contextBadge.color}`}>
              <contextBadge.icon className="w-3 h-3" />
              {contextBadge.text}
              {busy && <Loader2 className="w-3 h-3 animate-spin ml-0.5" />}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isEmpty && (
              <button onClick={clearAll} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowSettings(true)}
              className={`p-1.5 rounded-lg transition-all ${noKey ? "text-amber-600 bg-amber-50" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}>
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Collapsible Files/SQL panel (shown when tab ≠ chat) ── */}
        {tab !== "chat" && (
          <div className="flex-shrink-0 border-b border-gray-200 bg-white">
            {/* Panel header */}
            <button
              onClick={() => setPanelOpen(o => !o)}
              className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 transition-colors text-sm">
              {tab === "files" ? <FileText className="w-4 h-4 text-indigo-500" /> : <Database className="w-4 h-4 text-indigo-500" />}
              <span className="font-medium text-gray-700">{tab === "files" ? "Files" : "SQL Database"}</span>
              {tab === "files" && loadedFiles.length > 0 && (
                <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">
                  {loadedFiles.length} loaded
                </span>
              )}
              {tab === "sql" && sqlConfig && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-semibold">
                  {sqlConfig.database}
                </span>
              )}
              <span className="ml-auto text-gray-400">
                {panelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {/* Panel body */}
            {panelOpen && (
              <div className="px-5 pb-5 max-h-80 overflow-y-auto">
                {tab === "files" ? (
                  <FileUpload onData={handleFiles} multiple />
                ) : (
                  <SQLPanel onConnected={handleSQLConnect} onQuery={handleSQLQuery} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5"
                style={{ boxShadow: "0 8px 24px rgba(99,102,241,.25)" }}>
                <BarChart2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Charts & Predictions</h1>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-8">
                {tab === "files"
                  ? "Upload files in the panel above — AI will auto-analyze and generate charts with predictions."
                  : tab === "sql"
                  ? "Connect your database in the panel above — AI will chart and forecast your data."
                  : "Ask a question or switch to Files / SQL DB in the sidebar to get started."}
              </p>
              {tab === "chat" && (
                <div className="grid gap-2 w-full max-w-sm">
                  {[
                    "Show monthly revenue with growth prediction",
                    "Create a KPI dashboard for e-commerce",
                    "Predict next month: Jan 50k, Feb 58k, Mar 63k",
                  ].map(s => (
                    <button key={s}
                      onClick={() => { setInput(s); setTimeout(() => document.getElementById("chat-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })), 40); }}
                      className="flex items-center gap-3 text-left px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((m, i) => (
                <MessageItem
                  key={m.id}
                  message={m as Message}
                  isStreaming={busy && i === messages.length - 1 && m.role === "assistant"}
                  onFollowUp={handleFollowUp}
                />
              ))}

              {/* Thinking indicator */}
              {busy && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0"
                    style={{ boxShadow: "0 2px 8px rgba(99,102,241,.25)" }}>
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Analyzing and building charts…</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {["Scanning data", "Detecting trends", "Generating predictions"].map((s, j) => (
                        <span key={s} className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-2.5 py-1 font-medium animate-fade-in"
                          style={{ animationDelay: `${j * 300}ms` }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-5 pt-2 max-w-3xl mx-auto w-full flex-shrink-0">
          <form id="chat-form" onSubmit={handleSubmit}
            className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 transition-shadow focus-within:shadow-md focus-within:border-indigo-300"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <textarea
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={handleKeyDown}
              disabled={noKey || busy}
              placeholder={
                noKey ? "⚙️  Add your API key in Settings…"
                : busy ? "Analyzing…"
                : tab === "sql" && sqlConfig ? `Ask about ${sqlConfig.database}…`
                : loadedFiles.length ? `Ask about ${loadedFiles.map(f => f.name).join(", ")}…`
                : "Ask for charts, analysis, or predictions…"
              }
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-800 placeholder-gray-400 outline-none px-2 py-2 max-h-40 overflow-y-auto disabled:cursor-not-allowed"
            />
            {busy ? (
              <button type="button" onClick={stop}
                className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0">
                <div className="w-3 h-3 bg-gray-600 rounded-sm" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim() || noKey}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-30"
                style={{ boxShadow: input.trim() && !noKey ? "0 4px 10px rgba(99,102,241,.35)" : undefined }}>
                <Send className="w-4 h-4 text-white" />
              </button>
            )}
          </form>
          <p className="text-center text-xs text-gray-400 mt-2">AI predictions are estimates — verify before acting</p>
        </div>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onChange={() => setSettings(getSettings())} />}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
