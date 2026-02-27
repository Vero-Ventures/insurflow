import { beforeEach, describe, expect, it, vi } from "vitest";

const parseJsonBodyMock = vi.fn();
const handleValidationErrorMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/api/route-helpers", () => ({
  withApiHandler: (
    _config: unknown,
    handler: (
      request: Request,
      context: {
        logger: {
          info: (...args: unknown[]) => Promise<void>;
          warn: (...args: unknown[]) => Promise<void>;
          error: (...args: unknown[]) => Promise<void>;
        };
        session: {
          user: { id?: string; name?: string | null };
          session?: { userId?: string };
        };
      },
    ) => Promise<Response | { data: unknown; status?: number }>,
  ) => {
    return async (request: Request) => {
      const logger = {
        info: vi.fn().mockResolvedValue(undefined),
        warn: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
      };

      const result = await handler(request, {
        logger,
        session: {
          user: { name: "Advisor" },
          session: { userId: "user-123" },
        },
      });

      if (result instanceof Response) {
        return result;
      }

      return Response.json(result.data, { status: result.status ?? 200 });
    };
  },
  parseJsonBody: parseJsonBodyMock,
  handleValidationError: handleValidationErrorMock,
}));

vi.mock("@/server/db", () => ({
  getDb: () => ({
    insert: insertMock,
    update: updateMock,
    query: {
      userProfile: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  }),
}));

vi.mock("@/server/db/schemas/user-profile-schema", () => ({
  userProfile: {
    userId: "user_id_column",
  },
}));

vi.mock("@/server/db/schemas/auth-schema", () => ({
  user: undefined,
}));

describe("PUT /api/onboarding/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    parseJsonBodyMock.mockResolvedValue({
      body: {
        firstName: "Ada",
        lastName: "Lovelace",
        state: "CA",
        householdStatus: "single",
        primaryGoal: "family_protection",
        communicationPreference: "email",
        accountType: "advisor",
      },
    });

    insertMock.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });

    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("returns success even when auth user table is unavailable", async () => {
    const { PUT } = await import("./route");

    const response = await PUT(
      new Request("http://localhost/api/onboarding", {
        method: "PUT",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isComplete).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
