import { Axiom } from "@axiomhq/js";
import { env } from "@/env";

/**
 * Axiom client for structured logging
 * Only initialized if AXIOM_TOKEN is configured
 */
export const axiom =
  env.AXIOM_TOKEN && env.AXIOM_DATASET
    ? new Axiom({
        token: env.AXIOM_TOKEN,
        orgId: env.AXIOM_ORG_ID,
      })
    : null;

/**
 * Default dataset for logging
 */
export const AXIOM_DATASET = env.AXIOM_DATASET ?? "insurflow";

/**
 * Log levels for structured logging
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Base log event structure following Canonical Logging (Wide Events) pattern
 * Accumulate context throughout the request lifecycle, emit once when complete
 */
export interface LogEvent {
  level: LogLevel;
  message: string;
  timestamp: string;

  // Request context
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;

  // Response context
  statusCode?: number;
  duration?: number;

  // Error context
  error?: {
    name: string;
    message: string;
    stack?: string;
  };

  // Feature flags
  featureFlags?: Record<string, boolean>;

  // Additional context
  [key: string]: unknown;
}

/**
 * Logger utility following "One Event Per Request" pattern from loggingsucks.com
 * Accumulates context and emits a single wide event when the unit of work completes
 */
export class Logger {
  private context: Partial<LogEvent> = {};

  constructor(initialContext?: Partial<LogEvent>) {
    this.context = {
      ...initialContext,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add context to the current log event
   */
  addContext(context: Partial<LogEvent>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Emit a log event to Axiom
   */
  private async emit(
    level: LogLevel,
    message: string,
    additionalContext?: Partial<LogEvent>,
  ): Promise<void> {
    const event: LogEvent = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...additionalContext,
    };

    // Console fallback if Axiom is not configured
    if (!axiom) {
      console.log(JSON.stringify(event));
      return;
    }

    try {
      await axiom.ingest(AXIOM_DATASET, [event]);
    } catch (error) {
      console.error("Failed to send log to Axiom:", error);
      console.log(JSON.stringify(event));
    }
  }

  async debug(message: string, context?: Partial<LogEvent>): Promise<void> {
    await this.emit("debug", message, context);
  }

  async info(message: string, context?: Partial<LogEvent>): Promise<void> {
    await this.emit("info", message, context);
  }

  async warn(message: string, context?: Partial<LogEvent>): Promise<void> {
    await this.emit("warn", message, context);
  }

  async error(
    message: string,
    error?: Error,
    context?: Partial<LogEvent>,
  ): Promise<void> {
    await this.emit("error", message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  async fatal(
    message: string,
    error?: Error,
    context?: Partial<LogEvent>,
  ): Promise<void> {
    await this.emit("fatal", message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Flush any pending logs (call at end of request/process)
   */
  async flush(): Promise<void> {
    if (axiom) {
      await axiom.flush();
    }
  }
}

/**
 * Create a new logger instance with optional initial context
 */
export function createLogger(context?: Partial<LogEvent>): Logger {
  return new Logger(context);
}
