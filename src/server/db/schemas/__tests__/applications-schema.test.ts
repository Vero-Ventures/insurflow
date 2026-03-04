/**
 * @fileoverview Unit tests for the applications schema definitions.
 *
 * Tests cover:
 * - applicationStatusEnum values match the issue #267 spec
 * - application table: required columns, nullability, defaults, indexes
 * - applicationEvent table: required columns, immutability (no soft delete)
 * - Idempotency key unique constraint is enforced at DB level
 * - Type inference produces the expected shapes
 *
 * These tests are pure schema introspection — no database connection is needed.
 */

import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

import {
  application,
  applicationEvent,
  type Application,
  type ApplicationInsert,
  type ApplicationEvent,
  type ApplicationEventInsert,
  type ApplicationStatus,
} from "../applications-schema";
import { applicationStatusEnum } from "../enums-schema";

// ============================================================================
// applicationStatusEnum
// ============================================================================

describe("applicationStatusEnum", () => {
  const EXPECTED_STATUSES: ApplicationStatus[] = [
    "draft",
    "submitted",
    "received",
    "in_review",
    "additional_info_requested",
    "approved",
    "declined",
  ];

  it("contains all 7 required lifecycle statuses", () => {
    expect(applicationStatusEnum.enumValues).toHaveLength(7);
  });

  it("contains every expected status value", () => {
    for (const status of EXPECTED_STATUSES) {
      expect(applicationStatusEnum.enumValues).toContain(status);
    }
  });

  it("starts with draft and includes terminal states approved/declined", () => {
    expect(applicationStatusEnum.enumValues[0]).toBe("draft");
    expect(applicationStatusEnum.enumValues).toContain("approved");
    expect(applicationStatusEnum.enumValues).toContain("declined");
  });
});

// ============================================================================
// application table
// ============================================================================

describe("application table", () => {
  const columns = getTableColumns(application);
  const config = getTableConfig(application);

  it("has the correct table name", () => {
    expect(config.name).toBe("application");
  });

  it("has all required columns", () => {
    const requiredColumns = [
      "id",
      "client_id",
      "user_id",
      "idempotency_key",
      "provider_key",
      "provider_application_id",
      "status",
      "consent_captured_at",
      "submitted_at",
      "created_at",
      "updated_at",
      "deleted_at",
    ];
    const columnNames = Object.values(columns).map((c) => c.name);
    for (const col of requiredColumns) {
      expect(columnNames, `expected column "${col}" to exist`).toContain(col);
    }
  });

  it("status column defaults to 'draft'", () => {
    expect(columns.status.default).toBe("draft");
  });

  it("status column is non-nullable", () => {
    expect(columns.status.notNull).toBe(true);
  });

  it("clientId column is non-nullable", () => {
    expect(columns.clientId.notNull).toBe(true);
  });

  it("userId column is non-nullable", () => {
    expect(columns.userId.notNull).toBe(true);
  });

  it("idempotencyKey column is nullable (not required at draft creation)", () => {
    expect(columns.idempotencyKey.notNull).toBeFalsy();
  });

  it("submittedAt column is nullable (null on drafts)", () => {
    expect(columns.submittedAt.notNull).toBeFalsy();
  });

  it("consentCapturedAt column is nullable", () => {
    expect(columns.consentCapturedAt.notNull).toBeFalsy();
  });

  it("providerKey column is nullable (null before submission)", () => {
    expect(columns.providerKey.notNull).toBeFalsy();
  });

  it("providerApplicationId column is nullable (null before provider confirms)", () => {
    expect(columns.providerApplicationId.notNull).toBeFalsy();
  });

  it("has soft-delete support via deletedAt", () => {
    const columnNames = Object.values(columns).map((c) => c.name);
    expect(columnNames).toContain("deleted_at");
  });

  it("enforces a unique constraint on idempotencyKey at DB level", () => {
    const uniqueConstraints = config.uniqueConstraints;
    const idempotencyUniqueConstraint = uniqueConstraints.find((u) =>
      u.columns.some((c) => c.name === "idempotency_key"),
    );
    expect(
      idempotencyUniqueConstraint,
      "idempotency_key must have a unique constraint",
    ).toBeDefined();
  });

  it("has indexes on clientId, userId, status, and soft-delete composite", () => {
    const indexedColumnSets = config.indexes.map((idx) =>
      idx.config.columns.map((c) =>
        typeof c === "string" ? c : (c as { name: string }).name,
      ),
    );
    expect(indexedColumnSets.some((cols) => cols.includes("client_id"))).toBe(
      true,
    );
    expect(indexedColumnSets.some((cols) => cols.includes("user_id"))).toBe(
      true,
    );
    expect(indexedColumnSets.some((cols) => cols.includes("status"))).toBe(
      true,
    );
    // Composite index for filtered queries on client's non-deleted applications
    expect(
      indexedColumnSets.some(
        (cols) => cols.includes("client_id") && cols.includes("deleted_at"),
      ),
    ).toBe(true);
  });
});

