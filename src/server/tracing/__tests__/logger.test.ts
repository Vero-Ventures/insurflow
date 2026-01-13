/**
 * Unit tests for the Canonical Logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emitLog, log, emitRequestLog, createChildLogger } from "../logger";
import * as contextModule from "../context";

// Mock the context module
vi.mock("../context", () => ({
  getRequestContext: vi.fn(),
  getRequestDuration: vi.fn(() => 100),
}));

// Mock console methods
const mockConsole = {
  debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
  info: vi.spyOn(console, "info").mockImplementation(() => {}),
  warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set development mode for console output
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe("emitLog", () => {
    it("should emit log to console when no request context exists", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue(undefined);

      emitLog("info", "Test message", { customField: "value" });

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(
        mockConsole.info.mock.calls[0]?.[0] as string,
      );

      expect(logOutput).toMatchObject({
        level: "info",
        message: "Test message",
        request_id: "no-context",
        trace_id: "no-trace",
        customField: "value",
      });
    });

    it("should emit log with request context when available", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue({
        requestId: "req_123",
        traceId: "trace_abc",
        spanId: "span_def",
        userId: "user_456",
        sessionId: "session_789",
        method: "GET",
        endpoint: "/api/test",
        startTime: Date.now() - 100,
        attributes: { existingAttr: "existing" },
      });

      emitLog("info", "Test with context", { newAttr: "new" });

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(
        mockConsole.info.mock.calls[0]?.[0] as string,
      );

      expect(logOutput).toMatchObject({
        level: "info",
        message: "Test with context",
        request_id: "req_123",
        trace_id: "trace_abc",
        span_id: "span_def",
        user_id: "user_456",
        session_id: "session_789",
        method: "GET",
        endpoint: "/api/test",
        existingAttr: "existing",
        newAttr: "new",
      });
    });

    it("should use correct console method for each log level", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue(undefined);

      emitLog("debug", "Debug message");
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);

      emitLog("info", "Info message");
      expect(mockConsole.info).toHaveBeenCalledTimes(1);

      emitLog("warn", "Warn message");
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);

      emitLog("error", "Error message");
      expect(mockConsole.error).toHaveBeenCalledTimes(1);

      emitLog("fatal", "Fatal message");
      expect(mockConsole.error).toHaveBeenCalledTimes(2); // fatal uses error
    });
  });

  describe("log convenience functions", () => {
    beforeEach(() => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue(undefined);
    });

    it("should have working debug function", () => {
      log.debug("Debug test", { key: "value" });

      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.debug.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("debug");
      expect(output.message).toBe("Debug test");
      expect(output.key).toBe("value");
    });

    it("should have working info function", () => {
      log.info("Info test");

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.info.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("info");
    });

    it("should have working warn function", () => {
      log.warn("Warn test");

      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.warn.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("warn");
    });

    it("should have working error function with error object", () => {
      const error = new Error("Test error");
      error.stack = "Error: Test error\n    at test.ts:1:1";

      log.error("Error test", error, { extra: "data" });

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.error.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("error");
      expect(output.error).toEqual({
        name: "Error",
        message: "Test error",
        stack: "Error: Test error\n    at test.ts:1:1",
      });
      expect(output.extra).toBe("data");
    });

    it("should have working fatal function", () => {
      const error = new Error("Fatal error");

      log.fatal("Fatal test", error);

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.error.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("fatal");
      expect(output.error.name).toBe("Error");
    });
  });

  describe("emitRequestLog", () => {
    it("should warn when called without request context", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue(undefined);

      emitRequestLog(200);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        "[Logger] emitRequestLog called without request context",
      );
    });

    it("should emit info log for 2xx status codes", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue({
        requestId: "req_123",
        traceId: "trace_abc",
        spanId: "span_def",
        method: "GET",
        endpoint: "/api/test",
        startTime: Date.now(),
        attributes: {},
      });

      emitRequestLog(200);

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.info.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("info");
      expect(output.status_code).toBe(200);
    });

    it("should emit warn log for 4xx status codes", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue({
        requestId: "req_123",
        traceId: "trace_abc",
        spanId: "span_def",
        method: "GET",
        endpoint: "/api/test",
        startTime: Date.now(),
        attributes: {},
      });

      emitRequestLog(404);

      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.warn.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("warn");
      expect(output.status_code).toBe(404);
    });

    it("should emit error log for 5xx status codes", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue({
        requestId: "req_123",
        traceId: "trace_abc",
        spanId: "span_def",
        method: "GET",
        endpoint: "/api/test",
        startTime: Date.now(),
        attributes: {},
      });

      emitRequestLog(500);

      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.error.mock.calls[0]?.[0] as string);
      expect(output.level).toBe("error");
      expect(output.status_code).toBe(500);
    });
  });

  describe("createChildLogger", () => {
    it("should create logger with additional context", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue(undefined);

      const childLogger = createChildLogger({ component: "UserService" });

      childLogger.info("Child log message", { action: "create" });

      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      const output = JSON.parse(mockConsole.info.mock.calls[0]?.[0] as string);
      expect(output.component).toBe("UserService");
      expect(output.action).toBe("create");
    });

    it("should merge child context with per-call context", () => {
      vi.mocked(contextModule.getRequestContext).mockReturnValue(undefined);

      const childLogger = createChildLogger({ component: "PaymentService" });

      childLogger.warn("Payment warning", { amount: 100 });

      const output = JSON.parse(mockConsole.warn.mock.calls[0]?.[0] as string);
      expect(output.component).toBe("PaymentService");
      expect(output.amount).toBe(100);
    });
  });
});
