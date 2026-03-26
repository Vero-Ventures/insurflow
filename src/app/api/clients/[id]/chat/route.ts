import { z } from "zod";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { asset, client, clientChatMessage, debt } from "@/server/db/schemas";
import {
  handleValidationError,
  parseJsonBody,
  withApiHandler,
} from "@/lib/api/route-helpers";
import {
  GEMINI_MODEL,
  buildClientChatPrompt,
  generateText,
  getSuggestedChatQuestions,
  isGeminiConfigured,
  GeminiApiError,
} from "@/server/ai";

const postBodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(3000, "Message is too long"),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;

const rateLimiter = new Map<string, number[]>();

function decimalToNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimateTokenCount(text: string): number {
  // Rough approximation for tracking/guardrail UX in absence of provider token counts.
  return Math.max(1, Math.ceil(text.length / 4));
}

function checkRateLimit(key: string): {
  limited: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const existing = rateLimiter.get(key) ?? [];
  const withinWindow = existing.filter((t) => t >= windowStart);

  if (withinWindow.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterMs = withinWindow[0]! + RATE_LIMIT_WINDOW_MS - now;
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  withinWindow.push(now);
  rateLimiter.set(key, withinWindow);
  return { limited: false };
}

async function loadClientChatContext(clientId: string, userId: string) {
  const db = getDb();

  const [clientRow, assetTotals, debtTotals] = await Promise.all([
    db.query.client.findFirst({
      where: and(
        eq(client.id, clientId),
        eq(client.userId, userId),
        isNull(client.deletedAt),
      ),
    }),
    db
      .select({
        totalAssets: sql<string>`COALESCE(SUM(${asset.currentValue}), 0)`,
        liquidAssets: sql<string>`COALESCE(SUM(CASE WHEN ${asset.isLiquid} THEN ${asset.currentValue} ELSE 0 END), 0)`,
      })
      .from(asset)
      .where(and(eq(asset.clientId, clientId), isNull(asset.deletedAt))),
    db
      .select({
        totalDebts: sql<string>`COALESCE(SUM(${debt.currentBalance}), 0)`,
      })
      .from(debt)
      .where(and(eq(debt.clientId, clientId), isNull(debt.deletedAt))),
  ]);

  return {
    client: clientRow,
    totalAssets: decimalToNumber(assetTotals[0]?.totalAssets),
    liquidAssets: decimalToNumber(assetTotals[0]?.liquidAssets),
    totalDebts: decimalToNumber(debtTotals[0]?.totalDebts),
  };
}

export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/chat",
    method: "GET",
    requireClient: true,
  },
  async (_request, { clientId, session, logger }) => {
    const db = getDb();

    const context = await loadClientChatContext(clientId!, session.user.id);
    if (!context.client) {
      await logger.info("Client not found for chat", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [messages, usageRows] = await Promise.all([
      db.query.clientChatMessage.findMany({
        where: and(
          eq(clientChatMessage.clientId, clientId!),
          eq(clientChatMessage.userId, session.user.id),
        ),
        orderBy: [asc(clientChatMessage.sentAt)],
        limit: 200,
      }),
      db
        .select({
          totalMessages: sql<number>`COUNT(*)::int`,
          totalEstimatedTokens: sql<number>`COALESCE(SUM(${clientChatMessage.totalTokens}), 0)::int`,
        })
        .from(clientChatMessage)
        .where(
          and(
            eq(clientChatMessage.clientId, clientId!),
            eq(clientChatMessage.userId, session.user.id),
            eq(clientChatMessage.role, "assistant"),
          ),
        ),
    ]);

    const suggestedQuestions = getSuggestedChatQuestions({
      hasSpouse: context.client.hasSpouse ?? false,
      totalDebts: context.totalDebts,
      totalAssets: context.totalAssets,
      existingCoverage: decimalToNumber(
        context.client.existingLifeInsuranceCoverage,
      ),
    });

    return {
      data: {
        messages: messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          model: message.model,
          promptTokens: message.promptTokens,
          completionTokens: message.completionTokens,
          totalTokens: message.totalTokens,
          sentAt: message.sentAt.toISOString(),
        })),
        suggestedQuestions,
        usage: {
          totalAssistantMessages: usageRows[0]?.totalMessages ?? 0,
          totalEstimatedTokens: usageRows[0]?.totalEstimatedTokens ?? 0,
        },
      },
    };
  },
);