// ============================================================================
// applicationEvent table
// ============================================================================

describe("applicationEvent table", () => {
  const columns = getTableColumns(applicationEvent);
  const config = getTableConfig(applicationEvent);

  it("has the correct table name", () => {
    expect(config.name).toBe("application_event");
  });

  it("has all required columns", () => {
    const requiredColumns = [
      "id",
      "application_id",
      "status",
      "source",
      "occurred_at",
      "metadata",
      "created_at",
      "updated_at",
    ];
    const columnNames = Object.values(columns).map((c) => c.name);
    for (const col of requiredColumns) {
      expect(columnNames, `expected column "${col}" to exist`).toContain(col);
    }
  });

  it("does NOT have soft-delete (immutable event log)", () => {
    const columnNames = Object.values(columns).map((c) => c.name);
    expect(columnNames).not.toContain("deleted_at");
  });

  it("applicationId column is non-nullable", () => {
    expect(columns.applicationId.notNull).toBe(true);
  });

  it("status column is non-nullable", () => {
    expect(columns.status.notNull).toBe(true);
  });

  it("source column is non-nullable", () => {
    expect(columns.source.notNull).toBe(true);
  });

  it("occurredAt column is non-nullable with a default", () => {
    expect(columns.occurredAt.notNull).toBe(true);
    expect(columns.occurredAt.hasDefault).toBe(true);
  });

  it("metadata column is nullable (optional sanitized context)", () => {
    expect(columns.metadata.notNull).toBeFalsy();
  });

  it("has index on applicationId for timeline queries", () => {
    const indexedColumnSets = config.indexes.map((idx) =>
      idx.config.columns.map((c) =>
        typeof c === "string" ? c : (c as { name: string }).name,
      ),
    );
    expect(
      indexedColumnSets.some((cols) => cols.includes("application_id")),
    ).toBe(true);
  });

  it("has index on occurredAt for time-ordered queries", () => {
    const indexedColumnSets = config.indexes.map((idx) =>
      idx.config.columns.map((c) =>
        typeof c === "string" ? c : (c as { name: string }).name,
      ),
    );
    expect(indexedColumnSets.some((cols) => cols.includes("occurred_at"))).toBe(
      true,
    );
  });
});

// ============================================================================
// Type shape tests (compile-time — if these compile, the types are correct)
// ============================================================================

describe("type inference", () => {
  it("Application select type includes all expected fields", () => {
    // This test is intentionally compile-time only.
    // If the type is wrong, TypeScript will fail the build, not this assertion.
    const _typeCheck = (a: Application) => {
      const _id: string = a.id;
      const _clientId: string = a.clientId;
      const _userId: string = a.userId;
      const _status: ApplicationStatus = a.status;
      const _idempotencyKey: string | null = a.idempotencyKey;
      const _submittedAt: Date | null = a.submittedAt;
      const _consentCapturedAt: Date | null = a.consentCapturedAt;
      const _providerKey: string | null = a.providerKey;
      const _providerApplicationId: string | null = a.providerApplicationId;
      const _deletedAt: Date | null = a.deletedAt;
      void [
        _id,
        _clientId,
        _userId,
        _status,
        _idempotencyKey,
        _submittedAt,
        _consentCapturedAt,
        _providerKey,
        _providerApplicationId,
        _deletedAt,
      ];
    };
    expect(_typeCheck).toBeDefined();
  });

  it("ApplicationInsert type makes status optional (has default)", () => {
    // status has a default of "draft", so it should be optional in inserts
    const _typeCheck = (a: ApplicationInsert) => {
      // status is optional on insert — TypeScript would error if we tried to
      // assign undefined to a required field
      const _withoutStatus: ApplicationInsert = {
        clientId: "uuid",
        userId: "user-id",
      };
      void [_withoutStatus, a];
    };
    expect(_typeCheck).toBeDefined();
  });

  it("ApplicationEvent select type includes all expected fields", () => {
    const _typeCheck = (e: ApplicationEvent) => {
      const _id: string = e.id;
      const _applicationId: string = e.applicationId;
      const _status: ApplicationStatus = e.status;
      const _source: string = e.source;
      const _occurredAt: Date = e.occurredAt;
      const _metadata: Record<string, unknown> | null | undefined = e.metadata;
      void [_id, _applicationId, _status, _source, _occurredAt, _metadata];
    };
    expect(_typeCheck).toBeDefined();
  });

  it("ApplicationEvent type does NOT include deletedAt", () => {
    // Compile-time check: this would be a TS error if deletedAt existed on the type
    const _typeCheck = (e: ApplicationEventInsert) => {
      // @ts-expect-error — deletedAt must not exist on applicationEvent
      const _bad = e.deletedAt;
      void _bad;
    };
    expect(_typeCheck).toBeDefined();
  });
});
