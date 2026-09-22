/**
 * Heuristic job-description extraction from a Document (no AI).
 * Used by the PWA when a fetch is allowed; mirrored in extension/content.js.
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

export function cleanText(raw: string): string {
  return (raw || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function scoreText(text: string): number {
  if (text.length < 120) return 0;
  const lower = text.toLowerCase();
  let score = Math.min(text.length, 8000);
  if (
    /responsibilities|requirements|qualifications|about the (role|job)|what you.?ll|what you'll|we are looking|preferred qualifications/.test(
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

function textFromHeadingSection(doc: Document): string {
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3, h4"));
  for (const h of headings) {
    const label = cleanText(h.textContent || "").toLowerCase();
    if (!/about the (job|role)|job description|responsibilities|what you.?ll do/.test(label)) {
      continue;
    }
    const parts: string[] = [];
    let el: Element | null = h.nextElementSibling;
    let steps = 0;
    while (el && steps < 40) {
      const tag = el.tagName.toLowerCase();
      if (/^h[1-4]$/.test(tag)) break;
      parts.push(cleanText((el as HTMLElement).innerText || el.textContent || ""));
      el = el.nextElementSibling;
      steps += 1;
    }
    const joined = cleanText(parts.join("\n\n"));
    if (joined.length > 120) return joined;
  }
  return "";
}

export function extractJobDescriptionFromDocument(
  doc: Document,
  pageUrl = "",
): { text: string; source: string; title: string; url: string } {
  const clone = doc.cloneNode(true) as Document;
  clone.querySelectorAll(STRIP).forEach((n) => n.remove());

  let best = { text: "", score: 0, source: "fallback" };

  for (const sel of SELECTORS) {
    const nodes = clone.querySelectorAll(sel);
    for (const node of nodes) {
      const text = cleanText((node as HTMLElement).innerText || node.textContent || "");
      const score = scoreText(text);
      if (score > best.score) {
        best = { text, score, source: sel };
      }
    }
  }

  const fromHeading = textFromHeadingSection(clone);
  if (fromHeading) {
    const score = scoreText(fromHeading) + 500;
    if (score > best.score) {
      best = { text: fromHeading, score, source: "heading-section" };
    }
  }

  if (best.score < 200) {
    const bodyText = cleanText(clone.body?.innerText || clone.body?.textContent || "");
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
    title: cleanText(doc.title || ""),
    url: pageUrl,
  };
}

export type ScrapeResult =
  | { ok: true; text: string; source: string; title: string; url: string }
  | { ok: false; error: string };

/**
 * Best-effort browser fetch. Most job boards block CORS — callers should
 * surface a clear fallback (extension or paste).
 */
export async function scrapeJobUrlInBrowser(rawUrl: string): Promise<ScrapeResult> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "That doesn’t look like a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http(s) job links are supported." };
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      redirect: "follow",
    });
  } catch {
    return {
      ok: false,
      error:
        "This site blocked a browser fetch (CORS). Use the Chrome extension’s “Fetch from URL”, open the posting and Grab, or paste the text.",
    };
  }

  if (!res.ok) {
    return { ok: false, error: `Could not fetch the page (HTTP ${res.status}).` };
  }

  const contentType = res.headers.get("content-type") || "";
  if (!/html|text|xml/i.test(contentType) && contentType) {
    return { ok: false, error: "That URL didn’t return an HTML page." };
  }

  const html = await res.text();
  if (!html || html.length < 80) {
    return { ok: false, error: "The page response was empty." };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const extracted = extractJobDescriptionFromDocument(doc, url.toString());
  if (!extracted.text || extracted.text.length < 80) {
    return {
      ok: false,
      error:
        "Fetched the page but couldn’t find a job description. Paste the text, or use the Chrome extension on the live posting.",
    };
  }

  return { ok: true, ...extracted };
}
