const LENGTH_GUIDE = {
  short: "about 150–200 words (3 short paragraphs)",
  medium: "about 250–350 words (3–4 paragraphs)",
  long: "about 400–500 words (4–5 paragraphs)",
};

const TONE_GUIDE = {
  casual: "warm and conversational, still professional enough for hiring",
  informal: "friendly and approachable without slang or jokes",
  formal: "polished, confident, and traditional business letter tone",
};

const KEYS = {
  apiKey: "ecl:openaiApiKey",
  resume: "ecl:resume",
  extra: "ecl:extraPrompt",
  length: "ecl:length",
  tone: "ecl:tone",
};

const els = {
  composeView: document.getElementById("composeView"),
  settingsView: document.getElementById("settingsView"),
  openSettingsBtn: document.getElementById("openSettingsBtn"),
  backComposeBtn: document.getElementById("backComposeBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  settingsSaved: document.getElementById("settingsSaved"),
  settingsHint: document.getElementById("settingsHint"),
  grabBtn: document.getElementById("grabBtn"),
  previousBtn: document.getElementById("previousBtn"),
  grabMeta: document.getElementById("grabMeta"),
  jobUrl: document.getElementById("jobUrl"),
  fetchUrlBtn: document.getElementById("fetchUrlBtn"),
  urlStatus: document.getElementById("urlStatus"),
  apiKey: document.getElementById("apiKey"),
  toggleKey: document.getElementById("toggleKey"),
  jobDescription: document.getElementById("jobDescription"),
  resume: document.getElementById("resume"),
  extraPrompt: document.getElementById("extraPrompt"),
  generateBtn: document.getElementById("generateBtn"),
  copyBtn: document.getElementById("copyBtn"),
  status: document.getElementById("status"),
  letterHint: document.getElementById("letterHint"),
  letter: document.getElementById("letter"),
};

let length = "medium";
let tone = "formal";
let previousGrab = null;
let currentGrab = null;
let savedApiKey = "";
let savedResume = "";

function setStatus(text, isError = false) {
  els.status.textContent = text || "";
  els.status.classList.toggle("error", Boolean(isError));
}

function settingsReady() {
  return Boolean(savedApiKey.trim() && savedResume.trim());
}

function updateSettingsHint() {
  const hasKey = Boolean(savedApiKey.trim());
  const hasResume = Boolean(savedResume.trim());
  if (hasKey && hasResume) {
    els.settingsHint.hidden = false;
    els.settingsHint.innerHTML =
      'Using saved API key and resume. <button type="button" class="text-link" id="hintEditSettings">Edit in Settings</button>';
  } else {
    els.settingsHint.hidden = false;
    const missing =
      !hasKey && !hasResume
        ? "Add your OpenAI API key and resume in"
        : !hasKey
          ? "Add your OpenAI API key in"
          : "Add your resume in";
    els.settingsHint.innerHTML = `${missing} <button type="button" class="text-link" id="hintOpenSettings">Settings</button> before generating.`;
  }
  document.getElementById("hintEditSettings")?.addEventListener("click", showSettings);
  document.getElementById("hintOpenSettings")?.addEventListener("click", showSettings);
}

function showSettings() {
  els.apiKey.value = savedApiKey;
  els.resume.value = savedResume;
  els.settingsSaved.textContent = "";
  els.composeView.hidden = true;
  els.settingsView.hidden = false;
}

function showCompose() {
  els.settingsView.hidden = true;
  els.composeView.hidden = false;
  updateSettingsHint();
}

function describeGrab(grab) {
  if (!grab) return "";
  const when = grab.grabbedAt ? new Date(grab.grabbedAt).toLocaleString() : "";
  const title = grab.title || "Untitled page";
  return `${title}${when ? ` · ${when}` : ""}`;
}

function applyGrab(grab, label) {
  if (!grab?.text) return;
  els.jobDescription.value = grab.text;
  els.grabMeta.textContent = `${label}: ${describeGrab(grab)}`;
}

function wireChips(groupEl, onPick) {
  groupEl.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      groupEl.querySelectorAll(".chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onPick(btn.dataset.value);
      persistComposePrefs();
    });
  });
}

function setChip(groupId, value) {
  const group = document.getElementById(groupId);
  group.querySelectorAll(".chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

async function loadState() {
  const res = await chrome.runtime.sendMessage({ type: "LOAD_SETTINGS" });
  const data = res?.data || {};
  savedApiKey = data[KEYS.apiKey] || "";
  savedResume = data[KEYS.resume] || "";
  els.apiKey.value = savedApiKey;
  els.resume.value = savedResume;
  els.extraPrompt.value = data[KEYS.extra] || "";
  length = data[KEYS.length] || "medium";
  tone = data[KEYS.tone] || "formal";
  setChip("lengthChips", length);
  setChip("toneChips", tone);

  currentGrab = data["ecl:currentGrab"] || null;
  previousGrab = data["ecl:previousGrab"] || null;
  if (currentGrab?.text) applyGrab(currentGrab, "Last grab");
  els.previousBtn.disabled = !previousGrab?.text;
  updateSettingsHint();
}

async function persistComposePrefs() {
  await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: {
      [KEYS.extra]: els.extraPrompt.value,
      [KEYS.length]: length,
      [KEYS.tone]: tone,
    },
  });
}

async function persistSettings() {
  savedApiKey = els.apiKey.value.trim();
  savedResume = els.resume.value;
  await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: {
      [KEYS.apiKey]: savedApiKey,
      [KEYS.resume]: savedResume,
    },
  });
  els.settingsSaved.textContent = "Saved on this device.";
  updateSettingsHint();
}

