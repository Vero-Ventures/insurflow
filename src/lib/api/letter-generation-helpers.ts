import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "@/server/db";
import { letterGenerationJob } from "@/server/db/schemas";

interface EnqueueLetterGenerationJobInput {
  clientId: string;
  userId: string;
  prompt: string;
  model: string;
  temperature: string;
  maxOutputTokens: number;
}

interface FindLetterGenerationJobInput {
  jobId: string;
  clientId: string;
  userId: string;
}

export async function enqueueLetterGenerationJob(
  db: Database,
  input: EnqueueLetterGenerationJobInput,
) {
  const [job] = await db
    .insert(letterGenerationJob)
    .values({
      clientId: input.clientId,
      userId: input.userId,
      status: "queued",
      prompt: input.prompt,
      model: input.model,
      temperature: input.temperature,
      maxOutputTokens: input.maxOutputTokens,
    })
    .returning();

  if (!job) {
    throw new Error("Failed to enqueue letter generation job");
  }

  return job;
}

export async function findLetterGenerationJob(
  db: Database,
  input: FindLetterGenerationJobInput,
) {
  return db.query.letterGenerationJob.findFirst({
    where: and(
      eq(letterGenerationJob.id, input.jobId),
      eq(letterGenerationJob.clientId, input.clientId),
      eq(letterGenerationJob.userId, input.userId),
      isNull(letterGenerationJob.deletedAt),
    ),
  });
}
