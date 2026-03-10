# Canada-First Consumer Copy Cleanup Notes

Updated for issues #291 and #292.

## Remaining US-Specific Behavior (Intentional MVP Exception)

- The demo estimate screen still renders `RateTableDisplay` using
  `getStateRateTable(...)` from `src/lib/transparency/rate-tables.ts`.
- That reference table contains US-oriented tax and probate labels/data.

## Why This Is Retained In This Pass

- This change set is intentionally scoped to consumer-facing UI copy and wording
  updates.
- Replacing the underlying transparency dataset is a separate data/modeling task
  and was kept out of scope to avoid broad non-copy changes.

## Follow-Up Direction

- Replace demo transparency table data with a Canada-specific dataset in a
  dedicated follow-up task.
- Keep the current non-binding estimate disclaimers and methodology visibility
  behavior unchanged during that migration.
