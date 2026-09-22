/**
 * Extract a job description from the active page (heuristics only, no AI).
 * Prefers user selection, then common ATS selectors / “About the job” sections,
 * then largest main text. Strips nav/scripts before scoring.
 */

const SELECTORS = [
  "[data-testid='jobDescriptionText']",
  "[data-testid='job-description']",
  "[data-automation-id='jobPostingDescription']",
  ".jobs-description__content",
  ".jobs-description-content__text",
  "#job-details",
  ".jobsearch-JobComponent-description",
  "#jobDescriptionText",
  ".job-description",
  ".jobDescription",
  ".job_description",
  ".description__text",
  ".posting-description",
  ".content .section-wrapper",
  ".content-wrapper .content",
  "[class*='job-description']",
  "[class*='JobDescription']",
  "[class*='jobDescription']",
  "[id*='job-description']",
  "[id*='jobDescription']",
  "[class*='posting']",
  "article",
  "main",
  "[role='main']",
];

const STRIP = "script, style, noscript, nav, header, footer, aside, iframe, svg, form";

function cleanText(raw) {
  return (raw || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function scoreText(text) {
  if (text.length < 120) return 0;
  const lower = text.toLowerCase();
  let score = Math.min(text.length, 8000);
  if (
    /responsibilities|requirements|qualifications|about the (role|job)|what you.?ll|we are looking|preferred qualifications/.test(
      lower,
    )
  ) {
    score += 1500;
  }
  if (/cookie|privacy policy|sign in|create account|accept all cookies/.test(lower) && text.length < 800) {
    score -= 2000;
  }
  return score;
}

function textFromHeadingSection(root) {
  const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4"));
  for (const h of headings) {
    const label = cleanText(h.textContent || "").toLowerCase();
    if (!/about the (job|role)|job description|responsibilities|what you.?ll do/.test(label)) {
      continue;
    }
    const parts = [];
    let el = h.nextElementSibling;
    let steps = 0;
    while (el && steps < 40) {
      const tag = el.tagName.toLowerCase();
      if (/^h[1-4]$/.test(tag)) break;
      parts.push(cleanText(el.innerText || el.textContent || ""));
      el = el.nextElementSibling;
      steps += 1;
    }
    const joined = cleanText(parts.join("\n\n"));
    if (joined.length > 120) return joined;
  }
  return "";
}

function extractJobDescription() {
  const selection = window.getSelection()?.toString();
  if (selection && cleanText(selection).length > 40) {
    return {
      text: cleanText(selection),
      source: "selection",
      title: document.title || "",
      url: location.href,
    };
  }

  const scratch = document.documentElement.cloneNode(true);
  scratch.querySelectorAll(STRIP).forEach((n) => n.remove());

  let best = { text: "", score: 0, source: "fallback" };

  for (const sel of SELECTORS) {
    const nodes = scratch.querySelectorAll(sel);
    for (const node of nodes) {
      const text = cleanText(node.innerText || node.textContent || "");
      const score = scoreText(text);
      if (score > best.score) {
        best = { text, score, source: sel };
      }
    }
  }

  const fromHeading = textFromHeadingSection(scratch);
  if (fromHeading) {
    const score = scoreText(fromHeading) + 500;
    if (score > best.score) {
      best = { text: fromHeading, score, source: "heading-section" };
    }
  }

  if (best.score < 200) {
    const bodyText = cleanText(scratch.querySelector("body")?.innerText || "");
    if (bodyText.length > best.text.length) {
      best = {
        text: bodyText.slice(0, 12000),
        score: bodyText.length,
        source: "body",
      };
    }
  }

  return {
    text: best.text.slice(0, 16000),
    source: best.source,
    title: document.title || "",
    url: location.href,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EXTRACT_JD") {
    try {
      const result = extractJobDescription();
      if (!result.text || result.text.length < 40) {
        sendResponse({ ok: false, error: "No job description text found on this page." });
      } else {
        sendResponse({ ok: true, ...result });
      }
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to read page",
      });
    }
    return true;
  }
  return false;
});
