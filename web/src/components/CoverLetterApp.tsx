"use client";

import { useEffect, useState } from "react";
import { generateCoverLetter } from "@/lib/generate";
import { scrapeJobUrlInBrowser } from "@/lib/scrapeJd";
import {
  loadApiKey,
  loadExtraPrompt,
  loadLength,
  loadResume,
  loadTone,
  saveApiKey,
  saveExtraPrompt,
  saveLength,
  saveResume,
  saveTone,
} from "@/lib/storage";
import type { LetterLength, LetterTone } from "@/lib/types";

type Status = "idle" | "loading" | "error" | "done";
type Screen = "compose" | "settings";
type ScrapeStatus = "idle" | "loading" | "error" | "done";

export default function CoverLetterApp() {
  const [screen, setScreen] = useState<Screen>("compose");
  const [apiKey, setApiKey] = useState("");
  const [draftApiKey, setDraftApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [resume, setResume] = useState("");
  const [draftResume, setDraftResume] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extraPrompt, setExtraPrompt] = useState("");
  const [length, setLength] = useState<LetterLength>("medium");
  const [tone, setTone] = useState<LetterTone>("formal");
  const [letter, setLetter] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [scrapeMessage, setScrapeMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const hasApiKey = Boolean(apiKey.trim());
  const hasResume = Boolean(resume.trim());
  const settingsReady = hasApiKey && hasResume;

  useEffect(() => {
    const key = loadApiKey();
    const savedResume = loadResume();
    setApiKey(key);
    setDraftApiKey(key);
    setResume(savedResume);
    setDraftResume(savedResume);
    setExtraPrompt(loadExtraPrompt());
    setLength(loadLength());
    setTone(loadTone());

    const params = new URLSearchParams(window.location.search);
    const jd = params.get("jd");
    if (jd) {
      try {
        setJobDescription(decodeURIComponent(jd));
      } catch {
        setJobDescription(jd);
      }
    }
    const job = params.get("jobUrl") || params.get("url");
    if (job) {
      try {
        setJobUrl(decodeURIComponent(job));
      } catch {
        setJobUrl(job);
      }
    }
    if (params.get("settings") === "1") {
      setScreen("settings");
    }

    setHydrated(true);
  }, []);

  function openSettings() {
    setDraftApiKey(apiKey);
    setDraftResume(resume);
    setSettingsSaved(false);
    setShowKey(false);
    setScreen("settings");
  }

  function saveSettings() {
    const nextKey = draftApiKey.trim();
    const nextResume = draftResume;
    saveApiKey(nextKey);
    saveResume(nextResume);
    setApiKey(nextKey);
    setResume(nextResume);
    setSettingsSaved(true);
    window.setTimeout(() => setSettingsSaved(false), 2000);
  }

  async function onFetchFromUrl() {
    setScrapeMessage("");
    setScrapeStatus("loading");
    if (!jobUrl.trim()) {
      setScrapeStatus("error");
      setScrapeMessage("Paste a job posting URL first.");
      return;
    }

    const result = await scrapeJobUrlInBrowser(jobUrl);
    if (!result.ok) {
      setScrapeStatus("error");
      setScrapeMessage(result.error);
      return;
    }

    setJobDescription(result.text);
    setScrapeStatus("done");
    setScrapeMessage(
      `Loaded from URL (${result.source}). Edit the text below if needed, then generate.`,
    );
  }

  async function onGenerate() {
    setError("");
    setCopied(false);

    if (!hasApiKey || !hasResume) {
      setStatus("error");
      setError("Add your OpenAI API key and resume in Settings first.");
      return;
    }
    if (!jobDescription.trim()) {
      setStatus("error");
      setError("Paste a job description, fetch a URL, or use the Chrome extension first.");
      return;
    }

    setStatus("loading");
    saveExtraPrompt(extraPrompt);
    saveLength(length);
    saveTone(tone);

    try {
      const nextLetter = await generateCoverLetter(apiKey.trim(), {
        jobDescription,
        resume,
        extraPrompt,
        length,
        tone,
      });
      setLetter(nextLetter);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach OpenAI. Check your connection and API key.",
      );
    }
  }

  async function onCopy() {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard permission denied — select and copy manually.");
      setStatus("error");
    }
  }

  if (screen === "settings") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 sm:max-w-2xl sm:py-10">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Settings
            </p>
            <p className="text-[15px] leading-relaxed text-[var(--muted)]">
              Saved once on this device — used every time you generate.
            </p>
          </div>
          <button type="button" className="btn-ghost shrink-0" onClick={() => setScreen("compose")}>
            Back
          </button>
        </header>

        <section className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">OpenAI API key</span>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={draftApiKey}
                onChange={(e) => setDraftApiKey(e.target.value)}
                placeholder="sk-…"
                className="field flex-1"
              />
              <button
                type="button"
                className="btn-ghost shrink-0"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <span className="block text-xs text-[var(--muted)]">
              Stored in localStorage only. Never committed.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--ink)]">Resume</span>
            <textarea
              value={draftResume}
              onChange={(e) => setDraftResume(e.target.value)}
              rows={12}
              placeholder="Paste your resume or a plain-text summary of your experience."
              className="field resize-y"
            />
          </label>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" className="btn-primary" onClick={saveSettings}>
            Save settings
          </button>
          {settingsSaved ? (
            <p className="text-sm text-[var(--accent)]" aria-live="polite">
              Saved on this device.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-8 sm:max-w-2xl sm:py-10">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="font-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            EastCoverLetter
          </p>
          <p className="max-w-prose text-[15px] leading-relaxed text-[var(--muted)]">
            Paste a job URL or description, set length and tone, then generate. API
            key and resume live in Settings.
          </p>
        </div>
        <button type="button" className="btn-ghost shrink-0" onClick={openSettings}>
          Settings
        </button>
      </header>

      {!settingsReady && hydrated ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]">
          {!hasApiKey && !hasResume
            ? "Add your OpenAI API key and resume in "
            : !hasApiKey
              ? "Add your OpenAI API key in "
              : "Add your resume in "}
          <button type="button" className="settings-link" onClick={openSettings}>
            Settings
          </button>
          {" "}
          before generating.
        </p>
      ) : hydrated ? (
        <p className="text-xs text-[var(--muted)]">
          Using saved API key and resume.{" "}
          <button type="button" className="settings-link" onClick={openSettings}>
            Edit in Settings
          </button>
        </p>
      ) : null}

      <section className="space-y-4" aria-labelledby="compose-heading">
        <h2
          id="compose-heading"
          className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]"
        >
          Compose
        </h2>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--ink)]" htmlFor="jobUrl">
            Job posting URL{" "}
            <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="jobUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://…"
              className="field flex-1"
            />
            <button
              type="button"
              className="btn-ghost shrink-0"
              disabled={scrapeStatus === "loading"}
              onClick={onFetchFromUrl}
            >
              {scrapeStatus === "loading" ? "Fetching…" : "Fetch JD"}
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Heuristics only (no AI). Most boards block the PWA — use the Chrome
            extension’s Fetch from URL, or paste text below.
          </p>
          {scrapeStatus === "loading" ? (
            <p className="text-sm text-[var(--muted)]" aria-live="polite">
              Fetching and extracting…
            </p>
          ) : null}
          {scrapeStatus === "error" && scrapeMessage ? (
            <p
              className="rounded-md border border-red-300/70 bg-red-50 px-3 py-2 text-sm text-red-900"
              role="alert"
            >
              {scrapeMessage}
            </p>
          ) : null}
          {scrapeStatus === "done" && scrapeMessage ? (
            <p className="text-sm text-[var(--accent)]" aria-live="polite">
              {scrapeMessage}
            </p>
          ) : null}
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--ink)]">Job description</span>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            placeholder="Paste the posting, fetch a URL above, or use the Chrome extension."
            className="field resize-y"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--ink)]">
            Extra prompt <span className="font-normal text-[var(--muted)]">(optional)</span>
          </span>
          <textarea
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. Emphasize React and remote collaboration; keep it under one page."
            className="field resize-y"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[var(--ink)]">Length</legend>
            <div className="flex flex-wrap gap-2">
              {(["short", "medium", "long"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={length === opt ? "chip chip-active" : "chip"}
                  onClick={() => setLength(opt)}
                  aria-pressed={length === opt}
                >
                  {opt}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[var(--ink)]">Tone</legend>
            <div className="flex flex-wrap gap-2">
              {(["casual", "informal", "formal"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={tone === opt ? "chip chip-active" : "chip"}
                  onClick={() => setTone(opt)}
                  aria-pressed={tone === opt}
                >
                  {opt}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="btn-primary"
          disabled={!hydrated || status === "loading"}
          onClick={onGenerate}
        >
          {status === "loading" ? "Generating…" : "Generate cover letter"}
        </button>
        <button type="button" className="btn-ghost" disabled={!letter} onClick={onCopy}>
          {copied ? "Copied" : "Copy letter"}
        </button>
      </div>

      {status === "error" && error ? (
        <p
          className="rounded-md border border-red-300/70 bg-red-50 px-3 py-2 text-sm text-red-900"
          role="alert"
        >
          {error}{" "}
          {error.includes("Settings") ? (
            <button type="button" className="settings-link" onClick={openSettings}>
              Open Settings
            </button>
          ) : null}
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="text-sm text-[var(--muted)]" aria-live="polite">
          Writing your letter…
        </p>
      ) : null}

      {letter ? (
        <section className="space-y-2" aria-labelledby="letter-heading">
          <div className="flex items-baseline justify-between gap-2">
            <h2
              id="letter-heading"
              className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Letter
            </h2>
            <span className="text-xs text-[var(--muted)]" aria-live="polite">
              {copied ? "Copied" : "Tap letter to copy"}
            </span>
          </div>
          <article
            role="button"
            tabIndex={0}
            title="Tap to copy"
            className="letter-surface letter-tappable whitespace-pre-wrap font-letter text-[15px] leading-relaxed text-[var(--ink)]"
            onClick={onCopy}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void onCopy();
              }
            }}
          >
            {letter}
          </article>
        </section>
      ) : null}
    </div>
  );
}
