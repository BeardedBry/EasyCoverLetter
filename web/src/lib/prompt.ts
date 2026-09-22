import type { GenerateRequest } from "./types";

const LENGTH_GUIDE = {
  short: "about 150–200 words (3 short paragraphs)",
  medium: "about 250–350 words (3–4 paragraphs)",
  long: "about 400–500 words (4–5 paragraphs)",
} as const;

const TONE_GUIDE = {
  casual: "warm and conversational, still professional enough for hiring",
  informal: "friendly and approachable without slang or jokes",
  formal: "polished, confident, and traditional business letter tone",
} as const;

export function buildSystemPrompt(req: GenerateRequest): string {
  return [
    "You write tailored cover letters for job applications.",
    "Use only facts supported by the resume; never invent employers, titles, skills, or degrees.",
    "Mirror language from the job description where it honestly fits the resume.",
    "Do not include a mailing address block, placeholders like [Your Name], or meta commentary.",
    "Start with a greeting (Dear Hiring Manager, or a named contact if present in the JD).",
    "End with a brief closing and the candidate's name if it appears in the resume.",
    `Length target: ${LENGTH_GUIDE[req.length]}.`,
    `Tone: ${TONE_GUIDE[req.tone]}.`,
  ].join(" ");
}

export function buildUserPrompt(req: GenerateRequest): string {
  const parts = [
    "## Job description",
    req.jobDescription.trim(),
    "",
    "## Resume",
    req.resume.trim(),
  ];
  if (req.extraPrompt?.trim()) {
    parts.push("", "## Extra instructions from the applicant", req.extraPrompt.trim());
  }
  parts.push("", "Write the cover letter now.");
  return parts.join("\n");
}
