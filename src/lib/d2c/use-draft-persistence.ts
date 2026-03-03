/**
 * @fileoverview React hook for D2C draft persistence.
 *
 * Provides a unified interface for the intake form that:
 * - For authenticated users: persists to the database via API
 * - For unauthenticated users: falls back to sessionStorage
 *
 * On mount:
 * 1. If clientId search param exists → load that draft from DB
 * 2. If authenticated → create/find draft via POST /api/d2c/draft
 * 3. Otherwise → load from sessionStorage
 *
 * On field change:
 * - Always update sessionStorage (immediate, for navigation between steps)
 * - If authenticated + has clientId → debounced PATCH to DB
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/server/better-auth/client";
import {
  loadD2cIntake,
  saveD2cIntake,
  DEFAULT_D2C_INTAKE,
} from "@/lib/d2c/intake-storage";
import type { D2cIntake } from "@/lib/d2c/intake-types";
import type { DraftClientRecord } from "@/lib/api/d2c-draft-helpers";
import { clientFieldsToD2cIntake } from "@/lib/d2c/client-adapter";

/** Debounce delay for DB auto-save (milliseconds). */
const AUTO_SAVE_DEBOUNCE_MS = 1_500;

interface UseDraftPersistenceOptions {
  /** Pre-existing clientId from URL search params (e.g., from resume link). */
  initialClientId?: string | null;
}

interface DraftPersistenceState {
  /** Current form state. */
  intake: D2cIntake;
  /** Whether initial data has been loaded (from DB or sessionStorage). */
  isHydrated: boolean;
  /** The draft client ID (null for unauthenticated users). */
  clientId: string | null;
  /** Whether a DB save is in progress. */
  isSaving: boolean;
  /** Update a single field (triggers sessionStorage write + debounced DB save). */
  updateField: <K extends keyof D2cIntake>(
    field: K,
    value: D2cIntake[K],
  ) => void;
}

/**
 * Hook that manages D2C intake form state with DB persistence for
 * authenticated users and sessionStorage fallback for guests.
 */
export function useDraftPersistence(
  options: UseDraftPersistenceOptions = {},
): DraftPersistenceState {
  const { initialClientId } = options;

  const [intake, setIntake] = useState<D2cIntake>(DEFAULT_D2C_INTAKE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [clientId, setClientId] = useState<string | null>(
    initialClientId ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAuthenticated = !!session?.user;

  // Refs to avoid stale closures in debounce
  const clientIdRef = useRef<string | null>(clientId);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);

  // Keep refs in sync with state (useEffect to avoid render-phase ref updates)
  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // ----------------------------------------------------------------
  // Hydration: load initial data
  // ----------------------------------------------------------------
  useEffect(() => {
    // Wait for session check to complete before hydrating
    if (isSessionPending) return;

    let cancelled = false;

    async function hydrate() {
      // Case 1: clientId from URL param (resume link) — load from DB
      if (initialClientId && isAuthenticated) {
        try {
          const res = await fetch("/api/d2c/draft");
          if (res.ok) {
            const json = (await res.json()) as {
              data?: { draft?: DraftClientRecord };
            };
            const draft = json.data?.draft;
            if (draft && !cancelled) {
              const loaded = clientFieldsToD2cIntake(draft);
              setIntake(loaded);
              saveD2cIntake(loaded);
              setClientId(draft.id);
              setIsHydrated(true);
              return;
            }
          }
        } catch {
          // Fall through to sessionStorage
        }
      }

      // Case 2: Authenticated but no clientId — create/find draft
      if (isAuthenticated && !initialClientId) {
        try {
          // Seed the draft with any existing sessionStorage data
          const stored = loadD2cIntake();
          const hasStoredData =
            stored.province !== "" ||
            stored.dateOfBirth !== "" ||
            stored.annualIncome > 0;

          const body = hasStoredData ? { intake: stored } : undefined;
          const res = await fetch("/api/d2c/draft", {
            method: "POST",
            headers: body ? { "Content-Type": "application/json" } : {},
            body: body ? JSON.stringify(body) : undefined,
          });

          if (res.ok) {
            const json = (await res.json()) as {
              data?: { draft?: DraftClientRecord; existed?: boolean };
            };
            const draft = json.data?.draft;
            if (draft && !cancelled) {
              // If draft existed on server, use server data (source of truth)
              if (json.data?.existed) {
                const loaded = clientFieldsToD2cIntake(draft);
                setIntake(loaded);
                saveD2cIntake(loaded);
              } else {
                // New draft created — use local sessionStorage data
                setIntake(stored);
              }
              setClientId(draft.id);
              setIsHydrated(true);
              return;
            }
          }
        } catch {
          // Fall through to sessionStorage
        }
      }

      // Case 3: Unauthenticated or API failed — sessionStorage only
      if (!cancelled) {
        setIntake(loadD2cIntake());
        setIsHydrated(true);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [isSessionPending, isAuthenticated, initialClientId]);

  // ----------------------------------------------------------------
  // Debounced DB save
  // ----------------------------------------------------------------
  const saveToDB = useCallback((updatedIntake: D2cIntake) => {
    if (!isAuthenticatedRef.current || !clientIdRef.current) return;

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const cId = clientIdRef.current;
      if (!cId) return;

      setIsSaving(true);
      fetch(`/api/d2c/draft/${cId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: updatedIntake }),
      })
        .catch(() => {
          // Silently fail — sessionStorage still has the data
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, AUTO_SAVE_DEBOUNCE_MS);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ----------------------------------------------------------------
  // Field update handler
  // ----------------------------------------------------------------
  const updateField = useCallback(
    <K extends keyof D2cIntake>(field: K, value: D2cIntake[K]) => {
      setIntake((prev) => {
        const updated = { ...prev, [field]: value };
        // Always persist to sessionStorage (immediate, for step navigation)
        saveD2cIntake(updated);
        // Debounced persist to DB for authenticated users
        saveToDB(updated);
        return updated;
      });
    },
    [saveToDB],
  );

  return {
    intake,
    isHydrated,
    clientId,
    isSaving,
    updateField,
  };
}
