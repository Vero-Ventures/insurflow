/**
 * Unit tests for Request Context
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRequestContext,
  requireRequestContext,
  addRequestAttribute,
  addRequestAttributes,
  setUserContext,
  withRequestContext,
  getRequestDuration,
  createRequestContext,
  generateRequestId,
} from "../context";

describe("Request Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateRequestId", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toMatch(/^req_[a-f0-9-]+$/);
      expect(id2).toMatch(/^req_[a-f0-9-]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("createRequestContext", () => {
    it("should create context with required fields", () => {
      const ctx = createRequestContext({
        method: "GET",
        endpoint: "/api/test",
      });

      expect(ctx.method).toBe("GET");
      expect(ctx.endpoint).toBe("/api/test");
      expect(ctx.requestId).toMatch(/^req_/);
      expect(ctx.startTime).toBeLessThanOrEqual(Date.now());
      expect(ctx.attributes).toEqual({});
    });

    it("should accept optional fields", () => {
      const ctx = createRequestContext({
        method: "POST",
        endpoint: "/api/users",
        requestId: "custom_req_id",
        userId: "user_123",
        sessionId: "session_456",
        initialAttributes: { custom: "attr" },
      });

      expect(ctx.requestId).toBe("custom_req_id");
      expect(ctx.userId).toBe("user_123");
      expect(ctx.sessionId).toBe("session_456");
      expect(ctx.attributes).toEqual({ custom: "attr" });
    });
  });

  describe("withRequestContext", () => {
    it("should provide context within callback", () => {
      let capturedCtx: ReturnType<typeof getRequestContext>;

      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        capturedCtx = getRequestContext();
      });

      expect(capturedCtx).toBeDefined();
      expect(capturedCtx?.method).toBe("GET");
      expect(capturedCtx?.endpoint).toBe("/test");
    });

    it("should not leak context outside callback", () => {
      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        // Inside context
        expect(getRequestContext()).toBeDefined();
      });

      // Outside context
      expect(getRequestContext()).toBeUndefined();
    });

    it("should support nested contexts", () => {
      withRequestContext({ method: "GET", endpoint: "/outer" }, () => {
        const outerCtx = getRequestContext();
        expect(outerCtx?.endpoint).toBe("/outer");

        withRequestContext({ method: "POST", endpoint: "/inner" }, () => {
          const innerCtx = getRequestContext();
          expect(innerCtx?.endpoint).toBe("/inner");
        });

        // Back to outer context
        const stillOuter = getRequestContext();
        expect(stillOuter?.endpoint).toBe("/outer");
      });
    });

    it("should support async operations", async () => {
      await withRequestContext(
        { method: "GET", endpoint: "/async" },
        async () => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10));

          const ctx = getRequestContext();
          expect(ctx?.endpoint).toBe("/async");
        },
      );
    });
  });

  describe("getRequestContext", () => {
    it("should return undefined outside of context", () => {
      expect(getRequestContext()).toBeUndefined();
    });

    it("should return context inside withRequestContext", () => {
      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        const ctx = getRequestContext();
        expect(ctx).toBeDefined();
        expect(ctx?.method).toBe("GET");
      });
    });
  });

  describe("requireRequestContext", () => {
    it("should throw when called outside of context", () => {
      expect(() => requireRequestContext()).toThrow(
        "Request context not found",
      );
    });

    it("should return context when inside withRequestContext", () => {
      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        const ctx = requireRequestContext();
        expect(ctx.method).toBe("GET");
      });
    });
  });

  describe("addRequestAttribute", () => {
    it("should add attribute to current context", () => {
      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        addRequestAttribute("customKey", "customValue");

        const ctx = getRequestContext();
        expect(ctx?.attributes.customKey).toBe("customValue");
      });
    });

    it("should do nothing outside of context", () => {
      // Should not throw
      addRequestAttribute("key", "value");
    });
  });

  describe("addRequestAttributes", () => {
    it("should add multiple attributes to current context", () => {
      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        addRequestAttributes({
          key1: "value1",
          key2: 42,
          key3: true,
        });

        const ctx = getRequestContext();
        expect(ctx?.attributes).toMatchObject({
          key1: "value1",
          key2: 42,
          key3: true,
        });
      });
    });

    it("should merge with existing attributes", () => {
      withRequestContext(
        {
          method: "GET",
          endpoint: "/test",
          initialAttributes: { existing: "attr" },
        },
        () => {
          addRequestAttributes({ new: "attr" });

          const ctx = getRequestContext();
          expect(ctx?.attributes).toMatchObject({
            existing: "attr",
            new: "attr",
          });
        },
      );
    });
  });

  describe("setUserContext", () => {
    it("should set user and session ID", () => {
      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        setUserContext("user_123", "session_456");

        const ctx = getRequestContext();
        expect(ctx?.userId).toBe("user_123");
        expect(ctx?.sessionId).toBe("session_456");
      });
    });

    it("should set only user ID when session is not provided", () => {
      withRequestContext({ method: "GET", endpoint: "/test" }, () => {
        setUserContext("user_only");

        const ctx = getRequestContext();
        expect(ctx?.userId).toBe("user_only");
        expect(ctx?.sessionId).toBeUndefined();
      });
    });
  });

  describe("getRequestDuration", () => {
    it("should return 0 outside of context", () => {
      expect(getRequestDuration()).toBe(0);
    });

    it("should return elapsed time since context creation", async () => {
      await withRequestContext(
        { method: "GET", endpoint: "/test" },
        async () => {
          // Wait a bit
          await new Promise((resolve) => setTimeout(resolve, 50));

          const duration = getRequestDuration();
          expect(duration).toBeGreaterThanOrEqual(50);
          expect(duration).toBeLessThan(200); // Reasonable upper bound
        },
      );
    });
  });
});
