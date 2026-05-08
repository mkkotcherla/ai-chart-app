"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChartRenderer, type ChartSpec } from "@/components/charts/chart-renderer";
import { tryParseJSON } from "@/lib/utils";
import { Bot, User, Copy, Check, FileSpreadsheet, Database, Sparkles, ChevronRight } from "lucide-react";
import { useState } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const FOLLOWUP_CHIPS = [
  { label: "Predict next month",      prompt: "Predict next month's values and show a forecast chart with confidence range" },
  { label: "3-month forecast",         prompt: "Show a 3-month forecast trend chart with upper and lower bounds" },
  { label: "Fastest growing segment",  prompt: "Which category or segment is growing fastest? Show a chart with prediction." },
  { label: "Downside risk",            prompt: "Show worst-case downside risk if the trend reverses. Include a scenario chart." },
  { label: "Weekly breakdown",         prompt: "Break this data into a weekly view with weekly predictions" },
  { label: "Category comparison",      prompt: "Compare all categories side by side in a bar chart with next-quarter forecast" },
  { label: "Stock risk forecast",      prompt: "Forecast stock levels and highlight items at risk of running out" },
  { label: "Revenue per product",      prompt: "Show revenue distribution per product with a growth prediction" },
];

function getChips(content: string) {
  const hash = content.length % FOLLOWUP_CHIPS.length;
  return [...FOLLOWUP_CHIPS.slice(hash), ...FOLLOWUP_CHIPS.slice(0, hash)].slice(0, 4);
}

