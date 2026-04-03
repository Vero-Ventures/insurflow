/**
 * @fileoverview Queue-backed letter generation jobs.
 *
 * Stores async Reasons-Why letter generation requests so the Next.js app can
 * enqueue work quickly and a background worker can process it durably.
 */

import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { client } from "./clients-schema";
import { letterGenerationJobStatusEnum } from "./enums-schema";
import { primaryId, timestamps } from "./schema-helpers";

export const letterGenerationJob = pgTable(
  "letter_generation_job",
  {
    id: primaryId(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: letterGenerationJobStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    temperature: numeric("temperature", { precision: 3, scale: 2 }).notNull(),
    maxOutputTokens: integer("max_output_tokens").notNull(),
    resultLetter: text("result_letter"),
    resultGeneratedAt: timestamp("result_generated_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("letter_generation_job_status_idx").on(t.status),
    index("letter_generation_job_client_id_idx").on(t.clientId),
    index("letter_generation_job_user_id_idx").on(t.userId),
    index("letter_generation_job_status_requested_at_idx").on(
      t.status,
      t.requestedAt,
    ),
  ],
);

export const letterGenerationJobRelations = relations(
  letterGenerationJob,
  ({ one }) => ({
    client: one(client, {
      fields: [letterGenerationJob.clientId],
      references: [client.id],
    }),
    user: one(user, {
      fields: [letterGenerationJob.userId],
      references: [user.id],
    }),
  }),
);

export type LetterGenerationJob = typeof letterGenerationJob.$inferSelect;
export type LetterGenerationJobInsert = typeof letterGenerationJob.$inferInsert;
export type LetterGenerationJobStatus =
  (typeof letterGenerationJobStatusEnum.enumValues)[number];