function buildSystemPrompt() {
  return [
    "You write tailored cover letters for job applications.",
    "Use only facts supported by the resume; never invent employers, titles, skills, or degrees.",
    "Mirror language from the job description where it honestly fits the resume.",
    "Do not include a mailing address block, placeholders like [Your Name], or meta commentary.",
    "Start with a greeting (Dear Hiring Manager, or a named contact if present in the JD).",
    "End with a brief closing and the candidate's name if it appears in the resume.",
    `Length target: ${LENGTH_GUIDE[length]}.`,
    `Tone: ${TONE_GUIDE[tone]}.`,
  ].join(" ");
}

function buildUserPrompt() {
  const parts = [
    "## Job description",
    els.jobDescription.value.trim(),
    "",
    "## Resume",
    savedResume.trim(),
  ];
  if (els.extraPrompt.value.trim()) {
    parts.push("", "## Extra instructions from the applicant", els.extraPrompt.value.trim());
  }
  parts.push("", "Write the cover letter now.");
  return parts.join("\n");
}

async function generateViaOpenAI(apiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt() },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI error (${res.status})`);
  }
  const letter = data.choices?.[0]?.message?.content?.trim();
  if (!letter) throw new Error("OpenAI returned an empty letter.");
  return letter;
}

function setUrlStatus(text, kind = "") {
  els.urlStatus.textContent = text || "";
  els.urlStatus.classList.toggle("error", kind === "error");
  els.urlStatus.classList.toggle("ok", kind === "ok");
}

async function copyLetter() {
  const text = els.letter.textContent || "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard.");
    if (els.letterHint) {
      els.letterHint.hidden = false;
      els.letterHint.textContent = "Copied";
      window.setTimeout(() => {
        if (els.letterHint) els.letterHint.textContent = "Tap letter to copy";
      }, 2000);
    }
  } catch {
    setStatus("Could not copy — select the letter and copy manually.", true);
  }
}

els.openSettingsBtn.addEventListener("click", showSettings);
els.backComposeBtn.addEventListener("click", showCompose);
els.saveSettingsBtn.addEventListener("click", () => {
  persistSettings().catch(() => {
    els.settingsSaved.textContent = "Could not save.";
  });
});

els.grabBtn.addEventListener("click", async () => {
  setStatus("Grabbing from the active tab…");
  els.grabBtn.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: "GRAB_ACTIVE_TAB" });
    if (!res?.ok) throw new Error(res?.error || "Grab failed");
    currentGrab = res.grab;
    previousGrab = res.previous;
    applyGrab(currentGrab, "Grabbed");
    els.previousBtn.disabled = !previousGrab?.text;
    setStatus("Job description loaded from the current page.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Grab failed", true);
  } finally {
    els.grabBtn.disabled = false;
  }
});

els.previousBtn.addEventListener("click", () => {
  if (!previousGrab?.text) {
    setStatus("No previous grab yet. Grab a page first, then another.", true);
    return;
  }
  applyGrab(previousGrab, "Previous page");
  setStatus("Loaded the previously grabbed job description.");
});

els.fetchUrlBtn.addEventListener("click", async () => {
  const url = els.jobUrl.value.trim();
  if (!url) {
    setUrlStatus("Paste a job posting URL first.", "error");
    return;
  }
  setUrlStatus("Opening URL and extracting…");
  els.fetchUrlBtn.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: "GRAB_FROM_URL", url });
    if (!res?.ok) throw new Error(res?.error || "URL fetch failed");
    currentGrab = res.grab;
    previousGrab = res.previous;
    applyGrab(currentGrab, "From URL");
    els.previousBtn.disabled = !previousGrab?.text;
    setUrlStatus("Loaded into the job description field. Edit if needed.", "ok");
    setStatus("Job description loaded from URL.");
  } catch (err) {
    setUrlStatus(err instanceof Error ? err.message : "URL fetch failed", "error");
  } finally {
    els.fetchUrlBtn.disabled = false;
  }
});

els.toggleKey.addEventListener("click", () => {
  const showing = els.apiKey.type === "text";
  els.apiKey.type = showing ? "password" : "text";
  els.toggleKey.textContent = showing ? "Show" : "Hide";
});

wireChips(document.getElementById("lengthChips"), (v) => {
  length = v;
});
wireChips(document.getElementById("toneChips"), (v) => {
  tone = v;
});

els.extraPrompt.addEventListener("change", () => {
  persistComposePrefs();
});

els.generateBtn.addEventListener("click", async () => {
  if (!settingsReady()) {
    setStatus("Add your OpenAI API key and resume in Settings first.", true);
    showSettings();
    return;
  }
  if (!els.jobDescription.value.trim()) {
    setStatus("Grab, fetch a URL, or paste a job description first.", true);
    return;
  }

  await persistComposePrefs();
  els.generateBtn.disabled = true;
  els.copyBtn.disabled = true;
  setStatus("Generating…");
  els.letter.hidden = true;
  if (els.letterHint) els.letterHint.hidden = true;

  try {
    const letter = await generateViaOpenAI(savedApiKey.trim());
    els.letter.textContent = letter;
    els.letter.hidden = false;
    if (els.letterHint) {
      els.letterHint.hidden = false;
      els.letterHint.textContent = "Tap letter to copy";
    }
    els.copyBtn.disabled = false;
    setStatus("Done.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Generate failed", true);
  } finally {
    els.generateBtn.disabled = false;
  }
});

els.copyBtn.addEventListener("click", () => {
  void copyLetter();
});

els.letter.addEventListener("click", () => {
  void copyLetter();
});

els.letter.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    void copyLetter();
  }
});

loadState();
