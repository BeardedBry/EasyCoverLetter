export type LetterLength = "short" | "medium" | "long";
export type LetterTone = "casual" | "informal" | "formal";

export type GenerateRequest = {
  jobDescription: string;
  resume: string;
  extraPrompt?: string;
  length: LetterLength;
  tone: LetterTone;
};

export type GenerateResponse = {
  letter: string;
};

export type GenerateError = {
  error: string;
};
