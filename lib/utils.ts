import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function tryParseJSON<T>(text: string): T | null {
  try {
    const match = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\})/);
    if (match) return JSON.parse(match[1]) as T;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

export function csvToObjects(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

export const CHART_COLORS = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#3b82f6", "#84cc16", "#f97316", "#6366f1",
];
