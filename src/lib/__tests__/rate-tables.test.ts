import { describe, it, expect } from "vitest";
import {
  getStateRateTable,
  stateHasDeathTax,
  getStateTaxSummary,
} from "../transparency/rate-tables";

describe("getStateRateTable", () => {
  it("returns rate table for California", () => {
    const table = getStateRateTable("CA");
    expect(table.stateCode).toBe("CA");
    expect(table.stateName).toBe("California");
    expect(table.sections.length).toBeGreaterThan(0);
  });

  it("includes federal estate tax section for all states", () => {
    const table = getStateRateTable("TX");
    const federalSection = table.sections.find((s) =>
      s.title.includes("Federal"),
    );
    expect(federalSection).toBeDefined();
    expect(federalSection?.rows.length).toBeGreaterThan(0);
  });

  it("does not include US federal estate tax section for Canadian provinces", () => {
    const table = getStateRateTable("ON");
    const federalSection = table.sections.find((s) =>
      s.title.includes("Federal Estate Tax"),
    );
    expect(federalSection).toBeUndefined();
  });

  it("includes professional fees section", () => {
    const table = getStateRateTable("NY");
    const feesSection = table.sections.find((s) =>
      s.title.includes("Professional"),
    );
    expect(feesSection).toBeDefined();
  });

  it("shows state estate tax info for taxing states", () => {
    const table = getStateRateTable("MA");
    const stateSection = table.sections.find((s) =>
      s.title.includes("Massachusetts"),
    );
    expect(stateSection).toBeDefined();
    const estateTaxRow = stateSection?.rows.find(
      (r) => r.label === "State Estate Tax",
    );
    expect(estateTaxRow?.value).toBe("Yes");
  });

  it("shows no state tax for non-taxing states", () => {
    const table = getStateRateTable("TX");
    const stateSection = table.sections.find((s) => s.title.includes("Texas"));
    expect(stateSection).toBeDefined();
    const estateTaxRow = stateSection?.rows.find(
      (r) => r.label === "State Estate Tax",
    );
    expect(estateTaxRow?.value).toBe("None");
  });

  it("all sections have effective dates", () => {
    const table = getStateRateTable("FL");
    table.sections.forEach((section) => {
      expect(section.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("shows notes as a dedicated row", () => {
    const table = getStateRateTable("CT");
    const stateSection = table.sections.find((s) =>
      s.title.includes("Connecticut"),
    );
    expect(stateSection).toBeDefined();
    const notesRow = stateSection?.rows.find((r) => r.label === "Notes");
    expect(notesRow).toBeDefined();
    expect(notesRow?.value).toContain("federal exemption");
  });

  it("does not attach notes to unrelated rows", () => {
    const table = getStateRateTable("CT");
    const stateSection = table.sections.find((s) =>
      s.title.includes("Connecticut"),
    );
    const topRateRow = stateSection?.rows.find((r) => r.label === "Top Rate");
    expect(topRateRow?.note).toBeUndefined();
  });
});

describe("stateHasDeathTax", () => {
  it("returns true for estate tax states", () => {
    expect(stateHasDeathTax("MA")).toBe(true);
    expect(stateHasDeathTax("NY")).toBe(true);
    expect(stateHasDeathTax("OR")).toBe(true);
    expect(stateHasDeathTax("WA")).toBe(true);
  });

  it("returns true for inheritance tax states", () => {
    expect(stateHasDeathTax("PA")).toBe(true);
    expect(stateHasDeathTax("KY")).toBe(true);
    expect(stateHasDeathTax("NJ")).toBe(true);
  });

  it("returns false for states with no death tax", () => {
    expect(stateHasDeathTax("TX")).toBe(false);
    expect(stateHasDeathTax("FL")).toBe(false);
    expect(stateHasDeathTax("CA")).toBe(false);
  });
});

describe("getStateTaxSummary", () => {
  it("returns descriptive summary for estate tax state", () => {
    const summary = getStateTaxSummary("MA");
    expect(summary).toContain("Massachusetts");
    expect(summary).toContain("estate tax");
  });

  it("returns descriptive summary for inheritance tax state", () => {
    const summary = getStateTaxSummary("PA");
    expect(summary).toContain("Pennsylvania");
    expect(summary).toContain("inheritance tax");
  });

  it("returns no-tax summary for non-taxing state", () => {
    const summary = getStateTaxSummary("TX");
    expect(summary).toContain("Texas");
    expect(summary).toContain("does not impose");
  });

  it("mentions both taxes for MD", () => {
    const summary = getStateTaxSummary("MD");
    expect(summary).toContain("estate tax");
    expect(summary).toContain("inheritance tax");
  });
});
