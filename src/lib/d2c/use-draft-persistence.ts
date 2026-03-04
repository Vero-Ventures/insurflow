/**
 * @fileoverview React hook for D2C draft persistence.
 *
 * Provides a unified interface for the intake form that:
 * - For authenticated users: persists to the database via API
 * - For unauthenticated users: falls back to sessionStorage
 *
 * On mount:
 * 1. If clientId search param exists → load that specific draft from DB
 * 2. If authenticated (no clientId) → GET existing draft (don't create one)
 * 3. Otherwise → load from sessionStorage
 *
 * On first field change (authenticated, no draft yet):
 * - POST /api/d2c/draft to create the draft, then PATCH for updates
 *
 * On subsequent field changes:
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
 *
 * Draft creation is deferred until the user actually modifies a field,
 * avoiding a DB row with sentinel defaults being created the moment the
 * intake page is opened.
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

  // Refs to avoid stale closures in debounce / ensureDraft
  const clientIdRef = useRef<string | null>(clientId);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const draftCreationInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const pendingIntakeRef = useRef<D2cIntake | null>(null);

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
      // Case 1: clientId from URL param (resume link) — load specific draft
      if (initialClientId && isAuthenticated) {
        try {
          const res = await fetch(
            `/api/d2c/draft/${encodeURIComponent(initialClientId)}`,
          );
          if (res.ok) {
            const json = (await res.json()) as {
              draft?: DraftClientRecord;
            };
            const draft = json.draft;
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

        if (!cancelled) {
          setClientId(null);
          clientIdRef.current = null;
        }
      }

      // Case 2: Authenticated but no clientId — check for existing draft
      // (read-only GET, do NOT create a new draft on page load)
      if (isAuthenticated && !initialClientId) {
        try {
          const res = await fetch("/api/d2c/draft");
          if (res.ok) {
            const json = (await res.json()) as {
              draft?: DraftClientRecord;
            };
            const draft = json.draft;
            if (draft && !cancelled) {
              const loaded = clientFieldsToD2cIntake(draft);
              setIntake(loaded);
              saveD2cIntake(loaded);
              setClientId(draft.id);
              setIsHydrated(true);
              return;
            }
          }
          // 404 = no existing draft — fall through to sessionStorage
        } catch {
          // Fall through to sessionStorage
        }
      }

      // Case 3: Unauthenticated, no existing draft, or API failed
      if (!cancelled) {
        if (isAuthenticated) {
          setIntake(DEFAULT_D2C_INTAKE);
          saveD2cIntake(DEFAULT_D2C_INTAKE);
        } else {
          setIntake(loadD2cIntake());
        }
        setIsHydrated(true);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [isSessionPending, isAuthenticated, initialClientId]);

  // ----------------------------------------------------------------
  // Lazy draft creation (called on first field update when no draft)
  // ----------------------------------------------------------------
  const ensureDraft = useCallback(
    async (currentIntake: D2cIntake): Promise<string | null> => {
      // Already have a draft or creation is in flight
      if (clientIdRef.current) return clientIdRef.current;
      if (!isAuthenticatedRef.current) return null;
      if (draftCreationInFlightRef.current) return null;

      draftCreationInFlightRef.current = true;
      try {
        const res = await fetch("/api/d2c/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intake: currentIntake }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            draft?: DraftClientRecord;
            existed?: boolean;
          };
          const draft = json.draft;
          if (draft) {
            setClientId(draft.id);
            clientIdRef.current = draft.id;
            return draft.id;
          }
        }
      } catch {
        // Silent fail — sessionStorage still has the data
      } finally {
        draftCreationInFlightRef.current = false;
      }

      return null;
    },
    [],
  );

  // ----------------------------------------------------------------
  // Debounced DB save
  // ----------------------------------------------------------------
  const flushSaveQueue = useCallback(() => {
    if (saveInFlightRef.current || !isAuthenticatedRef.current) return;

    saveInFlightRef.current = true;
    setIsSaving(true);

    void (async () => {
      try {
        while (pendingIntakeRef.current) {
          const intakeToSave = pendingIntakeRef.current;
          pendingIntakeRef.current = null;

          const cId = clientIdRef.current ?? (await ensureDraft(intakeToSave));
          if (!cId) continue;

          try {
            await fetch(`/api/d2c/draft/${encodeURIComponent(cId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ intake: intakeToSave }),
            });
          } catch {
            // Silently fail — sessionStorage still has the data
          }
        }
      } finally {
        saveInFlightRef.current = false;
        setIsSaving(false);

        // Handle updates queued after the loop exited but before saveInFlight flipped.
        if (pendingIntakeRef.current) {
          flushSaveQueue();
        }
      }
    })();
  }, [ensureDraft]);

  const saveToDB = useCallback(
    (updatedIntake: D2cIntake) => {
      if (!isAuthenticatedRef.current) return;

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        pendingIntakeRef.current = updatedIntake;
        flushSaveQueue();
      }, AUTO_SAVE_DEBOUNCE_MS);
    },
    [flushSaveQueue],
  );

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
