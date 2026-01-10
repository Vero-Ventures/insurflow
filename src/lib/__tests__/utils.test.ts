import { describe, expect, it } from "vitest";

import { cn } from "../utils";

describe("cn (classname utility)", () => {
  it("merges class names correctly", () => {
    const result = cn("px-4", "py-2", "bg-blue-500");
    expect(result).toBe("px-4 py-2 bg-blue-500");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("removes falsy values", () => {
    const result = cn("base", false, null, undefined, "valid");
    expect(result).toBe("base valid");
  });

  it("merges Tailwind classes correctly (last wins)", () => {
    const result = cn("px-4", "px-8");
    expect(result).toBe("px-8");
  });

  it("merges conflicting Tailwind variants correctly", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles array of classes", () => {
    const result = cn(["px-4", "py-2"]);
    expect(result).toBe("px-4 py-2");
  });
});
