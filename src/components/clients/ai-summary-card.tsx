"use client";

import { useState, useCallback } from "react";
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
import { Sparkles, RefreshCw, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AISummaryCardProps {
  clientId: string;
  /** Whether to hide the card entirely (e.g., when not enough data) */
  hidden?: boolean;
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
export function AISummaryCard({ clientId, hidden }: AISummaryCardProps) {
  const [letter, setLetter] = useState<string | null>(null);
  const [editedLetter, setEditedLetter] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const generateLetter = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}/generate-letter`, {
        method: "POST",
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
  }, [clientId]);

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
      setTimeout(() => setHasCopied(false), 2000);
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
    <Card className="print:border-gray-300 print:shadow-none">
      <CardHeader className="print:pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle>AI Recommendation Letter</CardTitle>
          </div>
          {letter && (
            <div className="flex items-center gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={isGenerating}
              >
                {hasCopied ? (
                  <Check className="mr-1 h-4 w-4" />
                ) : (
                  <Copy className="mr-1 h-4 w-4" />
                )}
                {hasCopied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <RefreshCw
                  className={`mr-1 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
                />
                Regenerate
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          {letter
            ? `Generated on ${new Date(generatedAt!).toLocaleString()}`
            : 'Generate a professional "Reasons Why" compliance letter using AI'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Generation failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {isGenerating ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <p className="text-muted-foreground mt-4 text-center text-sm">
              Generating your personalized recommendation letter...
            </p>
          </div>
        ) : letter ? (
          <div className="space-y-4">
            {isEditing ? (
              <Textarea
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
                className="min-h-[300px] font-serif text-sm leading-relaxed"
                placeholder="Edit the generated letter..."
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-white p-4 font-serif leading-relaxed whitespace-pre-wrap dark:bg-gray-950">
                {letter}
              </div>
            )}

            <div className="flex justify-end gap-2 print:hidden">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEditToggle}>
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEditToggle}>
                  Edit Letter
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="text-muted-foreground mb-4 h-12 w-12" />
            <p className="text-muted-foreground mb-4 max-w-md text-sm">
              Generate a professional &quot;Reasons Why&quot; letter that
              explains your insurance recommendation. This compliance document
              is based on the client&apos;s financial data and calculated
              insurance needs.
            </p>
            <Button
              onClick={generateLetter}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
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
    <Card>
      <CardHeader>
        <Skeleton className="mb-2 h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-8">
          <Skeleton className="mb-4 h-12 w-12 rounded-full" />
          <Skeleton className="mb-4 h-4 w-72" />
          <Skeleton className="h-10 w-36" />
        </div>
      </CardContent>
    </Card>
  );
}
