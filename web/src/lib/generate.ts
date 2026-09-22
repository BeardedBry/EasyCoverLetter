import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import type { GenerateRequest } from "./types";

/**
 * Call OpenAI from the browser using the user's saved API key.
 * No local Next.js server is required.
 */
export async function generateCoverLetter(
  apiKey: string,
  req: GenerateRequest,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt(req) },
        { role: "user", content: buildUserPrompt(req) },
      ],
    }),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI error (${res.status})`);
  }

  const letter = data.choices?.[0]?.message?.content?.trim();
  if (!letter) {
    throw new Error("OpenAI returned an empty letter. Try again.");
  }
  return letter;
}
