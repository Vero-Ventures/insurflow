"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, SendHorizontal, User2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useClientChat } from "@/lib/hooks/use-client-chat";

interface ClientChatPanelProps {
  clientId: string;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function ClientChatPanel({ clientId }: ClientChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);

  const {
    messages,
    isLoadingHistory,
    isSending,
    error,
    suggestedQuestions,
    usage,
    sendMessage,
  } = useClientChat(clientId);

  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const canSend = useMemo(
    () => draft.trim().length > 0 && !isSending,
    [draft, isSending],
  );

  const handleSend = async () => {
    if (!canSend) return;
    const outgoing = draft;
    setDraft("");
    setHasInteracted(true);
    await sendMessage(outgoing);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2.5fr_1fr]">
      <Card className="min-h-[620px]">
        <CardHeader>
          <CardTitle>InsurFlow Copilot Chat</CardTitle>
          <CardDescription>
            Ask contextual questions and get AI-assisted responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid h-[540px] grid-rows-[1fr_auto] gap-3">
          <div
            ref={viewportRef}
            className="bg-muted/20 border-border/60 space-y-4 overflow-y-auto rounded-lg border p-4"
          >
            {isLoadingHistory ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="ml-auto h-16 w-2/3" />
                <Skeleton className="h-20 w-4/5" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Start the conversation with a question about this client.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-xl px-3 py-2",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border-border border",
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content || (isSending ? "Thinking..." : "")}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[11px]",
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatDateTime(message.sentAt)}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="bg-muted text-muted-foreground flex h-7 w-7 items-center justify-center rounded-full">
                      <User2 className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask about coverage gaps, assumptions, next advisor actions..."
              className="min-h-[96px]"
              disabled={isSending}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Press Enter to send, Shift+Enter for a new line.
              </p>
              <Button onClick={handleSend} disabled={!canSend}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    <SendHorizontal className="mr-1.5 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suggested Questions</CardTitle>
            <CardDescription>
              Quick prompts based on this client profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestedQuestions.map((question) => (
              <Button
                key={question}
                type="button"
                variant="outline"
                className="h-auto w-full justify-start py-2 text-left text-xs"
                onClick={() => {
                  setDraft(question);
                  setHasInteracted(true);
                }}
                disabled={isSending}
              >
                {question}
              </Button>
            ))}
            {suggestedQuestions.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Prompts will appear after client context loads.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Token Usage</CardTitle>
            <CardDescription>
              Estimated usage for assistant responses on this client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assistant replies</span>
              <Badge variant="secondary">{usage.totalAssistantMessages}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated tokens</span>
              <Badge variant="outline">{usage.totalEstimatedTokens}</Badge>
            </div>
            {hasInteracted && usage.totalEstimatedTokens > 0 && (
              <p className="text-muted-foreground text-xs">
                Token counts are estimated for visibility and guardrails.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
