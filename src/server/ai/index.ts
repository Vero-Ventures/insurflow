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
  type GenerateTextOptions,
} from "./gemini";

export {
  buildReasonsWhyPrompt,
  type ReasonsWhyClientData,
  type ReasonsWhyFinancialData,
} from "./prompts/reasons-why";
