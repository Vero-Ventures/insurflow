/**
 * @fileoverview D2C Resume Link helper functions.
 *
 * Provides secure token generation and verification for D2C save/resume links.
 * Designed to be pure and side-effect free where possible, with database
 * operations isolated to specific functions.
 */

import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db";
import { client, d2cResumeLink } from "@/server/db/schemas";
import {
  RESUME_LINK_TTL_MS,
  type ResumeLinkVerifyResponse,
} from "@/lib/validation/d2c-resume-link";

/**
 * Generates a cryptographically secure, URL-safe token.
 * Uses 32 bytes of random data encoded as base64url (no padding).
 *
 * @returns A 43-character URL-safe token
 */
export function generateSecureToken(): string {
  const buffer = randomBytes(32);
  // Convert to base64url (URL-safe base64 without padding)
  return buffer.toString("base64url");
}

/**
 * Calculates the expiration timestamp for a resume link.
 *
 * @param fromDate - The starting date (defaults to now)
 * @returns The expiration date (24 hours from the start)
 */
export function calculateExpiry(fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + RESUME_LINK_TTL_MS);
}

/**
 * Checks if a resume link has expired.
 *
 * @param expiresAt - The expiration timestamp
 * @param now - The current time (defaults to now, injectable for testing)
 * @returns true if the link has expired
 */
export function isLinkExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return now >= expiresAt;
}

/**
 * Builds the relative resume URL for a token.
 *
 * @param token - The resume link token
 * @returns The relative URL path for resuming
 */
export function buildResumeUrl(token: string): string {
  return `/d2c/resume/${token}`;
}

/**
 * Result type for resume link creation
 */
export interface CreateResumeLinkResult {
  success: true;
  token: string;
  expiresAt: Date;
  resumeUrl: string;
}

export interface CreateResumeLinkError {
  success: false;
  errorCode: "CLIENT_NOT_FOUND" | "CLIENT_NOT_DRAFT" | "UNAUTHORIZED";
  message: string;
}

/**
 * Creates a new resume link for a draft client.
 *
 * Security checks:
 * - Client must exist and not be soft-deleted
 * - Client must be owned by the requesting user
 * - Client must be in "draft" status
 *
 * @param clientId - The client ID to create a resume link for
 * @param userId - The user ID requesting the link (must own the client)
 * @returns The created resume link details or an error
 */
export async function createResumeLink(
  clientId: string,
  userId: string,
): Promise<CreateResumeLinkResult | CreateResumeLinkError> {
  const db = getDb();

  // Verify client exists, is owned by user, and is in draft status
  const foundClient = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      isNull(client.deletedAt),
    ),
    columns: {
      id: true,
      status: true,
    },
  });

  if (!foundClient) {
    return {
      success: false,
      errorCode: "CLIENT_NOT_FOUND",
      message: "Client not found or you do not have access",
    };
  }

  if (foundClient.status !== "draft") {
    return {
      success: false,
      errorCode: "CLIENT_NOT_DRAFT",
      message: "Resume links can only be created for draft clients",
    };
  }

  // Generate secure token and calculate expiry
  const token = generateSecureToken();
  const expiresAt = calculateExpiry();

  // Insert the resume link
  await db.insert(d2cResumeLink).values({
    token,
    clientId,
    userId,
    expiresAt,
  });

  return {
    success: true,
    token,
    expiresAt,
    resumeUrl: buildResumeUrl(token),
  };
}

/**
 * Result type for resume link verification
 */
export interface VerifyResumeLinkResult {
  valid: true;
  clientId: string;
  linkId: string;
}

export interface VerifyResumeLinkError {
  valid: false;
  errorCode: ResumeLinkVerifyResponse["errorCode"];
  message: string;
}

/**
 * Verifies a resume link token and returns the associated client info.
 *
 * Checks:
 * - Token exists in the database
 * - Token has not expired
 * - Token has not been used
 * - Associated client is still in draft status
 * - Requesting user owns the client
 *
 * @param token - The resume link token
 * @param userId - The user ID attempting to use the link
 * @returns Verification result with client info or error
 */
export async function verifyResumeLink(
  token: string,
  userId: string,
): Promise<VerifyResumeLinkResult | VerifyResumeLinkError> {
  const db = getDb();

  // Find the resume link
  const link = await db.query.d2cResumeLink.findFirst({
    where: eq(d2cResumeLink.token, token),
    columns: {
      id: true,
      clientId: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!link) {
    return {
      valid: false,
      errorCode: "NOT_FOUND",
      message: "Resume link not found or has been revoked",
    };
  }

  // Check authorization - link must belong to the requesting user
  if (link.userId !== userId) {
    return {
      valid: false,
      errorCode: "UNAUTHORIZED",
      message: "You are not authorized to use this resume link",
    };
  }

  // Check expiration
  if (isLinkExpired(link.expiresAt)) {
    return {
      valid: false,
      errorCode: "EXPIRED",
      message: "This resume link has expired. Please create a new one.",
    };
  }

  // Check if already used
  if (link.usedAt) {
    return {
      valid: false,
      errorCode: "ALREADY_USED",
      message: "This resume link has already been used",
    };
  }

  // Verify client is still in draft status
  const foundClient = await db.query.client.findFirst({
    where: and(eq(client.id, link.clientId), isNull(client.deletedAt)),
    columns: {
      id: true,
      status: true,
    },
  });

  if (!foundClient || foundClient.status !== "draft") {
    return {
      valid: false,
      errorCode: "CLIENT_NOT_DRAFT",
      message: "The associated application is no longer in draft status",
    };
  }

  return {
    valid: true,
    clientId: link.clientId,
    linkId: link.id,
  };
}

/**
 * Marks a resume link as used.
 *
 * Should be called after successfully resuming a draft to prevent reuse.
 *
 * @param linkId - The resume link ID to mark as used
 */
export async function markResumeLinkUsed(linkId: string): Promise<void> {
  const db = getDb();

  await db
    .update(d2cResumeLink)
    .set({ usedAt: new Date() })
    .where(eq(d2cResumeLink.id, linkId));
}

/**
 * Invalidates all active resume links for a client.
 *
 * Should be called when a draft is completed or deleted.
 *
 * @param clientId - The client ID to invalidate links for
 */
export async function invalidateClientResumeLinks(
  clientId: string,
): Promise<void> {
  const db = getDb();

  // Mark all unused links as used (effectively invalidating them)
  await db
    .update(d2cResumeLink)
    .set({ usedAt: new Date() })
    .where(
      and(eq(d2cResumeLink.clientId, clientId), isNull(d2cResumeLink.usedAt)),
    );
}
