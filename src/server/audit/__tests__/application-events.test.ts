import { describe, expect, it } from "vitest";

import {
  buildApplicationEventMetadata,
  sanitizeApplicationEventMetadata,
} from "../application-events";

describe("sanitizeApplicationEventMetadata", () => {
  it("strips top-level and nested PII fields", () => {
    const result = sanitizeApplicationEventMetadata({
      providerKey: "mock",
      email: "user@example.com",
      details: {
        firstName: "Ada",
        previousStatus: "draft",
      },
    });

    expect(result).toEqual({
      providerKey: "mock",
      details: {
        previousStatus: "draft",
      },
    });
  });

  it("converts dates and removes empty nested objects", () => {
    const result = sanitizeApplicationEventMetadata({
      occurredAt: new Date("2026-03-01T10:00:00.000Z"),
      nested: {
        rawBody: "secret",
      },
    });

    expect(result).toEqual({
      occurredAt: "2026-03-01T10:00:00.000Z",
    });
  });
});

describe("buildApplicationEventMetadata", () => {
  it("adds correlation and actor fields around sanitized metadata", () => {
    const result = buildApplicationEventMetadata(
      "submission_attempted",
      {
        actorUserId: "user-123",
        requestId: "req-456",
      },
      {
        providerEventId: "evt-1",
        ssn: "123-45-6789",
      },
    );

    expect(result).toEqual({
      event: "submission_attempted",
      actorType: "user",
      actorUserId: "user-123",
      requestId: "req-456",
      providerEventId: "evt-1",
    });
  });

  it("defaults actorType to system when no actor user is present", () => {
    const result = buildApplicationEventMetadata(
      "webhook_received",
      undefined,
      {
        providerKey: "mock",
      },
    );

    expect(result).toEqual({
      event: "webhook_received",
      actorType: "system",
      providerKey: "mock",
    });
  });
});
