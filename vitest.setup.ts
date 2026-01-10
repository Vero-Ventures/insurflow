import "@testing-library/dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cleanup after each test case (React Testing Library)
afterEach(() => {
  cleanup();
});
