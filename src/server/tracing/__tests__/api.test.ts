/**
 * Integration tests for the API Tracing Wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  withTracing,
  withTracingPublic,
  tracedJson,
  tracedError,
} from "../api";

// Mock the auth module to avoid database calls
vi.mock("../auth", () => ({
  setUserContextFromSession: vi.fn().mockResolvedValue(null),
}));

// Mock console to capture logs
const mockConsole = {
  info: vi.spyOn(console, "info").mockImplementation(() => {}),
  warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

describe("API Tracing Wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe("withTracing", () => {
    it("should wrap handler and return response", async () => {
      const handler = withTracing(async () => {
        return Response.json({ success: true });
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      const response = await handler(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ success: true });
    });

    it("should emit log with status code on success", async () => {
      const handler = withTracing(async () => {
        return Response.json({ data: "test" });
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await handler(request);

      // Check that a log was emitted
      expect(mockConsole.info).toHaveBeenCalled();
      const logOutput = JSON.parse(
        mockConsole.info.mock.calls[0]?.[0] as string,
      );
      expect(logOutput.status_code).toBe(200);
      expect(logOutput.method).toBe("GET");
      expect(logOutput.endpoint).toBe("/api/test");
    });

    it("should provide context to handler", async () => {
      let capturedCtx: unknown;

      const handler = withTracing(async (_request, ctx) => {
        capturedCtx = ctx;
        ctx.addAttribute("customField", "customValue");
        return Response.json({ ok: true });
      });

      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
      });

      await handler(request);

      expect(capturedCtx).toBeDefined();
      expect((capturedCtx as { span: unknown }).span).toBeDefined();
    });

    it("should handle errors and emit error log", async () => {
      const handler = withTracing(async () => {
        throw new Error("Test error");
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await expect(handler(request)).rejects.toThrow("Test error");

      // Check that error log was emitted
      expect(mockConsole.error).toHaveBeenCalled();
      const logOutput = JSON.parse(
        mockConsole.error.mock.calls[0]?.[0] as string,
      );
      expect(logOutput.status_code).toBe(500);
      expect(logOutput.level).toBe("error");
    });

    it("should handle different HTTP methods", async () => {
      const handler = withTracing(async () => {
        return Response.json({ ok: true });
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

      for (const method of methods) {
        vi.clearAllMocks();

        const request = new NextRequest("http://localhost:3000/api/test", {
          method,
        });

        await handler(request);

        expect(mockConsole.info).toHaveBeenCalled();
        const logOutput = JSON.parse(
          mockConsole.info.mock.calls[0]?.[0] as string,
        );
        expect(logOutput.method).toBe(method);
      }
    });

    it("should handle non-200 status codes correctly", async () => {
      const handler = withTracing(async () => {
        return Response.json({ error: "Not found" }, { status: 404 });
      });

      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      const response = await handler(request);
      expect(response.status).toBe(404);

      // 404 should emit a warn log
      expect(mockConsole.warn).toHaveBeenCalled();
      const logOutput = JSON.parse(
        mockConsole.warn.mock.calls[0]?.[0] as string,
      );
      expect(logOutput.status_code).toBe(404);
      expect(logOutput.level).toBe("warn");
    });
  });

  describe("withTracingPublic", () => {
    it("should not attempt to extract user context", async () => {
      const { setUserContextFromSession } = await import("../auth");

      const handler = withTracingPublic(async () => {
        return Response.json({ public: true });
      });

      const request = new NextRequest("http://localhost:3000/api/public", {
        method: "GET",
      });

      await handler(request);

      // Should not call auth extraction
      expect(setUserContextFromSession).not.toHaveBeenCalled();
    });
  });

  describe("tracedJson", () => {
    it("should create a JSON response", () => {
      const response = tracedJson({ data: "test" });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });

    it("should accept custom status code", () => {
      const response = tracedJson({ created: true }, { status: 201 });

      expect(response.status).toBe(201);
    });
  });

  describe("tracedError", () => {
    it("should create an error response", async () => {
      const response = tracedError("Something went wrong", 400);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: "Something went wrong" });
    });

    it("should default to 500 status code", async () => {
      const response = tracedError("Internal error");

      expect(response.status).toBe(500);
    });
  });
});
