/**
 * @fileoverview D2C Resume Link schema for save/resume functionality.
 *
 * Enables consumers to generate secure, time-limited links to resume
 * in-progress D2C intake/application flows. Links expire after 24 hours
 * and are authenticated to the draft owner.
 */

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./auth-schema";
import { client } from "./clients-schema";
import { primaryId } from "./schema-helpers";

// ============================================================================
// D2C RESUME LINK ENTITY
// ============================================================================

/**
 * D2C Resume Link for save/resume functionality.
 *
 * Security model:
 * - Token is a cryptographically secure random string (URL-safe)
 * - Link expires after 24 hours (TTL)
 * - Access requires authentication as the draft owner
 * - Token is single-use indicator via usedAt timestamp
 */
export const d2cResumeLink = pgTable(
  "d2c_resume_link",
  {
    id: primaryId(),

    /** The secure token used in the resume URL (URL-safe base64, 32 bytes) */
    token: text("token").notNull().unique(),

    /** Reference to the draft client record */
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    /** Owner of the draft - required for authorization */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /** Timestamp when the link expires (24 hours from creation) */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    /** Timestamp when the link was used (null if unused) */
    usedAt: timestamp("used_at", { withTimezone: true }),

    /** Timestamp when the link was created */
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // Note: token already has unique constraint which creates an index
    // Find links by user (for management/cleanup)
    index("d2c_resume_link_user_id_idx").on(t.userId),
    // Find links by client (for cleanup on draft deletion)
    index("d2c_resume_link_client_id_idx").on(t.clientId),
    // Cleanup expired links
    index("d2c_resume_link_expires_at_idx").on(t.expiresAt),
  ],
);

// ============================================================================
// D2C RESUME LINK RELATIONS
// ============================================================================

export const d2cResumeLinkRelations = relations(d2cResumeLink, ({ one }) => ({
  client: one(client, {
    fields: [d2cResumeLink.clientId],
    references: [client.id],
  }),
  user: one(user, {
    fields: [d2cResumeLink.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type D2cResumeLink = typeof d2cResumeLink.$inferSelect;
export type D2cResumeLinkInsert = typeof d2cResumeLink.$inferInsert;
