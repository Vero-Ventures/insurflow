/**
 * @fileoverview Validation schemas for D2C resume link functionality.
 *
 * Provides Zod schemas for:
 * - Creating resume links (request body validation)
 * - Resume link tokens (URL parameter validation)
 * - Response payloads
 */

import { z } from "zod";
import { UUID_REGEX } from "./client";

/**
 * Resume link token format: URL-safe base64, 43 characters (32 bytes encoded)
 */
export const RESUME_LINK_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

/**
 * TTL for resume links in milliseconds (24 hours)
 */
export const RESUME_LINK_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * TTL for resume links in hours (for display purposes)
 */
export const RESUME_LINK_TTL_HOURS = 24;

/**
 * Schema for creating a resume link
 */
export const createResumeLinkSchema = z.object({
  /** The draft client ID to create a resume link for */
  clientId: z.string().regex(UUID_REGEX, "Invalid client ID format"),
});

/**
 * Schema for resume link token path parameter
 */
export const resumeLinkTokenSchema = z
  .string()
  .regex(RESUME_LINK_TOKEN_REGEX, "Invalid resume link token format");

/**
 * Schema for resume link verification response
 */
export const resumeLinkVerifyResponseSchema = z.object({
  /** Whether the link is valid */
  valid: z.boolean(),
  /** The client ID if valid */
  clientId: z.string().uuid().optional(),
  /** Error code if invalid */
  errorCode: z
    .enum([
      "EXPIRED",
      "NOT_FOUND",
      "ALREADY_USED",
      "CLIENT_NOT_DRAFT",
      "UNAUTHORIZED",
    ])
    .optional(),
  /** Human-readable error message */
  message: z.string().optional(),
});

/**
 * Schema for create resume link response
 */
export const createResumeLinkResponseSchema = z.object({
  /** The generated token */
  token: z.string(),
  /** When the link expires */
  expiresAt: z.string().datetime(),
  /** Full resume URL (relative) */
  resumeUrl: z.string(),
});

// Type exports
export type CreateResumeLinkInput = z.infer<typeof createResumeLinkSchema>;
export type ResumeLinkVerifyResponse = z.infer<
  typeof resumeLinkVerifyResponseSchema
>;
export type CreateResumeLinkResponse = z.infer<
  typeof createResumeLinkResponseSchema
>;
