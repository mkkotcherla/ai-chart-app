"use client";

import { useState } from "react";
import { Database, Loader2, CheckCircle2, ChevronDown, ChevronRight, Eye, EyeOff, Play } from "lucide-react";
import { toast } from "sonner";

export interface DBConfig {
  host: string; port: number; database: string; user: string; password: string; ssl: boolean;
}

export interface DBSchema {
  tables: Array<{ table_name: string; row_count: number; col_count: number }>;
  columns: Record<string, string[]>;
}

interface SQLPanelProps {
  onConnected: (config: DBConfig, schema: DBSchema, context: string) => void;
  onQuery?: (sql: string, config: DBConfig) => void;
}

const PRESETS = [
  { label: "Local PostgreSQL", host: "localhost", port: 5432, database: "postgres", user: "postgres", password: "", ssl: false },
  { label: "Supabase", host: "db.xxxx.supabase.co", port: 5432, database: "postgres", user: "postgres", password: "", ssl: true },
  { label: "Railway", host: "monorail.proxy.rlwy.net", port: 5432, database: "railway", user: "postgres", password: "", ssl: true },
];

export function SQLPanel({ onConnected, onQuery }: SQLPanelProps) {
  const [config, setConfig] = useState<DBConfig>({ host: "localhost", port: 5432, database: "", user: "postgres", password: "", ssl: false });
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<DBSchema | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [customSQL, setCustomSQL] = useState("");

  const connect = async () => {
    if (!config.database) { toast.error("Enter a database name"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/sql/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Connection failed");

      setSchema(data);
      toast.success(`Connected · ${data.tables.length} tables found`);

      // Build schema context for AI
      const ctx = buildSchemaContext(config.database, data);
      onConnected(config, data, ctx);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  };

  const runCustomSQL = () => {
    if (!customSQL.trim() || !schema) return;
    onQuery?.(customSQL.trim(), config);
  };

  const analyzeTable = (table: string) => {
    const sql = `SELECT * FROM "${table}" LIMIT 100`;
    onQuery?.(sql, config);
  };

  const set = (k: keyof DBConfig, v: string | number | boolean) =>
    setConfig(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      {!schema ? (
        /* ── Connection form ── */
        <div className="bg-white rounded-2xl border border-gray-200 p-5"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,.05)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Connect Database</p>
              <p className="text-xs text-gray-400">PostgreSQL supported</p>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setConfig({ ...config, host: p.host, port: p.port, database: p.database, user: p.user, ssl: p.ssl })}
                className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-medium">
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Host</label>
              <input value={config.host} onChange={e => set("host", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="localhost" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Port</label>
              <input value={config.port} type="number" onChange={e => set("port", Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="5432" />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Database</label>
            <input value={config.database} onChange={e => set("database", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="my_database" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">User</label>
              <input value={config.user} onChange={e => set("user", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="postgres" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</label>
              <div className="relative">
                <input value={config.password} onChange={e => set("password", e.target.value)}
                  type={showPass ? "text" : "password"}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-9 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="••••••••" />
                <button onClick={() => setShowPass(!showPass)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => set("ssl", !config.ssl)}
              className={`relative w-10 h-5 rounded-full transition-colors ${config.ssl ? "bg-indigo-500" : "bg-gray-200"}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.ssl ? "translate-x-5" : ""}`} />
            </button>
            <span className="text-xs font-medium text-gray-600">SSL / TLS</span>
          </div>

          <button onClick={connect} disabled={loading || !config.database}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold
              transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ boxShadow: "0 4px 12px rgba(99,102,241,.3)" }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <><Database className="w-4 h-4" /> Connect & Analyze</>}
          </button>
        </div>
      ) : (
        /* ── Schema browser ── */
        <div className="space-y-3">
          {/* Connected badge */}
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{config.database}</p>
              <p className="text-xs text-emerald-600">{config.host} · {schema.tables.length} tables</p>
            </div>
            <button onClick={() => setSchema(null)}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1">
              Disconnect
            </button>
          </div>

          {/* Tables */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tables</p>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {schema.tables.map(t => (
                <div key={t.table_name}>
                  <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group">
                    <button onClick={() => setExpanded(expanded === t.table_name ? null : t.table_name)}
                      className="flex items-center gap-2 flex-1 text-left">
                      {expanded === t.table_name ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-sm font-medium text-gray-700">{t.table_name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{t.row_count ?? "?"} rows</span>
                    </button>
                    <button onClick={() => analyzeTable(t.table_name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 hover:bg-indigo-100">
                      <Play className="w-2.5 h-2.5" /> Analyze
                    </button>
                  </div>
                  {expanded === t.table_name && schema.columns[t.table_name] && (
                    <div className="px-10 pb-2 space-y-0.5">
                      {schema.columns[t.table_name].map(col => (
                        <p key={col} className="text-[11px] text-gray-500 font-mono">{col}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom SQL */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Custom Query</label>
            <textarea
              value={customSQL}
              onChange={e => setCustomSQL(e.target.value)}
              placeholder="SELECT * FROM orders LIMIT 50"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono text-gray-800
                focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
            <button onClick={runCustomSQL} disabled={!customSQL.trim()}
              className="mt-2 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold
                transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Run & Analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildSchemaContext(dbName: string, schema: DBSchema): string {
  const lines = [`Database: ${dbName}`, `Tables (${schema.tables.length}):`];
  for (const t of schema.tables) {
    lines.push(`\n  Table: ${t.table_name} (${t.row_count ?? "?"} rows)`);
    const cols = schema.columns[t.table_name] ?? [];
    lines.push(`  Columns: ${cols.join(", ")}`);
  }
  return lines.join("\n");
}
