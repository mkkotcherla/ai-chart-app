"use client";

// Simple localStorage-based store (no Zustand needed)

export interface Settings {
  provider: "openai" | "anthropic";
  apiKey: string;
  model: string;
}

const DEFAULT_SETTINGS: Settings = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
};

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem("ai_chart_settings");
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Partial<Settings>) {
  const current = getSettings();
  localStorage.setItem("ai_chart_settings", JSON.stringify({ ...current, ...s }));
}

export const MODELS = {
  openai: [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (fast, cheap)" },
    { id: "gpt-4o", name: "GPT-4o (best)" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  ],
  anthropic: [
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku (fast)" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet (best)" },
  ],
};
