const STORAGE_KEYS = {
  current: "ecl:currentGrab",
  previous: "ecl:previousGrab",
  apiKey: "ecl:openaiApiKey",
  resume: "ecl:resume",
  extra: "ecl:extraPrompt",
  length: "ecl:length",
  tone: "ecl:tone",
};

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GRAB_ACTIVE_TAB") {
    grabActiveTab()
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Grab failed",
        }),
      );
    return true;
  }

  if (message?.type === "GRAB_FROM_URL") {
    grabFromUrl(message.url)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "URL fetch failed",
        }),
      );
    return true;
  }

  if (message?.type === "GET_GRABS") {
    chrome.storage.local.get([STORAGE_KEYS.current, STORAGE_KEYS.previous], (data) => {
      sendResponse({
        ok: true,
        current: data[STORAGE_KEYS.current] || null,
        previous: data[STORAGE_KEYS.previous] || null,
      });
    });
    return true;
  }

  if (message?.type === "SAVE_SETTINGS") {
    chrome.storage.local.set(message.payload || {}, () => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "LOAD_SETTINGS") {
    chrome.storage.local.get(
      [
        STORAGE_KEYS.apiKey,
        STORAGE_KEYS.resume,
        STORAGE_KEYS.extra,
        STORAGE_KEYS.length,
        STORAGE_KEYS.tone,
        STORAGE_KEYS.current,
        STORAGE_KEYS.previous,
      ],
      (data) => sendResponse({ ok: true, data }),
    );
    return true;
  }

  return false;
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabComplete(tabId, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let settled = false;

    function finish(fn) {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      fn();
    }

    function onUpdated(id, info) {
      if (id === tabId && info.status === "complete") {
        finish(() => resolve());
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        finish(() => reject(new Error(chrome.runtime.lastError.message)));
        return;
      }
      if (tab.status === "complete") {
        finish(() => resolve());
      }
    });

    const timer = setInterval(() => {
      if (Date.now() - started > timeoutMs) {
        finish(() => reject(new Error("Timed out waiting for the job page to load.")));
      }
    }, 400);
  });
}

async function extractFromTab(tabId) {
  let response;
  try {
    response = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_JD" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    // Give SPA content a moment after inject
    await sleep(400);
    response = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_JD" });
  }
  return response;
}

async function saveGrab(grab) {
  const existing = await chrome.storage.local.get([STORAGE_KEYS.current, STORAGE_KEYS.previous]);
  const updates = { [STORAGE_KEYS.current]: grab };
  if (existing[STORAGE_KEYS.current]?.text) {
    updates[STORAGE_KEYS.previous] = existing[STORAGE_KEYS.current];
  }
  await chrome.storage.local.set(updates);
  return {
    ok: true,
    grab,
    previous: updates[STORAGE_KEYS.previous] || existing[STORAGE_KEYS.previous] || null,
  };
}

async function grabActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { ok: false, error: "No active tab." };
  }
  if (
    !tab.url ||
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://") ||
    tab.url.startsWith("edge://") ||
    tab.url.startsWith("about:")
  ) {
    return { ok: false, error: "Cannot read this page. Open a job posting tab first." };
  }

  const response = await extractFromTab(tab.id);
  if (!response?.ok || !response.text) {
    return { ok: false, error: response?.error || "No job description text found on this page." };
  }

  const grab = {
    text: response.text,
    title: response.title || tab.title || "",
    url: response.url || tab.url || "",
    source: response.source || "unknown",
    grabbedAt: Date.now(),
  };

  return saveGrab(grab);
}

async function grabFromUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || "").trim());
  } catch {
    return { ok: false, error: "That doesn’t look like a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http(s) job links are supported." };
  }

  const tab = await chrome.tabs.create({ url: parsed.toString(), active: false });
  if (!tab?.id) {
    return { ok: false, error: "Could not open the job URL in a tab." };
  }

  try {
    await waitForTabComplete(tab.id);
    // Many ATS pages hydrate after document.complete
    await sleep(1800);
    let response = await extractFromTab(tab.id);
    if (!response?.ok || !response.text || response.text.length < 80) {
      await sleep(2200);
      response = await extractFromTab(tab.id);
    }
    if (!response?.ok || !response.text) {
      return {
        ok: false,
        error:
          response?.error ||
          "Opened the URL but couldn’t extract a job description. Try Grab on the open tab, or paste the text.",
      };
    }

    const grab = {
      text: response.text,
      title: response.title || tab.title || "",
      url: response.url || parsed.toString(),
      source: response.source || "url-tab",
      grabbedAt: Date.now(),
    };
    return saveGrab(grab);
  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {
      // Tab may already be closed by the user.
    }
  }
}

export { STORAGE_KEYS };