function splitContent(content: string): { textBefore: string; charts: ChartSpec[]; isStreamingChart: boolean } {
  const charts: ChartSpec[] = [];
  content.replace(/```chart\n?([\s\S]*?)\n?```/g, (_m, json) => {
    const spec = tryParseJSON<ChartSpec>(json);
    if (spec?.type && (spec?.data || spec?.kpis)) charts.push(spec);
    return "";
  });
  const firstIdx = content.indexOf("```chart");
  const textBefore = firstIdx > -1
    ? content.slice(0, firstIdx).trim()
    : content.replace(/```chart[\s\S]*?```/g, "").trim();
  const openCount   = (content.match(/```chart/g) ?? []).length;
  const closedCount = (content.match(/```chart[\s\S]*?```/g) ?? []).length;
  return { textBefore, charts, isStreamingChart: openCount > closedCount };
}

// Detect auto-generated prompts and extract metadata
function parseAutoMessage(content: string): { type: "file" | "sql" | "sql_schema" | null; label: string } {
  if (content.startsWith("[AUTO_FILE_ANALYSIS]")) {
    const match = content.match(/\[AUTO_FILE_ANALYSIS\] (.+?) file\(s\): (.+)/);
    return { type: "file", label: match ? `${match[1]} file${Number(match[1]) > 1 ? "s" : ""}: ${match[2]}` : "Files uploaded" };
  }
  if (content.startsWith("[AUTO_SQL_ANALYSIS]")) {
    const match = content.match(/\[AUTO_SQL_ANALYSIS\] Query: (.+)/);
    return { type: "sql", label: match ? `Query: ${match[1].slice(0, 60)}` : "SQL query executed" };
  }
  if (content.startsWith("[AUTO_SQL_SCHEMA]")) {
    const match = content.match(/\[AUTO_SQL_SCHEMA\] Database: (\S+)/);
    return { type: "sql_schema", label: match ? `Connected: ${match[1]}` : "Database connected" };
  }
  return { type: null, label: "" };
}

function isCSVMsg(c: string) { return c.startsWith('I uploaded a file called "'); }
function csvFilename(c: string) { return c.match(/^I uploaded a file called "([^"]+)"/)?.[1] ?? "file.csv"; }

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>
      <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-center gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded-full w-48 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded-full w-64 animate-pulse" />
        </div>
        <div className="h-7 w-24 bg-indigo-50 border border-indigo-100 rounded-full animate-pulse" />
      </div>
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-end gap-2.5 h-48">
          {[55, 80, 40, 95, 65, 75, 50].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-lg animate-pulse"
              style={{ height: `${h}%`, background: "linear-gradient(to top,#e0e7ff,#c7d2fe)", animationDelay: `${i*100}ms` }} />
          ))}
        </div>
        <div className="flex justify-between mt-3 gap-2">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="h-2.5 flex-1 bg-gray-100 rounded animate-pulse" style={{ animationDelay: `${i*80}ms` }} />
          ))}
        </div>
      </div>
      <div className="prediction-card mx-4 mb-4 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-300 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 w-20 bg-indigo-200 rounded animate-pulse" />
            <div className="h-2 w-32 bg-indigo-100 rounded animate-pulse" />
          </div>
          <div className="h-7 w-28 bg-white/80 rounded-full animate-pulse" />
        </div>
        <div className="h-9 w-36 bg-indigo-100 rounded-xl mb-3 animate-pulse" />
        <div className="h-16 bg-white/70 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export function MessageItem({
  message, isStreaming, onFollowUp,
}: { message: Message; isStreaming?: boolean; onFollowUp?: (p: string) => void }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  // ── User: legacy CSV upload message ──
  if (isUser && isCSVMsg(message.content)) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="flex items-center gap-3 bg-white border border-emerald-200 rounded-2xl rounded-tr-sm px-4 py-3"
          style={{ boxShadow: "0 2px 10px rgba(16,185,129,.1)" }}>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{csvFilename(message.content)}</p>
            <p className="text-xs text-emerald-600 font-medium">Analyzing with AI…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── User: auto-generated analysis prompts → show clean card ──
  if (isUser) {
    const { type, label } = parseAutoMessage(message.content);
    if (type) {
      const isFile = type === "file";
      const Icon = isFile ? FileSpreadsheet : Database;
      const borderColor = isFile ? "border-emerald-200" : "border-blue-200";
      const bgColor = isFile ? "bg-emerald-100" : "bg-blue-100";
      const iconColor = isFile ? "text-emerald-600" : "text-blue-600";
      const textColor = isFile ? "text-emerald-600" : "text-blue-600";
      const shadowColor = isFile ? "rgba(16,185,129,.1)" : "rgba(59,130,246,.1)";
      const action = type === "file" ? "Analyzing with AI…" : type === "sql_schema" ? "Schema loaded · generating charts…" : "Running query · generating charts…";

      return (
        <div className="flex justify-end animate-fade-up">
          <div className={`flex items-center gap-3 bg-white border ${borderColor} rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs`}
            style={{ boxShadow: `0 2px 10px ${shadowColor}` }}>
            <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{label}</p>
              <p className={`text-xs ${textColor} font-medium`}>{action}</p>
            </div>
          </div>
        </div>
      );
    }
  }

  // ── User: normal bubble ──
  if (isUser) {
    return (
      <div className="flex gap-3 flex-row-reverse animate-fade-up">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 bg-gray-200 border border-gray-300">
          <User className="w-4 h-4 text-gray-600" />
        </div>
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%]"
          style={{ boxShadow: "0 2px 8px rgba(99,102,241,.15)" }}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // ── Assistant ──
  const { textBefore, charts, isStreamingChart } = splitContent(message.content);
  const chips = charts.length > 0 && !isStreaming && onFollowUp ? getChips(message.content) : [];

  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 bg-gradient-to-br from-indigo-500 to-violet-600"
        style={{ boxShadow: "0 2px 8px rgba(99,102,241,.25)" }}>
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="flex flex-col gap-3 min-w-0 flex-1">
        {/* Text before charts */}
        {textBefore && (
          <div className="group relative bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{textBefore}</ReactMarkdown>
            </div>
            {isStreaming && !isStreamingChart && (
              <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse rounded-sm align-middle" />
            )}
            {!isStreaming && (
              <button onClick={() => { navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}

        {/* Bare cursor */}
        {isStreaming && !textBefore && charts.length === 0 && !isStreamingChart && (
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 w-16"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
            <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded-sm" />
          </div>
        )}

        {/* Completed charts */}
        {charts.map((spec, i) => <ChartRenderer key={i} spec={spec} />)}

        {/* Skeleton while streaming a chart block */}
        {isStreamingChart && <ChartSkeleton />}

        {/* Prediction follow-up chips */}
        {chips.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Next predictions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button key={chip.label} onClick={() => onFollowUp!(chip.prompt)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-indigo-200
                    bg-white text-indigo-700 text-xs font-semibold
                    hover:bg-indigo-50 hover:border-indigo-400 active:scale-95 transition-all group"
                  style={{ boxShadow: "0 1px 4px rgba(99,102,241,.12)" }}>
                  <ChevronRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
