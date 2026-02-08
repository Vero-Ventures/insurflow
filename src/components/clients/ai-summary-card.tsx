"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { COPY_FEEDBACK_DURATION_MS } from "@/lib/constants";

interface AISummaryCardProps {
  clientId: string;
  /** Whether to hide the card entirely (e.g., when not enough data) */
  hidden?: boolean;
  /** Pre-generated letter for demo mode (skips API call, simulates generation) */
  demoLetter?: string;
}

interface GenerateLetterResponse {
  letter: string;
  generatedAt: string;
  model: string;
  clientName: string;
}

interface GenerateLetterError {
  error: string;
  message?: string;
}

/**
 * AI-powered "Reasons Why" letter generation card.
 *
 * Allows advisors to generate, view, edit, and regenerate compliance
 * letters explaining insurance recommendations using Gemini AI.
 */
export function AISummaryCard({
  clientId,
  hidden,
  demoLetter,
}: AISummaryCardProps) {
  const [letter, setLetter] = useState<string | null>(null);
  const [editedLetter, setEditedLetter] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const generateLetter = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    // Demo mode: simulate generation delay and return static letter
    if (demoLetter) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (!isMountedRef.current) return;
      setLetter(demoLetter);
      setEditedLetter(demoLetter);
      setGeneratedAt(new Date().toISOString());
      setIsEditing(false);
      setIsGenerating(false);
      toast.success("Letter generated successfully");
      return;
    }

    try {
      const response = await fetch(`/api/clients/${clientId}/generate-letter`, {
        method: "POST",
        credentials: "include",
      });

      const data = (await response.json()) as
        | GenerateLetterResponse
        | GenerateLetterError;

      if (!response.ok) {
        const errorData = data as GenerateLetterError;
        throw new Error(
          errorData.message || errorData.error || "Failed to generate letter",
        );
      }

      const successData = data as GenerateLetterResponse;
      setLetter(successData.letter);
      setEditedLetter(successData.letter);
      setGeneratedAt(successData.generatedAt);
      setIsEditing(false);

      toast.success("Letter generated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate letter";
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [clientId, demoLetter]);

  const handleRegenerate = useCallback(async () => {
    if (letter && editedLetter !== letter) {
      // User has made edits, confirm before regenerating
      const confirmed = window.confirm(
        "You have unsaved edits. Regenerating will replace the current letter. Continue?",
      );
      if (!confirmed) return;
    }
    await generateLetter();
  }, [letter, editedLetter, generateLetter]);

  const handleCopy = useCallback(async () => {
    const textToCopy = isEditing ? editedLetter : letter;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      toast.success("Letter copied to clipboard");
      // Clear any existing timeout before setting a new one
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(
        () => setHasCopied(false),
        COPY_FEEDBACK_DURATION_MS,
      );
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [letter, editedLetter, isEditing]);

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Saving edits
      setLetter(editedLetter);
      toast.success("Changes saved");
    }
    setIsEditing(!isEditing);
  }, [isEditing, editedLetter]);

  const handleCancelEdit = useCallback(() => {
    setEditedLetter(letter || "");
    setIsEditing(false);
  }, [letter]);

  if (hidden) {
    return null;
  }

  return (
    <Card className="border-border/60 shadow-sm print:border-none print:shadow-none">
      <CardHeader className="pb-4 print:hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.627_0.265_303.9)] to-[oklch(0.5_0.2_280)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">
                AI Recommendation Letter
              </CardTitle>
              <CardDescription>
                {letter
                  ? `Generated on ${new Date(generatedAt!).toLocaleString()}`
                  : "Generate a professional 'Reasons Why' compliance letter"}
              </CardDescription>
            </div>
          </div>
          {letter && (
            <div className="flex items-center gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={isGenerating}
                className="border-border/60 gap-1.5"
              >
                {hasCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {hasCopied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="border-border/60 gap-1.5"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
                />
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="print:p-0">
        {error && (
          <div className="border-destructive/20 bg-destructive/5 mb-4 flex items-start gap-3 rounded-xl border p-4 print:hidden">
            <AlertCircle className="text-destructive mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-destructive text-sm font-medium">
                Generation failed
              </p>
              <p className="text-destructive/80 text-sm">{error}</p>
            </div>
          </div>
        )}

        {isGenerating ? (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.627_0.265_303.9)] to-[oklch(0.5_0.2_280)]">
                <Sparkles className="h-5 w-5 animate-pulse text-white" />
              </div>
              <div>
                <p className="text-foreground font-medium">
                  Generating your letter...
                </p>
                <p className="text-muted-foreground text-sm">
                  This may take a few seconds
                </p>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : letter ? (
          <div className="space-y-4">
            {isEditing ? (
              <Textarea
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
                className="border-border/60 min-h-[300px] font-serif text-sm leading-relaxed"
                placeholder="Edit the generated letter..."
              />
            ) : (
              <div className="bg-muted/20 border-border/60 prose prose-sm dark:prose-invert max-w-none rounded-xl border p-6 font-serif leading-relaxed whitespace-pre-wrap print:rounded-none print:border-none print:bg-transparent print:p-0 print:text-black">
                {letter}
              </div>
            )}

            <div className="flex justify-end gap-2 print:hidden">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleEditToggle}
                    className="bg-emerald hover:bg-emerald/90 gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  className="border-border/60 gap-1.5"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Letter
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center print:hidden">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[oklch(0.627_0.265_303.9_/_0.2)] to-[oklch(0.5_0.2_280_/_0.1)] blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.627_0.265_303.9)] to-[oklch(0.5_0.2_280)]">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
            </div>
            <h3 className="font-display text-foreground mb-2 text-lg font-semibold tracking-tight">
              Generate Compliance Letter
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
              Create a professional &quot;Reasons Why&quot; letter that explains
              your insurance recommendation based on the client&apos;s financial
              data.
            </p>
            <Button
              onClick={generateLetter}
              disabled={isGenerating}
              className="gap-2 bg-gradient-to-r from-[oklch(0.627_0.265_303.9)] to-[oklch(0.5_0.2_280)] text-white shadow-lg hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              Generate Letter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for the AI summary card
 */
export function AISummaryCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-12">
          <Skeleton className="mb-6 h-16 w-16 rounded-2xl" />
          <Skeleton className="mb-2 h-5 w-48" />
          <Skeleton className="mb-6 h-4 w-72" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
