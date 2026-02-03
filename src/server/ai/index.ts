/**
 * AI Module Exports
 *
 * Server-side AI utilities for generating content using Gemini.
 */

export {
  generateText,
  isGeminiConfigured,
  GeminiNotConfiguredError,
  GeminiApiError,
  GEMINI_MODEL,
  type GenerateTextOptions,
} from "./gemini";

export {
  buildReasonsWhyPrompt,
  type ReasonsWhyClientData,
  type ReasonsWhyFinancialData,
} from "./prompts/reasons-why";
