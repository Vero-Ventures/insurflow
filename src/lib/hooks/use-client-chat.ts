"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface ClientChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  sentAt: string;
}

interface ChatUsageSummary {
  totalAssistantMessages: number;
  totalEstimatedTokens: number;
}

interface ChatHistoryResponse {
  messages: ClientChatMessage[];
  suggestedQuestions: string[];
  usage: ChatUsageSummary;
}

interface StreamChunk {
  type: "chunk";
  delta: string;
}

interface StreamDone {
  type: "done";
  message: ClientChatMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface StreamError {
  type: "error";
  message: string;
}

export interface UseClientChatResult {
  messages: ClientChatMessage[];
  isLoadingHistory: boolean;
  isSending: boolean;
  error: string | null;
  suggestedQuestions: string[];
  usage: ChatUsageSummary;
  sendMessage: (content: string) => Promise<void>;
  refetchHistory: () => Promise<void>;
}

export type ClientChatSurface = "advisor" | "client";

export function useClientChat(
  clientId: string,
  surface: ClientChatSurface = "advisor",
): UseClientChatResult {
  const [messages, setMessages] = useState<ClientChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [usage, setUsage] = useState<ChatUsageSummary>({
    totalAssistantMessages: 0,
    totalEstimatedTokens: 0,
  });

  const isMountedRef = useRef(true);
  const messagesRef = useRef<ClientChatMessage[]>([]);
  const suggestedQuestionsRef = useRef<string[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    suggestedQuestionsRef.current = suggestedQuestions;
  }, [suggestedQuestions]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refetchHistory = useCallback(
    async (suppressToast = false) => {
      if (!clientId) {
        if (isMountedRef.current) {
          setIsLoadingHistory(false);
        }
        return;
      }

      setIsLoadingHistory(true);
      setError(null);

      try {
        const response = await fetch(`/api/clients/${clientId}/chat`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          let message = "Failed to load chat history";
          try {
            const data = (await response.json()) as {
              message?: string;
              error?: string;
            };
            message = data.message ?? data.error ?? message;
          } catch {
            // Ignore parse errors and keep generic message.
          }
          throw new Error(message);
        }

        const data = (await response.json()) as ChatHistoryResponse;
        if (!isMountedRef.current) return;

        setMessages(data.messages ?? []);
        setSuggestedQuestions(data.suggestedQuestions ?? []);
        setUsage(
          data.usage ?? {
            totalAssistantMessages: 0,
            totalEstimatedTokens: 0,
          },
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load chat history";
        if (!isMountedRef.current) return;
        setError(message);
        if (!suppressToast) {
          toast.error(message);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingHistory(false);
        }
      }
    },
    [clientId],
  );

  useEffect(() => {
    let cancelled = false;

    const loadWithRetry = async () => {
      // Short retry sequence handles post-submit transitions where
      // chat context can lag a moment behind navigation.
      const retryDelaysMs = [0, 900, 1800];

      for (const [index, delay] of retryDelaysMs.entries()) {
        if (cancelled) return;

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (cancelled) return;
        }

        await refetchHistory(index > 0);
        if (cancelled) return;

        const hasLoadedContext =
          messagesRef.current.length > 0 ||
          suggestedQuestionsRef.current.length > 0;

        if (hasLoadedContext) {
          break;
        }
      }
    };

    void loadWithRetry();

    return () => {
      cancelled = true;
    };
  }, [clientId, refetchHistory]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      setIsSending(true);
      setError(null);

      const userMessage: ClientChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        sentAt: new Date().toISOString(),
      };

      const pendingAssistantId = crypto.randomUUID();
      const pendingAssistantMessage: ClientChatMessage = {
        id: pendingAssistantId,
        role: "assistant",
        content: "",
        sentAt: new Date().toISOString(),
      };

      setMessages((current) => [
        ...current,
        userMessage,
        pendingAssistantMessage,
      ]);

      let streamParseFailed = false;
      try {
        const response = await fetch(`/api/clients/${clientId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ message: trimmed, surface }),
        });

        if (!response.ok) {
          let message = "Failed to send message";
          try {
            const data = (await response.json()) as {
              message?: string;
              error?: string;
            };
            message = data.message ?? data.error ?? message;
          } catch {
            // Ignore parse errors.
          }
          throw new Error(message);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming is not available in this browser session");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        const parseStreamEvent = (line: string) => {
          try {
            return JSON.parse(line) as StreamChunk | StreamDone | StreamError;
          } catch {
            streamParseFailed = true;
            throw new Error("Received malformed stream data from server");
          }
        };
        const applyStreamEvent = (
          parsed: StreamChunk | StreamDone | StreamError,
        ) => {
          if (parsed.type === "chunk") {
            setMessages((current) =>
              current.map((message) =>
                message.id === pendingAssistantId
                  ? { ...message, content: message.content + parsed.delta }
                  : message,
              ),
            );
            return;
          }

          if (parsed.type === "done") {
            setMessages((current) =>
              current.map((message) =>
                message.id === pendingAssistantId ? parsed.message : message,
              ),
            );
            setUsage((current) => ({
              totalAssistantMessages: current.totalAssistantMessages + 1,
              totalEstimatedTokens:
                current.totalEstimatedTokens + parsed.usage.totalTokens,
            }));
            return;
          }

          throw new Error(parsed.message || "Failed to send message");
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const parsed = parseStreamEvent(line);
            applyStreamEvent(parsed);
          }
        }

        // Ensure the final event is applied when stream closes without trailing newline.
        if (buffer.trim()) {
          const parsed = parseStreamEvent(buffer);
          applyStreamEvent(parsed);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        toast.error(message);

        setMessages((current) => {
          const optimisticIdsToRemove = new Set([pendingAssistantId]);
          if (streamParseFailed) {
            optimisticIdsToRemove.add(userMessage.id);
          }

          return current.filter((item) => !optimisticIdsToRemove.has(item.id));
        });

        if (streamParseFailed) {
          void refetchHistory();
        }
      } finally {
        if (isMountedRef.current) {
          setIsSending(false);
        }
      }
    },
    [clientId, isSending, surface, refetchHistory],
  );

  return {
    messages,
    isLoadingHistory,
    isSending,
    error,
    suggestedQuestions,
    usage,
    sendMessage,
    refetchHistory,
  };
}
