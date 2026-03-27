import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockEnv,
  mockCreateTransport,
  mockSendMail,
  mockLogger,
  mockCreateLogger,
} = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "development",
    GMAIL_SMTP_USER: undefined as string | undefined,
    GMAIL_APP_PASSWORD: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
    AUTH_EMAIL_FROM: undefined as string | undefined,
  },
  mockSendMail: vi.fn(),
  mockCreateTransport: vi.fn(),
  mockLogger: {
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
  },
  mockCreateLogger: vi.fn(),
}));

vi.mock("@/env", () => ({
  env: mockEnv,
}));

vi.mock("nodemailer", () => ({
  createTransport: mockCreateTransport,
}));

vi.mock("@/server/axiom", () => ({
  createLogger: mockCreateLogger,
}));

import { sendPasswordResetEmail } from "@/server/better-auth/password-reset-email";

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    });
    mockCreateLogger.mockReturnValue(mockLogger);
    mockEnv.NODE_ENV = "development";
    mockEnv.GMAIL_SMTP_USER = undefined;
    mockEnv.GMAIL_APP_PASSWORD = undefined;
    mockEnv.RESEND_API_KEY = undefined;
    mockEnv.AUTH_EMAIL_FROM = undefined;
  });

  it("sends a reset email through Gmail SMTP when configured", async () => {
    mockEnv.NODE_ENV = "production";
    mockEnv.GMAIL_SMTP_USER = "insurflow.app@gmail.com";
    mockEnv.GMAIL_APP_PASSWORD = "app_password";
    mockEnv.AUTH_EMAIL_FROM = "InsurFlow <no-reply@example.com>";
    mockSendMail.mockResolvedValue(undefined);

    await sendPasswordResetEmail({
      user: { email: "user@example.com", name: "Taylor" },
      url: "https://app.example.com/reset?token=abc123",
      token: "abc123",
    });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "insurflow.app@gmail.com",
        pass: "app_password",
      },
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "InsurFlow <no-reply@example.com>",
        to: "user@example.com",
        subject: expect.stringContaining("Reset"),
        text: expect.stringContaining("60 minutes"),
        html: expect.stringContaining("Reset Password"),
      }),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Password reset email sent",
      expect.objectContaining({
        email: "user@example.com",
        provider: "gmail_smtp",
      }),
    );
  });

  it("logs a dev fallback reset URL when smtp is not configured", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendPasswordResetEmail({
      user: { email: "user@example.com", name: "Taylor" },
      url: "http://localhost:3000/reset?token=abc123",
      token: "abc123",
    });

    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Password reset email provider is not configured",
      expect.objectContaining({
        email: "user@example.com",
        configured: false,
      }),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:3000/reset?token=abc123"),
    );
  });

  it("logs smtp send failure without leaking token fields to structured logs", async () => {
    mockEnv.NODE_ENV = "production";
    mockEnv.GMAIL_SMTP_USER = "insurflow.app@gmail.com";
    mockEnv.GMAIL_APP_PASSWORD = "app_password";
    mockEnv.AUTH_EMAIL_FROM = "InsurFlow <no-reply@example.com>";
    mockSendMail.mockRejectedValue(new Error("SMTP failure"));

    await sendPasswordResetEmail({
      user: { email: "user@example.com", name: "Taylor" },
      url: "https://app.example.com/reset?token=sensitive_token",
      token: "sensitive_token",
    });

    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    const [message, error, context] = mockLogger.error.mock.calls[0] ?? [];
    expect(message).toBe("Password reset email send threw an error");
    expect(error).toBeInstanceOf(Error);
    expect(context).toMatchObject({
      email: "user@example.com",
      provider: "gmail_smtp",
    });
    expect(context).not.toHaveProperty("token");
    expect(context).not.toHaveProperty("url");
  });
});
