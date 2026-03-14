import type { Database } from "@/server/db";
import { applicationEvent, type ApplicationStatus } from "@/server/db/schemas";

export type ApplicationEventSource =
  | "consumer"
  | "provider"
  | "system"
  | "webhook";

export interface ApplicationEventContext {
  actorUserId?: string | null;
  requestId?: string | null;
}

export interface RecordApplicationLifecycleEventInput {
  db: Pick<Database, "insert">;
  applicationId: string;
  status: ApplicationStatus;
  source: ApplicationEventSource;
  event: string;
  occurredAt?: Date;
  context?: ApplicationEventContext;
  metadata?: Record<string, unknown> | null;
}

const SENSITIVE_METADATA_KEYS = new Set([
  "address",
  "body",
  "dateofbirth",
  "dob",
  "email",
  "firstname",
  "lastname",
  "name",
  "password",
  "payload",
  "phone",
  "rawbody",
  "rawpayload",
  "secret",
  "sin",
  "socialsecurity",
  "socialsecuritynumber",
  "ssn",
  "token",
]);

function normalizeMetadataKey(key: string): string {
  return key.toLowerCase().replaceAll(/[_-]/g, "");
}

function isSensitiveMetadataKey(key: string): boolean {
  return SENSITIVE_METADATA_KEYS.has(normalizeMetadataKey(key));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function sanitizeApplicationEventValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeApplicationEventValue(item))
      .filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitizedEntries = Object.entries(value).flatMap(
    ([key, entryValue]) => {
      if (isSensitiveMetadataKey(key)) {
        return [];
      }

      const sanitizedValue = sanitizeApplicationEventValue(entryValue);
      if (sanitizedValue === undefined) {
        return [];
      }

      if (
        isPlainObject(sanitizedValue) &&
        Object.keys(sanitizedValue).length === 0
      ) {
        return [];
      }

      return [[key, sanitizedValue] as const];
    },
  );

  return Object.fromEntries(sanitizedEntries);
}

export function sanitizeApplicationEventMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }

  const sanitized = sanitizeApplicationEventValue(metadata);
  if (!isPlainObject(sanitized) || Object.keys(sanitized).length === 0) {
    return null;
  }

  return sanitized;
}

export function buildApplicationEventMetadata(
  event: string,
  context?: ApplicationEventContext,
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> {
  const sanitizedMetadata = sanitizeApplicationEventMetadata(metadata);
  const actorType = context?.actorUserId ? "user" : "system";

  const baseMetadata: Record<string, unknown> = {
    event,
    actorType,
    actorUserId: context?.actorUserId ?? undefined,
    requestId: context?.requestId ?? undefined,
  };

  if (sanitizedMetadata) {
    Object.assign(baseMetadata, sanitizedMetadata);
  }

  return Object.fromEntries(
    Object.entries(baseMetadata).filter(([, value]) => value !== undefined),
  );
}

export async function recordApplicationLifecycleEvent(
  input: RecordApplicationLifecycleEventInput,
): Promise<void> {
  const metadata = buildApplicationEventMetadata(
    input.event,
    input.context,
    input.metadata,
  );

  try {
    await input.db
      .insert(applicationEvent)
      .values({
        applicationId: input.applicationId,
        status: input.status,
        source: input.source,
        occurredAt: input.occurredAt,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      })
      .returning();
  } catch (error) {
    console.error(
      "[ApplicationEvent] Failed to record lifecycle event:",
      error,
    );
  }
}
