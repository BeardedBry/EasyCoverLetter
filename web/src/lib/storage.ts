const API_KEY = "eastcoverletter:openaiApiKey";
const RESUME = "eastcoverletter:resume";
const EXTRA = "eastcoverletter:extraPrompt";
const LENGTH = "eastcoverletter:length";
const TONE = "eastcoverletter:tone";

export function loadApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY) ?? "";
}

export function saveApiKey(value: string) {
  localStorage.setItem(API_KEY, value);
}

export function loadResume(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(RESUME) ?? "";
}

export function saveResume(value: string) {
  localStorage.setItem(RESUME, value);
}

export function loadExtraPrompt(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(EXTRA) ?? "";
}

export function saveExtraPrompt(value: string) {
  localStorage.setItem(EXTRA, value);
}

export function loadLength(): "short" | "medium" | "long" {
  if (typeof window === "undefined") return "medium";
  const v = localStorage.getItem(LENGTH);
  if (v === "short" || v === "medium" || v === "long") return v;
  return "medium";
}

export function saveLength(value: "short" | "medium" | "long") {
  localStorage.setItem(LENGTH, value);
}

export function loadTone(): "casual" | "informal" | "formal" {
  if (typeof window === "undefined") return "formal";
  const v = localStorage.getItem(TONE);
  if (v === "casual" || v === "informal" || v === "formal") return v;
  return "formal";
}

export function saveTone(value: "casual" | "informal" | "formal") {
  localStorage.setItem(TONE, value);
}
