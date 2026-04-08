import { expect, vi } from "vitest";

export const TEST_CLIENT_ID = "client-123";
export const TEST_USER_ID = "user-123";
export const TEST_UUID_CLIENT_ID = "550e8400-e29b-41d4-a716-446655440001";
export const TEST_UUID_JOB_ID = "550e8400-e29b-41d4-a716-446655440099";

export const assetSchemaMock = {
  currentValue: "currentValue",
  isLiquid: "isLiquid",
  clientId: "clientId",
  deletedAt: "deletedAt",
};

export const clientSchemaMock = {
  id: "id",
  userId: "userId",
  deletedAt: "deletedAt",
};

export const debtSchemaMock = {
  currentBalance: "currentBalance",
  clientId: "clientId",
  deletedAt: "deletedAt",
};

export const policySchemaMock = {
  status: "status",
  faceAmount: "faceAmount",
  clientId: "clientId",
  deletedAt: "deletedAt",
};

export function createAsyncLoggerMock() {
  return {
    addContext: vi.fn(),
    error: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
  };
}

export function createWithApiHandlerMock<TContext extends object>(
  context: TContext,
) {
  return (
    _config: unknown,
    handler: (
      request: Request,
      context: TContext,
    ) => Promise<Response | { data: unknown; status?: number }>,
  ) => {
    return async (request: Request) => {
      const result = await handler(request, context);

      if (result instanceof Response) {
        return result;
      }

      return Response.json(result.data, { status: result.status ?? 200 });
    };
  };
}

export function createSqlMock(options?: { withAlias?: boolean }) {
  const withAlias = options?.withAlias ?? false;

  return Object.assign(
    (strings: TemplateStringsArray) => {
      const sql = strings.join("");
      return withAlias ? { as: () => sql } : sql;
    },
    {
      raw: vi.fn(),
    },
  );
}

export function createGetDbModule(getDbMock: ReturnType<typeof vi.fn>) {
  return { getDb: getDbMock };
}

export function createBasicClientSchemasModule() {
  return {
    asset: assetSchemaMock,
    client: clientSchemaMock,
    debt: debtSchemaMock,
  };
}

export function createBasicDrizzleModule(options?: { withAlias?: boolean }) {
  return {
    and: vi.fn(() => "and"),
    eq: vi.fn(() => "eq"),
    isNull: vi.fn(() => "isNull"),
    sql: createSqlMock(options),
  };
}

export function expectCapturedAnalyticsEvent(
  analyticsMock: ReturnType<typeof vi.fn>,
  expected: {
    distinctId: string;
    event: string;
    feature: string;
    outcome: string;
    route: string;
  },
) {
  expect(analyticsMock).toHaveBeenCalledWith(
    expect.objectContaining({
      distinctId: expected.distinctId,
      event: expected.event,
      properties: expect.objectContaining({
        feature: expected.feature,
        outcome: expected.outcome,
        route: expected.route,
      }),
    }),
  );
}

export async function expectTrackedGetResponse(input: {
  getHandler: (
    request: Request,
    context: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  analyticsMock: ReturnType<typeof vi.fn>;
  feature: string;
  route: string;
  event?: string;
  id?: string;
  distinctId?: string;
}) {
  const response = await input.getHandler(
    new Request("http://localhost/api/test"),
    {
      params: Promise.resolve({ id: input.id ?? TEST_CLIENT_ID }),
    },
  );

  expect(response.status).toBe(200);
  expectCapturedAnalyticsEvent(input.analyticsMock, {
    distinctId: input.distinctId ?? TEST_USER_ID,
    event: input.event ?? "report_pdf_generated",
    feature: input.feature,
    outcome: "completed",
    route: input.route,
  });

  return response;
}
