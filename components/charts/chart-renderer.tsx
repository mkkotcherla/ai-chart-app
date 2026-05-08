"use client";

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Sparkles, Target, ArrowRight, Brain } from "lucide-react";

export interface ChartSpec {
  type: "bar" | "line" | "area" | "pie" | "scatter" | "radar" | "kpi";
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey?: string;
  yKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  kpis?: Array<{ label: string; value: string | number; change?: number; unit?: string }>;
  prediction?: {
    label: string;
    value: string;
    confidence?: string;
    insight?: string;
    factors?: string[];
    trend?: "up" | "down" | "stable";
  };
}

const TIP = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e7ef",
  borderRadius: "10px",
  color: "#111827",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,.1)",
  padding: "10px 14px",
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TIP}>
      {label && <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6, fontWeight: 500 }}>{label}</p>}
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "#6b7280", fontSize: 12 }}>{p.name}:</span>
          <span style={{ color: "#111827", fontSize: 12, fontWeight: 600 }}>{formatNumber(Number(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

function KPICards({ kpis }: { kpis: NonNullable<ChartSpec["kpis"]> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 p-1 pb-3">
      {kpis.map((k, i) => {
        const up = (k.change ?? 0) > 0;
        const down = (k.change ?? 0) < 0;
        return (
          <div key={i}
            className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 animate-count"
            style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-xs text-gray-400 font-medium mb-1.5 uppercase tracking-wide">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">
              {typeof k.value === "number" ? formatNumber(k.value) : k.value}
              {k.unit && <span className="text-sm font-normal text-gray-400 ml-1">{k.unit}</span>}
            </p>
            {k.change !== undefined && (
              <div className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full
                ${up ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                  : down ? "text-red-600 bg-red-50 border border-red-100"
                  : "text-gray-500 bg-gray-100 border border-gray-200"}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : down ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {up ? "+" : ""}{k.change.toFixed(1)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: NonNullable<ChartSpec["prediction"]> }) {
  const up = prediction.trend === "up";
  const down = prediction.trend === "down";

  return (
    <div className="prediction-card mx-4 mb-4 rounded-2xl p-5">
      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">AI Prediction</p>
            <p className="text-xs text-indigo-500">{prediction.label}</p>
          </div>
          {prediction.confidence && (
            <span className="ml-auto text-xs bg-white border border-indigo-200 text-indigo-700 rounded-full px-3 py-1 font-semibold shadow-sm">
              {prediction.confidence} confidence
            </span>
          )}
        </div>

        {/* Value + trend */}
        <div className="flex items-center gap-3 mb-3">
          <p className="text-4xl font-bold text-gray-900 tracking-tight">{prediction.value}</p>
          {prediction.trend && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
              ${up ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : down ? "bg-red-100 text-red-600 border border-red-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
              {up ? <TrendingUp className="w-4 h-4" /> : down ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {up ? "Upward trend" : down ? "Downward trend" : "Stable trend"}
            </div>
          )}
        </div>

        {/* Insight */}
        {prediction.insight && (
          <p className="text-sm text-gray-600 leading-relaxed mb-4 bg-white/70 rounded-xl p-3 border border-indigo-100">
            💡 {prediction.insight}
          </p>
        )}

        {/* Key factors */}
        {prediction.factors && prediction.factors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5" /> Key Factors
            </p>
            {prediction.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600 bg-white/60 rounded-lg px-3 py-2 border border-indigo-50">
                <ArrowRight className="w-3 h-3 text-indigo-400 mt-0.5 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  const { type, title, description, data, xKey, yKeys, nameKey, valueKey, kpis, prediction } = spec;

  // AI sometimes sends nameKey instead of xKey for bar/line/area — fall back gracefully
  const effectiveXKey = xKey ?? (type !== "pie" && type !== "kpi" ? (nameKey ?? Object.keys(data?.[0] ?? {})[0]) : undefined);

  // Derive y-keys: exclude all axis/label keys
  const allExcluded = new Set([effectiveXKey, xKey, nameKey, valueKey].filter(Boolean) as string[]);
  const keys = yKeys ?? (data?.[0]
    ? Object.keys(data[0]).filter(k => !allExcluded.has(k) && typeof data[0][k] === "number" || !isNaN(Number(data[0][k])))
    : []);

  const h = 280;
  const axisStyle = { fontSize: 11, fill: "#9ca3af" };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden animate-fade-up"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)" }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
        {prediction && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">Prediction</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-2">
        {type === "kpi" && kpis ? (
          <KPICards kpis={kpis} />
        ) : type === "bar" ? (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f8" vertical={false} />
              <XAxis dataKey={effectiveXKey} tick={{ ...axisStyle, width: 80 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tickFormatter={formatNumber} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip />} />
              {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280", paddingTop: 8 }} />}
              {keys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[5, 5, 0, 0]} maxBarSize={52} isAnimationActive={true} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : type === "line" ? (
          <ResponsiveContainer width="100%" height={h}>
            <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f8" vertical={false} />
              <XAxis dataKey={effectiveXKey} tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatNumber} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip />} />
              {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280", paddingTop: 8 }} />}
              {keys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#fff", strokeWidth: 2, stroke: CHART_COLORS[i % CHART_COLORS.length] }}
                  activeDot={{ r: 6, strokeWidth: 0 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : type === "area" ? (
          <ResponsiveContainer width="100%" height={h}>
            <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <defs>
                {keys.map((k, i) => (
                  <linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f8" vertical={false} />
              <XAxis dataKey={effectiveXKey} tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatNumber} tick={axisStyle} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip />} />
              {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280", paddingTop: 8 }} />}
              {keys.map((k, i) => (
                <Area key={k} type="monotone" dataKey={k}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
                  fill={`url(#g${i})`}
                  dot={{ r: 3, fill: "#fff", strokeWidth: 2, stroke: CHART_COLORS[i % CHART_COLORS.length] }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : type === "pie" ? (
          <ResponsiveContainer width="100%" height={h}>
            <PieChart>
              <Pie data={data} dataKey={valueKey ?? "value"} nameKey={nameKey ?? "name"}
                cx="50%" cy="50%" outerRadius={105} innerRadius={40} paddingAngle={3}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={TIP} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : type === "scatter" ? (
          <ResponsiveContainer width="100%" height={h}>
            <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f8" />
              <XAxis dataKey={keys[0]} name={keys[0]} tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis dataKey={keys[1]} name={keys[1]} tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TIP} />
              <Scatter data={data} fill={CHART_COLORS[0]} opacity={0.85} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : type === "radar" ? (
          <ResponsiveContainer width="100%" height={h}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius={100}>
              <PolarGrid stroke="#e4e7ef" />
              <PolarAngleAxis dataKey={xKey ?? nameKey ?? "category"} tick={axisStyle} />
              {keys.map((k, i) => (
                <Radar key={k} name={k} dataKey={k}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
              ))}
              <Legend wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
              <Tooltip contentStyle={TIP} />
            </RadarChart>
          </ResponsiveContainer>
        ) : null}
      </div>

      {/* Prediction block */}
      {prediction && <PredictionCard prediction={prediction} />}
    </div>
  );
}
