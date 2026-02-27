import { describe, expect, it, vi } from "vitest";

import { getOwnedEntityIdsForAudit } from "@/lib/api/audit-helpers";

function createMockSelect(results: Array<Array<{ id: string }>>) {
  const queue = [...results];
  return vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async () => queue.shift() ?? []),
    })),
  }));
}

describe("getOwnedEntityIdsForAudit", () => {
  it("returns empty array when user has no clients", async () => {
    const select = createMockSelect([[]]);
    const db = { select } as unknown as Parameters<
      typeof getOwnedEntityIdsForAudit
    >[0];

    const entityIds = await getOwnedEntityIdsForAudit(db, "user-1");

    expect(entityIds).toEqual([]);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("collects client and nested entity ids", async () => {
    const select = createMockSelect([
      [{ id: "client-1" }],
      [{ id: "asset-1" }],
      [{ id: "debt-1" }],
      [{ id: "beneficiary-1" }],
      [{ id: "policy-1" }],
      [{ id: "business-1" }],
      [{ id: "allocation-1" }],
      [{ id: "key-1" }],
      [{ id: "shareholder-1" }],
      [{ id: "need-1" }],
    ]);
    const db = { select } as unknown as Parameters<
      typeof getOwnedEntityIdsForAudit
    >[0];

    const entityIds = await getOwnedEntityIdsForAudit(db, "user-1");

    expect(entityIds).toEqual([
      "client-1",
      "asset-1",
      "debt-1",
      "beneficiary-1",
      "policy-1",
      "business-1",
      "allocation-1",
      "key-1",
      "shareholder-1",
      "need-1",
    ]);
    expect(select).toHaveBeenCalledTimes(10);
  });

  it("deduplicates entity ids", async () => {
    const select = createMockSelect([
      [{ id: "client-1" }],
      [{ id: "x" }],
      [{ id: "x" }],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);
    const db = { select } as unknown as Parameters<
      typeof getOwnedEntityIdsForAudit
    >[0];

    const entityIds = await getOwnedEntityIdsForAudit(db, "user-1");

    expect(entityIds).toEqual(["client-1", "x"]);
  });
});
