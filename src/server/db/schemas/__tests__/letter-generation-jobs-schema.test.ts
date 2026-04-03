import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

import {
  letterGenerationJob,
  type LetterGenerationJobStatus,
} from "../letter-generation-jobs-schema";
import { letterGenerationJobStatusEnum } from "../enums-schema";

describe("letterGenerationJobStatusEnum", () => {
  const EXPECTED_STATUSES: LetterGenerationJobStatus[] = [
    "queued",
    "processing",
    "completed",
    "failed",
  ];

  it("contains the expected job lifecycle statuses", () => {
    expect(letterGenerationJobStatusEnum.enumValues).toEqual(EXPECTED_STATUSES);
  });
});

describe("letterGenerationJob table", () => {
  const columns = getTableColumns(letterGenerationJob);
  const config = getTableConfig(letterGenerationJob);

  it("has the correct table name", () => {
    expect(config.name).toBe("letter_generation_job");
  });

  it("includes the required queue and result columns", () => {
    const requiredColumns = [
      "id",
      "client_id",
      "user_id",
      "status",
      "attempts",
      "max_attempts",
      "prompt",
      "model",
      "result_letter",
      "result_generated_at",
      "error_code",
      "error_message",
      "requested_at",
      "started_at",
      "completed_at",
      "failed_at",
      "created_at",
      "updated_at",
      "deleted_at",
    ];
    const columnNames = Object.values(columns).map(
      (column) => column.name as string,
    );

    for (const columnName of requiredColumns) {
      expect(columnNames).toContain(columnName);
    }
  });

  it("defaults status to queued", () => {
    expect(columns.status.default).toBe("queued");
  });

  it("tracks attempts with a non-null default", () => {
    expect(columns.attempts.notNull).toBe(true);
    expect(columns.maxAttempts.notNull).toBe(true);
    expect(columns.attempts.default).toBe(0);
    expect(columns.maxAttempts.default).toBe(3);
  });

  it("stores prompt and model as required fields", () => {
    expect(columns.prompt.notNull).toBe(true);
    expect(columns.model.notNull).toBe(true);
  });

  it("keeps result and failure fields nullable until processing finishes", () => {
    expect(columns.resultLetter.notNull).toBeFalsy();
    expect(columns.resultGeneratedAt.notNull).toBeFalsy();
    expect(columns.errorCode.notNull).toBeFalsy();
    expect(columns.errorMessage.notNull).toBeFalsy();
  });

  it("has indexes for queue claims and client lookups", () => {
    const indexedColumnSets = config.indexes.map((idx) =>
      idx.config.columns.map((column) =>
        typeof column === "string" ? column : (column as { name: string }).name,
      ),
    );

    expect(indexedColumnSets.some((cols) => cols.includes("status"))).toBe(
      true,
    );
    expect(indexedColumnSets.some((cols) => cols.includes("client_id"))).toBe(
      true,
    );
    expect(indexedColumnSets.some((cols) => cols.includes("user_id"))).toBe(
      true,
    );
    expect(
      indexedColumnSets.some(
        (cols) => cols.includes("status") && cols.includes("requested_at"),
      ),
    ).toBe(true);
  });
});
