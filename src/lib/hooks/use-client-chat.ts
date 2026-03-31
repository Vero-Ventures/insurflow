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

export function useClientChat(clientId: string): UseClientChatResult {
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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refetchHistory = useCallback(async () => {
    if (!clientId) return;

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
      toast.error(message);
    } finally {
      if (!isMountedRef.current) return;
      setIsLoadingHistory(false);
    }
  }, [clientId]);

  useEffect(() => {
    refetchHistory();
  }, [refetchHistory]);

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

      try {
        const response = await fetch(`/api/clients/${clientId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ message: trimmed }),
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

            const parsed = JSON.parse(line) as
              | StreamChunk
              | StreamDone
              | StreamError;
            applyStreamEvent(parsed);
          }
        }

        // Ensure the final event is applied when stream closes without trailing newline.
        if (buffer.trim()) {
          const parsed = JSON.parse(buffer) as
            | StreamChunk
            | StreamDone
            | StreamError;
          applyStreamEvent(parsed);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        toast.error(message);
        setMessages((current) =>
          current.filter((item) => item.id !== pendingAssistantId),
        );
      } finally {
        if (isMountedRef.current) {
          setIsSending(false);
        }
      }
    },
    [clientId, isSending],
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