export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/chat",
    method: "POST",
    requireClient: true,
  },
  async (request, { clientId, session, logger }) => {
    if (!isGeminiConfigured()) {
      await logger.warn("Gemini API not configured for chat", {
        statusCode: 503,
      });
      return NextResponse.json(
        {
          error: "AI service not configured",
          message: "Client chat is currently unavailable.",
        },
        { status: 503 },
      );
    }

    const bodyResult = await parseJsonBody(request, logger);
    if ("error" in bodyResult) {
      return bodyResult.error;
    }

    const validationResult = postBodySchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return handleValidationError(logger, validationResult.error);
    }

    const userMessage = validationResult.data.message;
    const rateLimitKey = `${session.user.id}:${clientId}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    if (rateLimit.limited) {
      await logger.warn("Chat rate limit exceeded", { statusCode: 429 });
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Please wait ${rateLimit.retryAfter} seconds before sending another message.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter),
          },
        },
      );
    }

    const db = getDb();

    const context = await loadClientChatContext(clientId!, session.user.id);
    if (!context.client) {
      await logger.info("Client not found for chat", { statusCode: 404 });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const recentMessages = await db.query.clientChatMessage.findMany({
      where: and(
        eq(clientChatMessage.clientId, clientId!),
        eq(clientChatMessage.userId, session.user.id),
      ),
      orderBy: [desc(clientChatMessage.sentAt)],
      limit: 12,
    });

    const normalizedHistory = recentMessages
      .slice()
      .reverse()
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const prompt = buildClientChatPrompt(
      {
        firstName: context.client.firstName,
        lastName: context.client.lastName,
        state: context.client.state,
        hasSpouse: context.client.hasSpouse ?? false,
        clientIncome: decimalToNumber(context.client.clientIncome),
        spouseIncome: decimalToNumber(context.client.spouseIncome),
        existingCoverage: decimalToNumber(
          context.client.existingLifeInsuranceCoverage,
        ),
        totalAssets: context.totalAssets,
        liquidAssets: context.liquidAssets,
        totalDebts: context.totalDebts,
        additionalGoals: context.client.additionalGoals,
      },
      normalizedHistory,
      userMessage,
    );

    const now = new Date();

    await db.insert(clientChatMessage).values({
      clientId: clientId!,
      userId: session.user.id,
      role: "user",
      content: userMessage,
      sentAt: now,
    });

    let assistantText: string;
    try {
      assistantText = await generateText({
        prompt,
        temperature: 0.5,
        maxOutputTokens: 2048,
      });
    } catch (error) {
      if (error instanceof GeminiApiError) {
        await logger.error("Gemini API error in client chat", error, {
          statusCode: error.statusCode,
        });
        return NextResponse.json(
          {
            error: "AI service error",
            message:
              "Could not generate a response right now. Please try again.",
          },
          { status: 503 },
        );
      }
      throw error;
    }

    const promptTokens = estimateTokenCount(prompt);
    const completionTokens = estimateTokenCount(assistantText);
    const totalTokens = promptTokens + completionTokens;

    const insertedAssistantMessages = await db
      .insert(clientChatMessage)
      .values({
        clientId: clientId!,
        userId: session.user.id,
        role: "assistant",
        content: assistantText,
        model: GEMINI_MODEL,
        promptTokens,
        completionTokens,
        totalTokens,
        sentAt: new Date(),
      })
      .returning();

    const assistantMessage = insertedAssistantMessages[0];
    if (!assistantMessage) {
      throw new Error("Failed to persist assistant chat message");
    }

    const encoder = new TextEncoder();
    const chunks = assistantText.match(/.{1,120}(\s|$)/g) ?? [assistantText];

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let index = 0;

        const pushChunk = () => {
          if (index < chunks.length) {
            const line = JSON.stringify({
              type: "chunk",
              delta: chunks[index],
            });
            controller.enqueue(encoder.encode(`${line}\n`));
            index += 1;
            setTimeout(pushChunk, 15);
            return;
          }

          const doneLine = JSON.stringify({
            type: "done",
            message: {
              id: assistantMessage.id,
              role: assistantMessage.role,
              content: assistantMessage.content,
              model: assistantMessage.model,
              promptTokens: assistantMessage.promptTokens,
              completionTokens: assistantMessage.completionTokens,
              totalTokens: assistantMessage.totalTokens,
              sentAt: assistantMessage.sentAt.toISOString(),
            },
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
            },
          });

          controller.enqueue(encoder.encode(`${doneLine}\n`));
          controller.close();
        };

        pushChunk();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  },
);
