/**
 * Gemini AI Client
 *
 * Provides a simple interface for generating text using Google's Gemini API.
 * Uses the REST API directly to avoid additional dependencies.
 */

import { env } from "@/env";

/** Gemini model to use - Gemini 3 Flash Preview (best on free tier) */
const GEMINI_MODEL = "gemini-3-flash-preview";

/** Base URL for Gemini API */
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Error thrown when Gemini API is not configured
 */
export class GeminiNotConfiguredError extends Error {
  constructor() {
    super(
      "Gemini API key is not configured. Set GEMINI_API_KEY in your environment.",
    );
    this.name = "GeminiNotConfiguredError";
  }
}

/**
 * Error thrown when Gemini API request fails
 */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

/**
 * Response structure from Gemini API
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

/**
 * Options for text generation
 */
export interface GenerateTextOptions {
  /** The prompt to send to the model */
  prompt: string;
  /** Temperature for generation (0-2, default 1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxOutputTokens?: number;
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!env.GEMINI_API_KEY;
}

/**
 * Generate text using Gemini API
 *
 * @param options - Generation options including prompt
 * @returns Generated text
 * @throws {GeminiNotConfiguredError} If API key is not set
 * @throws {GeminiApiError} If API request fails
 */
export async function generateText(
  options: GenerateTextOptions,
): Promise<string> {
  const { prompt, temperature = 0.7, maxOutputTokens = 4096 } = options;

  if (!env.GEMINI_API_KEY) {
    throw new GeminiNotConfiguredError();
  }

  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = (await response.json()) as GeminiResponse;

  // Check for API errors
  if (data.error) {
    throw new GeminiApiError(
      data.error.message ?? "Unknown Gemini API error",
      data.error.code,
      data.error,
    );
  }

  if (!response.ok) {
    throw new GeminiApiError(
      `Gemini API request failed with status ${response.status}`,
      response.status,
    );
  }

  // Extract text from response
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new GeminiApiError("No text generated in response", undefined, data);
  }

  return text;
}
