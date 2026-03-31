import { z } from "zod";
import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
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
  streamText,
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
  surface: z.enum(["advisor", "client"]).optional().default("advisor"),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;

function decimalToNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimateTokenCount(text: string): number {
  // Rough approximation for tracking/guardrail UX in absence of provider token counts.
  return Math.max(1, Math.ceil(text.length / 4));
}

async function checkRateLimit(
  clientId: string,
  userId: string,
): Promise<{
  limited: boolean;
  retryAfter?: number;
}> {
  const db = getDb();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const [windowUsage] = await db
    .select({
      totalRequests: sql<number>`COUNT(*)::int`,
      oldestRequestInWindow: sql<
        string | null
      >`MIN(${clientChatMessage.sentAt})::text`,
    })
    .from(clientChatMessage)
    .where(
      and(
        eq(clientChatMessage.clientId, clientId),
        eq(clientChatMessage.userId, userId),
        eq(clientChatMessage.role, "user"),
        gte(clientChatMessage.sentAt, windowStart),
      ),
    );

  const totalRequests = windowUsage?.totalRequests ?? 0;

  if (totalRequests >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestRequest = windowUsage?.oldestRequestInWindow
      ? new Date(windowUsage.oldestRequestInWindow)
      : new Date();
    const retryAfterMs =
      oldestRequest.getTime() + RATE_LIMIT_WINDOW_MS - Date.now();
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

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

    const { message: userMessage, surface } = validationResult.data;
    const rateLimit = await checkRateLimit(clientId!, session.user.id);
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
      surface,
    );

    const now = new Date();

    const insertedUserMessages = await db
      .insert(clientChatMessage)
      .values({
        clientId: clientId!,
        userId: session.user.id,
        role: "user",
        content: userMessage,
        sentAt: now,
      })
      .returning();

    const insertedUserMessageId = insertedUserMessages[0]?.id;

    const aiStream = streamText({
      prompt,
      temperature: 0.5,
      maxOutputTokens: 2048,
    });

    const promptTokens = estimateTokenCount(prompt);
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let assistantText = "";

        try {
          for await (const delta of aiStream) {
            assistantText += delta;
            const line = JSON.stringify({
              type: "chunk",
              delta,
            });
            controller.enqueue(encoder.encode(`${line}\n`));
          }

          if (!assistantText.trim()) {
            throw new GeminiApiError("No text generated in response");
          }

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
              completionTokens: assistantMessage.completionTokens,
              totalTokens: assistantMessage.totalTokens,
            },
          });

          controller.enqueue(encoder.encode(`${doneLine}\n`));
          controller.close();
        } catch (error) {
          let userMessage =
            "Could not generate a response right now. Please try again.";

          if (insertedUserMessageId && !assistantText.trim()) {
            try {
              await db
                .delete(clientChatMessage)
                .where(eq(clientChatMessage.id, insertedUserMessageId));
            } catch (cleanupError) {
              await logger.warn(
                "Failed to clean up orphaned user chat message",
                {
                  cleanupError:
                    cleanupError instanceof Error
                      ? cleanupError.message
                      : String(cleanupError),
                },
              );
            }
          }

          if (error instanceof GeminiApiError) {
            await logger.error("Gemini API error in client chat", error, {
              statusCode: error.statusCode,
            });

            if (error.statusCode === 429) {
              userMessage =
                "The AI service is currently rate-limited. Please wait a moment and try again.";
            } else if (error.statusCode === 401 || error.statusCode === 403) {
              userMessage =
                "The AI service credentials are invalid or restricted. Please contact support.";
            } else if (error.statusCode === 400) {
              userMessage =
                "The request could not be processed by the AI service. Please shorten your question and try again.";
            }
          } else {
            await logger.error(
              "Unexpected streaming error in client chat",
              error instanceof Error ? error : new Error(String(error)),
            );
          }

          const errorLine = JSON.stringify({
            type: "error",
            message: userMessage,
          });
          controller.enqueue(encoder.encode(`${errorLine}\n`));
          controller.close();
        }
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
