import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, mockCreateTransport, mockSendMail } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "development",
    GMAIL_SMTP_USER: undefined as string | undefined,
    GMAIL_APP_PASSWORD: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
    AUTH_EMAIL_FROM: undefined as string | undefined,
  },
  mockSendMail: vi.fn(),
  mockCreateTransport: vi.fn(),
}));

vi.mock("@/env", () => ({
  env: mockEnv,
}));

vi.mock("nodemailer", () => ({
  createTransport: mockCreateTransport,
}));

import { sendPasswordResetEmail } from "@/server/better-auth/password-reset-email";

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    });
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
  });

  it("logs a dev fallback reset URL when smtp is not configured", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendPasswordResetEmail({
      user: { email: "user@example.com", name: "Taylor" },
      url: "http://localhost:3000/reset?token=abc123",
      token: "abc123",
    });

    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
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
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendPasswordResetEmail({
      user: { email: "user@example.com", name: "Taylor" },
      url: "https://app.example.com/reset?token=sensitive_token",
      token: "sensitive_token",
    });

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [serializedEvent] = errorSpy.mock.calls[0] ?? [];
    const parsedEvent = JSON.parse(String(serializedEvent)) as Record<
      string,
      unknown
    >;
    expect(parsedEvent).toMatchObject({
      email: "user@example.com",
      provider: "gmail_smtp",
    });
    expect(parsedEvent).not.toHaveProperty("token");
    expect(parsedEvent).not.toHaveProperty("url");
  });
});
