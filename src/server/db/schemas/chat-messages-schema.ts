/**
 * @fileoverview Per-client AI chat message persistence.
 *
 * Stores advisor<->assistant messages tied to a client, enabling:
 * - chat history retrieval per client
 * - token usage tracking
 * - auditing conversational interactions
 */

import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { client } from "./clients-schema";
import { primaryId, timestampsCreatedOnly } from "./schema-helpers";

// ============================================================================
// CHAT MESSAGE ENTITY
// ============================================================================

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const clientChatMessage = pgTable(
  "client_chat_message",
  {
    id: primaryId(),

    /** Client this message belongs to */
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),

    /** Advisor account that initiated this conversation */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /** Sender role */
    role: chatRoleEnum("role").notNull(),

    /** Message body */
    content: text("content").notNull(),

    /** AI model identifier (assistant messages only) */
    model: text("model"),

    /** Estimated prompt tokens (assistant messages only) */
    promptTokens: integer("prompt_tokens"),

    /** Estimated completion tokens (assistant messages only) */
    completionTokens: integer("completion_tokens"),

    /** Estimated total tokens (assistant messages only) */
    totalTokens: integer("total_tokens"),

    /** Guardrail/rate-limit note when applicable */
    metadata: text("metadata"),

    ...timestampsCreatedOnly(),

    /** Message timestamp optimized for timeline rendering */
    sentAt: timestamp("sent_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index("client_chat_message_client_id_sent_at_idx").on(t.clientId, t.sentAt),
    index("client_chat_message_user_id_sent_at_idx").on(t.userId, t.sentAt),
    index("client_chat_message_role_idx").on(t.role),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const clientChatMessageRelations = relations(
  clientChatMessage,
  ({ one }) => ({
    client: one(client, {
      fields: [clientChatMessage.clientId],
      references: [client.id],
    }),
    user: one(user, {
      fields: [clientChatMessage.userId],
      references: [user.id],
    }),
  }),
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ClientChatMessage = typeof clientChatMessage.$inferSelect;
export type ClientChatMessageInsert = typeof clientChatMessage.$inferInsert;
export type ChatRole = (typeof chatRoleEnum.enumValues)[number];
