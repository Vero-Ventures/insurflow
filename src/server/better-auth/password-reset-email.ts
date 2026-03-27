import { env } from "@/env";
import { createTransport } from "nodemailer";

// Parked: Resend flow (kept for potential future restoration)
// const RESEND_API_URL = "https://api.resend.com/emails";

interface ResetPasswordEmailPayload {
  user: {
    email: string;
    name?: string | null;
  };
  url: string;
  token: string;
}

function buildResetEmailSubject(): string {
  return "Reset your InsurFlow password";
}

function buildResetEmailText(payload: ResetPasswordEmailPayload): string {
  const recipientName = payload.user.name?.trim() || "there";
  return [
    `Hi ${recipientName},`,
    "",
    "We received a request to reset your InsurFlow password.",
    "Use the secure link below to choose a new password:",
    payload.url,
    "",
    "This link expires in 60 minutes and can only be used once.",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");
}

function buildResetEmailHtml(payload: ResetPasswordEmailPayload): string {
  const recipientName = payload.user.name?.trim() || "there";
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
  <h2 style="margin-bottom: 16px;">Reset your InsurFlow password</h2>
  <p>Hi ${recipientName},</p>
  <p>We received a request to reset your InsurFlow password.</p>
  <p>
    <a href="${payload.url}" style="display:inline-block;padding:10px 16px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:6px;">
      Reset Password
    </a>
  </p>
  <p>If the button above does not work, use this link:</p>
  <p><a href="${payload.url}">${payload.url}</a></p>
  <p>This link expires in <strong>60 minutes</strong> and can only be used once.</p>
  <p>If you did not request a password reset, you can ignore this email.</p>
</div>
`.trim();
}

function isResetEmailConfigured(): boolean {
  return Boolean(
    env.GMAIL_SMTP_USER && env.GMAIL_APP_PASSWORD && env.AUTH_EMAIL_FROM,
  );
}

function logDevResetUrl(payload: ResetPasswordEmailPayload): void {
  console.info(
    `[DEV] Password reset URL for ${payload.user.email}: ${payload.url}`,
  );
}

type ResetEmailLogLevel = "info" | "warn" | "error";

function logStructured(
  level: ResetEmailLogLevel,
  message: string,
  context: Record<string, unknown>,
): void {
  const event = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const serialized = JSON.stringify(event);
  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export async function sendPasswordResetEmail(
  payload: ResetPasswordEmailPayload,
): Promise<void> {
  if (!isResetEmailConfigured()) {
    logStructured("warn", "Password reset email provider is not configured", {
      endpoint: "auth/password-reset",
      email: payload.user.email,
      configured: false,
    });

    if (env.NODE_ENV !== "production") {
      logDevResetUrl(payload);
      return;
    }

    return;
  }

  try {
    const transporter = createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: env.GMAIL_SMTP_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: env.AUTH_EMAIL_FROM,
      to: payload.user.email,
      subject: buildResetEmailSubject(),
      text: buildResetEmailText(payload),
      html: buildResetEmailHtml(payload),
    });

    logStructured("info", "Password reset email sent", {
      endpoint: "auth/password-reset",
      email: payload.user.email,
      provider: "gmail_smtp",
    });
  } catch (error) {
    logStructured("error", "Password reset email send threw an error", {
      endpoint: "auth/password-reset",
      email: payload.user.email,
      provider: "gmail_smtp",
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : { name: "Error", message: "Unknown email send error" },
    });

    if (env.NODE_ENV !== "production") {
      logDevResetUrl(payload);
    }
  }
}

/*
Parked: Resend flow for future use.

const response = await fetch(RESEND_API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: env.AUTH_EMAIL_FROM,
    to: [payload.user.email],
    subject: buildResetEmailSubject(),
    html: buildResetEmailHtml(payload),
    text: buildResetEmailText(payload),
  }),
});
*/
