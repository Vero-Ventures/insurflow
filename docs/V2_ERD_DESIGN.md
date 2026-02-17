# InsurFlow Data Model Status (v2)

## Important

This document is now a lightweight map.

The **source of truth** for schema is:

- `src/server/db/schema.ts`

If this file and code differ, trust the code.

---

## Why This Was Updated

The previous ERD doc described older assumptions (including non-US enums and modules not currently implemented). That created confusion during product and backlog updates.

This version aligns with the current client-first MVP direction and existing schema.

---

## Core Entities in Active Use

Authentication and sessions:

- `user`
- `session`
- `account`
- `verification`

Client planning domain:

- `clients`
- `assets`
- `debts`
- `beneficiaries`
- `assetBeneficiaryAllocations`
- `businesses`
- `keyPeople`
- `shareholders`

Notes:

- Client geography uses US `state` enum.
- Domain focuses on advisor-managed planning records and calculations.

---

## Simplified Relationship Map

```text
user
  └─ clients
      ├─ assets
      │   └─ assetBeneficiaryAllocations
      ├─ debts
      ├─ beneficiaries
      └─ businesses
          ├─ keyPeople
          └─ shareholders
```

---

## Change Policy

When schema changes:

1. Update `src/server/db/schema.ts`
2. Generate/apply migrations as needed
3. Update this document in the same PR with only high-level structural changes

Keep this file short and operational.
