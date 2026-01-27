# FNA V2 Database Schema Design

## Executive Summary

This document presents a comprehensive redesign of the FNA database schema, addressing all identified gaps from V1 while maintaining backward compatibility where possible. The V2 schema introduces proper user management, audit trails, enhanced financial modeling, and flexible compliance tracking.

---

## Design Principles

1. **User-Centric**: Local user records with external auth sync
2. **Auditable**: Full change history on all entities
3. **Flexible**: Dynamic configurations over hardcoded fields
4. **Relational**: Proper normalization with clear relationships
5. **Secure**: Row-level security ready, soft deletes, encryption-ready
6. **Extensible**: JSONB for metadata, enum tables for lookups

---

## V2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    IDENTITY & ACCESS                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐   │
│  │    organizations    │       │        users        │       │   user_preferences  │   │
│  ├─────────────────────┤       ├─────────────────────┤       ├─────────────────────┤   │
│  │ id (PK, UUID)       │◄──┐   │ id (PK, UUID)       │──────►│ id (PK, UUID)       │   │
│  │ name                │   │   │ externalId (UQ)     │       │ userId (FK, UQ)     │   │
│  │ slug (UQ)           │   │   │ email (UQ)          │       │ theme               │   │
│  │ settings (JSONB)    │   │   │ firstName           │       │ notifications       │   │
│  │ subscriptionId (FK) │   └───│ organizationId (FK) │       │ defaultProvince     │   │
│  │ createdAt           │       │ role (enum)         │       │ settings (JSONB)    │   │
│  │ updatedAt           │       │ status (enum)       │       │ createdAt           │   │
│  │ deletedAt           │       │ lastLoginAt         │       │ updatedAt           │   │
│  └─────────────────────┘       │ createdAt           │       └─────────────────────┘   │
│           │                    │ updatedAt           │                                  │
│           │                    │ deletedAt           │                                  │
│           │                    └─────────────────────┘                                  │
│           │                              │                                              │
│           ▼                              │                                              │
│  ┌─────────────────────┐                 │       ┌─────────────────────┐               │
│  │    subscriptions    │                 │       │     invitations     │               │
│  ├─────────────────────┤                 │       ├─────────────────────┤               │
│  │ id (PK, UUID)       │                 │       │ id (PK, UUID)       │               │
│  │ stripeCustomerId    │                 │       │ organizationId (FK) │               │
│  │ stripeSubscriptionId│                 │       │ invitedByUserId(FK) │◄──────────────┘
│  │ stripePriceId       │                 │       │ email               │               │
│  │ status (enum)       │                 │       │ role                │               │
│  │ seats               │                 │       │ token (UQ)          │               │
│  │ currentPeriodStart  │                 │       │ expiresAt           │               │
│  │ currentPeriodEnd    │                 │       │ acceptedAt          │               │
│  │ canceledAt          │                 │       │ createdAt           │               │
│  │ createdAt           │                 │       └─────────────────────┘               │
│  │ updatedAt           │                 │                                              │
│  └─────────────────────┘                 │                                              │
│                                          │                                              │
└──────────────────────────────────────────┼──────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────┼──────────────────────────────────────────────┐
│                                    AUDIT SYSTEM                                          │
├──────────────────────────────────────────┼──────────────────────────────────────────────┤
│                                          │                                              │
│  ┌───────────────────────────────────────┴───────────────────────────────────────────┐  │
│  │                                  audit_logs                                        │  │
│  ├───────────────────────────────────────────────────────────────────────────────────┤  │
│  │ id (PK, UUID)                                                                     │  │
│  │ userId (FK → users)           -- Who made the change                              │  │
│  │ organizationId (FK)           -- Org context                                      │  │
│  │ entityType (enum)             -- clients, assets, debts, etc.                     │  │
│  │ entityId (UUID)               -- ID of changed record                             │  │
│  │ action (enum)                 -- create, update, delete, restore                  │  │
│  │ changes (JSONB)               -- { field: { old: x, new: y } }                    │  │
│  │ metadata (JSONB)              -- IP, user agent, etc.                             │  │
│  │ createdAt                                                                         │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT DOMAIN                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│                              ┌───────────────────────────┐                              │
│                              │          clients          │                              │
│                              ├───────────────────────────┤                              │
│                              │ id (PK, UUID)             │                              │
│                              │ organizationId (FK)       │◄─── Org owns clients         │
│                              │ createdByUserId (FK)      │◄─── User created             │
│                              │ assignedToUserId (FK)     │◄─── Advisor assigned         │
│                              │ spouseClientId (FK, self) │◄─── Links to spouse          │
│                              │ ─────────────────────     │                              │
│                              │ firstName                 │                              │
│                              │ lastName                  │                              │
│                              │ email                     │                              │
│                              │ phone                     │                              │
│                              │ dateOfBirth               │                              │
│                              │ province (enum)           │                              │
│                              │ sex (enum)                │                              │
│                              │ ─────────────────────     │                              │
│                              │ smokingStatus (enum)      │     ┌───────────────────┐    │
│                              │ healthClass (enum)        │     │   client_notes    │    │
│                              │ lifeExpectancy            │     ├───────────────────┤    │
│                              │ ─────────────────────     │     │ id (PK, UUID)     │    │
│                              │ annualIncome              │     │ clientId (FK)     │◄───┤
│                              │ employmentStatus (enum)   │     │ userId (FK)       │    │
│                              │ occupation                │     │ content           │    │
│                              │ employer                  │     │ isPinned          │    │
│                              │ ─────────────────────     │     │ createdAt         │    │
│                              │ taxFreezeYear             │     │ updatedAt         │    │
│                              │ liquidityAllocation       │     │ deletedAt         │    │
│                              │ ─────────────────────     │     └───────────────────┘    │
│                              │ status (enum)             │                              │
│                              │ onboardingStep            │                              │
│                              │ metadata (JSONB)          │                              │
│                              │ ─────────────────────     │                              │
│                              │ createdAt                 │                              │
│                              │ updatedAt                 │                              │
│                              │ deletedAt                 │                              │
│                              └─────────────┬─────────────┘                              │
│                                            │                                            │
│    ┌────────────┬────────────┬─────────────┼─────────────┬────────────┬────────────┐    │
│    │            │            │             │             │            │            │    │
│    ▼            ▼            ▼             ▼             ▼            ▼            ▼    │
│ ┌──────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌───────┐   │
│ │benefi│  │  assets  │  │ debts  │  │businesses│  │  goals  │  │policies│  │letters│   │
│ │ciari.│  │          │  │        │  │          │  │         │  │  (NEW) │  │ (NEW) │   │
│ └──┬───┘  └────┬─────┘  └────────┘  └────┬─────┘  └─────────┘  └────────┘  └───────┘   │
│    │           │                         │                                             │
│    │           │                    ┌────┴────┐                                        │
│    │           │                    │         │                                        │
│    │           │                    ▼         ▼                                        │
│    │           │              ┌──────────┐ ┌──────────┐                                │
│    │           │              │sharehold.│ │keyPeople │                                │
│    │           │              └──────────┘ └──────────┘                                │
│    │           │                                                                       │
│    └───────────┴─────────────────────┐                                                 │
│                                      │                                                 │
│                                      ▼                                                 │
│                       ┌────────────────────────────┐                                   │
│                       │    asset_beneficiaries     │                                   │
│                       └────────────────────────────┘                                   │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  DOCUMENTS & FILES                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  ┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐  │
│  │      documents      │       │    illustrations    │       │    file_versions    │  │
│  ├─────────────────────┤       ├─────────────────────┤       ├─────────────────────┤  │
│  │ id (PK, UUID)       │       │ id (PK, UUID)       │       │ id (PK, UUID)       │  │
│  │ clientId (FK)       │       │ clientId (FK)       │       │ documentId (FK)     │  │
│  │ uploadedByUserId    │       │ policyId (FK)       │◄──┐   │ version             │  │
│  │ category (enum)     │       │ uploadedByUserId    │   │   │ fileKey             │  │
│  │ name                │       │ carrier (enum)      │   │   │ fileName            │  │
│  │ description         │       │ productType         │   │   │ fileSize            │  │
│  │ fileKey             │       │ fileKey             │   │   │ fileUrl             │  │
│  │ fileName            │       │ fileName            │   │   │ uploadedByUserId    │  │
│  │ fileSize            │       │ fileSize            │   │   │ createdAt           │  │
│  │ fileUrl             │       │ fileUrl             │   │   └─────────────────────┘  │
│  │ mimeType            │       │ parsedData (JSONB)  │   │                            │
│  │ metadata (JSONB)    │       │ createdAt           │   │                            │
│  │ createdAt           │       │ deletedAt           │   │                            │
│  │ deletedAt           │       └─────────────────────┘   │                            │
│  └─────────────────────┘                                 │                            │
│                                                          │                            │
└──────────────────────────────────────────────────────────┼────────────────────────────┘
                                                           │
┌──────────────────────────────────────────────────────────┼────────────────────────────┐
│                              COMPLIANCE & CHECKLISTS                                   │
├──────────────────────────────────────────────────────────┼────────────────────────────┤
│                                                          │                            │
│  ┌───────────────────────┐    ┌───────────────────────┐  │  ┌───────────────────────┐│
│  │  checklist_templates  │    │      checklists       │  │  │   checklist_items     ││
│  ├───────────────────────┤    ├───────────────────────┤  │  ├───────────────────────┤│
│  │ id (PK, UUID)         │◄───│ templateId (FK)       │  │  │ id (PK, UUID)         ││
│  │ organizationId (FK)   │    │ id (PK, UUID)         │◄─┼──│ checklistId (FK)      ││
│  │ name                  │    │ clientId (FK)         │  │  │ templateItemId (FK)   ││
│  │ type (enum)           │    │ policyId (FK)         │──┘  │ label                 ││
│  │ description           │    │ type (enum)           │     │ description           ││
│  │ isDefault             │    │ status (enum)         │     │ isCompleted           ││
│  │ isActive              │    │ completedAt           │     │ completedAt           ││
│  │ createdAt             │    │ completedByUserId     │     │ completedByUserId     ││
│  │ updatedAt             │    │ metadata (JSONB)      │     │ notes                 ││
│  └───────────┬───────────┘    │ createdAt             │     │ attachmentUrl         ││
│              │                │ updatedAt             │     │ sortOrder             ││
│              ▼                └───────────────────────┘     │ createdAt             ││
│  ┌───────────────────────┐                                  │ updatedAt             ││
│  │checklist_template_item│                                  └───────────────────────┘│
│  ├───────────────────────┤                                                           │
│  │ id (PK, UUID)         │                                                           │
│  │ templateId (FK)       │                                                           │
│  │ label                 │                                                           │
│  │ description           │                                                           │
│  │ isRequired            │                                                           │
│  │ sortOrder             │                                                           │
│  │ metadata (JSONB)      │                                                           │
│  └───────────────────────┘                                                           │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Table Specifications

### Identity & Access Module

#### organizations

Multi-tenant organization support.

| Column         | Type         | Constraints                   | Description             |
| -------------- | ------------ | ----------------------------- | ----------------------- |
| id             | uuid         | PK, DEFAULT gen_random_uuid() | Primary key             |
| name           | varchar(255) | NOT NULL                      | Organization name       |
| slug           | varchar(100) | NOT NULL, UNIQUE              | URL-friendly identifier |
| settings       | jsonb        | DEFAULT '{}'                  | Org-level settings      |
| subscriptionId | uuid         | FK → subscriptions            | Billing subscription    |
| createdAt      | timestamptz  | NOT NULL, DEFAULT now()       | Creation time           |
| updatedAt      | timestamptz  | NOT NULL, DEFAULT now()       | Last update             |
| deletedAt      | timestamptz  | NULLABLE                      | Soft delete             |

**Indexes:**

- `idx_organizations_slug` ON slug
- `idx_organizations_subscription_id` ON subscriptionId

---

#### users

Local user records synced with external auth.

| Column         | Type         | Constraints                   | Description     |
| -------------- | ------------ | ----------------------------- | --------------- |
| id             | uuid         | PK, DEFAULT gen_random_uuid() | Primary key     |
| externalId     | varchar(255) | NOT NULL, UNIQUE              | Kinde/Auth0 ID  |
| email          | varchar(255) | NOT NULL, UNIQUE              | Email address   |
| firstName      | varchar(100) | NOT NULL                      | First name      |
| lastName       | varchar(100) | NOT NULL                      | Last name       |
| avatarUrl      | text         | NULLABLE                      | Profile picture |
| organizationId | uuid         | FK → organizations, NOT NULL  | Parent org      |
| role           | user_role    | NOT NULL, DEFAULT 'advisor'   | Permission role |
| status         | user_status  | NOT NULL, DEFAULT 'active'    | Account status  |
| lastLoginAt    | timestamptz  | NULLABLE                      | Last login time |
| createdAt      | timestamptz  | NOT NULL, DEFAULT now()       | Creation time   |
| updatedAt      | timestamptz  | NOT NULL, DEFAULT now()       | Last update     |
| deletedAt      | timestamptz  | NULLABLE                      | Soft delete     |

**Enums:**

```sql
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'advisor', 'assistant', 'viewer');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deactivated');
```

**Indexes:**

- `idx_users_external_id` ON externalId
- `idx_users_email` ON email
- `idx_users_organization_id` ON organizationId

---

#### user_preferences

User-specific settings and preferences.

| Column          | Type        | Constraints                   | Description                      |
| --------------- | ----------- | ----------------------------- | -------------------------------- |
| id              | uuid        | PK, DEFAULT gen_random_uuid() | Primary key                      |
| userId          | uuid        | FK → users, NOT NULL, UNIQUE  | Parent user                      |
| theme           | varchar(20) | DEFAULT 'system'              | UI theme preference              |
| notifications   | jsonb       | DEFAULT '{}'                  | Notification settings            |
| defaultProvince | province    | NULLABLE                      | Default province for new clients |
| settings        | jsonb       | DEFAULT '{}'                  | Additional preferences           |
| createdAt       | timestamptz | NOT NULL, DEFAULT now()       | Creation time                    |
| updatedAt       | timestamptz | NOT NULL, DEFAULT now()       | Last update                      |

---

#### subscriptions

Enhanced Stripe subscription tracking.

| Column               | Type                | Constraints                   | Description          |
| -------------------- | ------------------- | ----------------------------- | -------------------- |
| id                   | uuid                | PK, DEFAULT gen_random_uuid() | Primary key          |
| stripeCustomerId     | varchar(255)        | NOT NULL, UNIQUE              | Stripe customer      |
| stripeSubscriptionId | varchar(255)        | NOT NULL, UNIQUE              | Stripe subscription  |
| stripePriceId        | varchar(255)        | NOT NULL                      | Price/plan ID        |
| status               | subscription_status | NOT NULL                      | Current status       |
| seats                | integer             | DEFAULT 1                     | Licensed seats       |
| currentPeriodStart   | timestamptz         | NOT NULL                      | Billing period start |
| currentPeriodEnd     | timestamptz         | NOT NULL                      | Billing period end   |
| canceledAt           | timestamptz         | NULLABLE                      | Cancellation time    |
| createdAt            | timestamptz         | NOT NULL, DEFAULT now()       | Creation time        |
| updatedAt            | timestamptz         | NOT NULL, DEFAULT now()       | Last update          |

**Enums:**

```sql
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
);
```

---

#### invitations

Team member invitations with tokens.

| Column          | Type         | Constraints                   | Description     |
| --------------- | ------------ | ----------------------------- | --------------- |
| id              | uuid         | PK, DEFAULT gen_random_uuid() | Primary key     |
| organizationId  | uuid         | FK → organizations, NOT NULL  | Target org      |
| invitedByUserId | uuid         | FK → users, NOT NULL          | Inviting user   |
| email           | varchar(255) | NOT NULL                      | Invitee email   |
| role            | user_role    | NOT NULL, DEFAULT 'advisor'   | Assigned role   |
| token           | varchar(64)  | NOT NULL, UNIQUE              | Invite token    |
| expiresAt       | timestamptz  | NOT NULL                      | Expiration time |
| acceptedAt      | timestamptz  | NULLABLE                      | Acceptance time |
| createdAt       | timestamptz  | NOT NULL, DEFAULT now()       | Creation time   |

**Indexes:**

- `idx_invitations_token` ON token
- `idx_invitations_email` ON email

---

### Audit Module

#### audit_logs

Complete change history for all entities.

| Column         | Type              | Constraints                   | Description                       |
| -------------- | ----------------- | ----------------------------- | --------------------------------- |
| id             | uuid              | PK, DEFAULT gen_random_uuid() | Primary key                       |
| userId         | uuid              | FK → users                    | Acting user (nullable for system) |
| organizationId | uuid              | FK → organizations, NOT NULL  | Org context                       |
| entityType     | audit_entity_type | NOT NULL                      | Table/entity name                 |
| entityId       | uuid              | NOT NULL                      | Record ID                         |
| action         | audit_action      | NOT NULL                      | Type of change                    |
| changes        | jsonb             | NOT NULL                      | Field-level changes               |
| metadata       | jsonb             | DEFAULT '{}'                  | Request context                   |
| createdAt      | timestamptz       | NOT NULL, DEFAULT now()       | Event time                        |

**Enums:**

```sql
CREATE TYPE audit_entity_type AS ENUM (
  'client', 'beneficiary', 'asset', 'debt', 'business',
  'shareholder', 'key_person', 'goal', 'policy', 'document',
  'illustration', 'checklist', 'user', 'organization'
);

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'restore', 'archive');
```

**Indexes:**

- `idx_audit_logs_entity` ON (entityType, entityId)
- `idx_audit_logs_user_id` ON userId
- `idx_audit_logs_created_at` ON createdAt DESC

**Example changes JSONB:**

```json
{
  "firstName": { "old": "John", "new": "Jonathan" },
  "annualIncome": { "old": 85000, "new": 95000 }
}
```

---

### Client Module

#### clients

Enhanced client profile with proper relationships.

| Column              | Type              | Constraints                   | Description         |
| ------------------- | ----------------- | ----------------------------- | ------------------- |
| id                  | uuid              | PK, DEFAULT gen_random_uuid() | Primary key         |
| organizationId      | uuid              | FK → organizations, NOT NULL  | Owner org           |
| createdByUserId     | uuid              | FK → users, NOT NULL          | Creator             |
| assignedToUserId    | uuid              | FK → users                    | Assigned advisor    |
| spouseClientId      | uuid              | FK → clients (self)           | Linked spouse       |
| ---                 | ---               | ---                           | **Personal Info**   |
| firstName           | varchar(100)      | NOT NULL                      | First name          |
| lastName            | varchar(100)      | NOT NULL                      | Last name           |
| email               | varchar(255)      | NULLABLE                      | Email               |
| phone               | varchar(20)       | NULLABLE                      | Phone               |
| dateOfBirth         | date              | NOT NULL                      | Birth date          |
| province            | province          | NOT NULL                      | Province            |
| sex                 | sex               | NOT NULL                      | Sex (M/F)           |
| ---                 | ---               | ---                           | **Health Info**     |
| smokingStatus       | smoking_status    | NOT NULL                      | Smoking status      |
| healthClass         | health_class      | NOT NULL                      | Insurance class     |
| lifeExpectancy      | smallint          | NOT NULL                      | Expected age        |
| ---                 | ---               | ---                           | **Financial Info**  |
| annualIncome        | numeric(14,2)     | NOT NULL                      | Yearly income       |
| employmentStatus    | employment_status | NOT NULL                      | Employment          |
| occupation          | varchar(100)      | NULLABLE                      | Job title           |
| employer            | varchar(255)      | NULLABLE                      | Employer name       |
| ---                 | ---               | ---                           | **Planning**        |
| taxFreezeYear       | smallint          | NOT NULL                      | Tax projection year |
| liquidityAllocation | numeric(6,3)      | NOT NULL                      | % to goals          |
| ---                 | ---               | ---                           | **Status**          |
| status              | client_status     | NOT NULL, DEFAULT 'draft'     | Current status      |
| onboardingStep      | smallint          | DEFAULT 1                     | Progress step       |
| metadata            | jsonb             | DEFAULT '{}'                  | Extra data          |
| ---                 | ---               | ---                           | **Timestamps**      |
| createdAt           | timestamptz       | NOT NULL, DEFAULT now()       | Creation time       |
| updatedAt           | timestamptz       | NOT NULL, DEFAULT now()       | Last update         |
| deletedAt           | timestamptz       | NULLABLE                      | Soft delete         |

**Enums:**

```sql
CREATE TYPE province AS ENUM (
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
);

CREATE TYPE sex AS ENUM ('M', 'F');

CREATE TYPE smoking_status AS ENUM ('never', 'former', 'current');

CREATE TYPE health_class AS ENUM (
  'preferred_plus', 'preferred', 'standard_plus', 'standard', 'substandard'
);

CREATE TYPE employment_status AS ENUM (
  'employed', 'self_employed', 'retired', 'unemployed', 'student', 'homemaker'
);

CREATE TYPE client_status AS ENUM (
  'draft', 'active', 'prospect', 'archived', 'deceased'
);
```

**Indexes:**

- `idx_clients_organization_id` ON organizationId
- `idx_clients_assigned_to_user_id` ON assignedToUserId
- `idx_clients_status` ON status
- `idx_clients_deleted_at` ON deletedAt WHERE deletedAt IS NULL

---

#### client_notes

Notes and annotations on clients.

| Column    | Type        | Constraints                   | Description   |
| --------- | ----------- | ----------------------------- | ------------- |
| id        | uuid        | PK, DEFAULT gen_random_uuid() | Primary key   |
| clientId  | uuid        | FK → clients, NOT NULL        | Parent client |
| userId    | uuid        | FK → users, NOT NULL          | Author        |
| content   | text        | NOT NULL                      | Note content  |
| isPinned  | boolean     | DEFAULT false                 | Pin to top    |
| createdAt | timestamptz | NOT NULL, DEFAULT now()       | Creation time |
| updatedAt | timestamptz | NOT NULL, DEFAULT now()       | Last update   |
| deletedAt | timestamptz | NULLABLE                      | Soft delete   |

---

#### beneficiaries

Enhanced with type and relationship tracking.

| Column       | Type             | Constraints                   | Description           |
| ------------ | ---------------- | ----------------------------- | --------------------- |
| id           | uuid             | PK, DEFAULT gen_random_uuid() | Primary key           |
| clientId     | uuid             | FK → clients, NOT NULL        | Parent client         |
| name         | varchar(255)     | NOT NULL                      | Full name             |
| type         | beneficiary_type | NOT NULL                      | Category              |
| relationship | varchar(100)     | NULLABLE                      | Specific relationship |
| dateOfBirth  | date             | NULLABLE                      | DOB (for minors)      |
| allocation   | numeric(6,3)     | NOT NULL                      | Default %             |
| isContingent | boolean          | DEFAULT false                 | Contingent flag       |
| metadata     | jsonb            | DEFAULT '{}'                  | Extra info            |
| createdAt    | timestamptz      | NOT NULL, DEFAULT now()       | Creation time         |
| updatedAt    | timestamptz      | NOT NULL, DEFAULT now()       | Last update           |
| deletedAt    | timestamptz      | NULLABLE                      | Soft delete           |

**Enums:**

```sql
CREATE TYPE beneficiary_type AS ENUM (
  'spouse', 'child', 'parent', 'sibling', 'other_family',
  'friend', 'charity', 'trust', 'estate', 'business', 'other'
);
```

---

#### assets

Enhanced with cost basis and ownership tracking.

| Column        | Type           | Constraints                   | Description         |
| ------------- | -------------- | ----------------------------- | ------------------- |
| id            | uuid           | PK, DEFAULT gen_random_uuid() | Primary key         |
| clientId      | uuid           | FK → clients, NOT NULL        | Owner               |
| name          | varchar(255)   | NOT NULL                      | Asset name          |
| type          | asset_type     | NOT NULL                      | Classification      |
| ---           | ---            | ---                           | **Valuation**       |
| costBasis     | numeric(14,2)  | NOT NULL                      | Original cost (ACB) |
| currentValue  | numeric(14,2)  | NOT NULL                      | Market value        |
| yearAcquired  | smallint       | NOT NULL                      | Acquisition year    |
| growthRate    | numeric(6,3)   | NOT NULL                      | Expected return     |
| term          | numeric(6,3)   | NULLABLE                      | Maturity term       |
| ---           | ---            | ---                           | **Characteristics** |
| ownership     | ownership_type | NOT NULL, DEFAULT 'sole'      | Ownership type      |
| isTaxable     | boolean        | NOT NULL                      | Taxable on death    |
| isLiquid      | boolean        | NOT NULL                      | Easily sellable     |
| toBeSold      | boolean        | NOT NULL                      | Planned sale        |
| ---           | ---            | ---                           | **Details**         |
| institution   | varchar(255)   | NULLABLE                      | Holding institution |
| accountNumber | varchar(100)   | NULLABLE                      | Account #           |
| metadata      | jsonb          | DEFAULT '{}'                  | Extra data          |
| ---           | ---            | ---                           | **Timestamps**      |
| createdAt     | timestamptz    | NOT NULL, DEFAULT now()       | Creation time       |
| updatedAt     | timestamptz    | NOT NULL, DEFAULT now()       | Last update         |
| deletedAt     | timestamptz    | NULLABLE                      | Soft delete         |

**Enums:**

```sql
CREATE TYPE asset_type AS ENUM (
  'rrsp', 'tfsa', 'non_registered', 'rrif', 'lira', 'lif',
  'real_estate', 'life_insurance', 'business_interest',
  'pension', 'stock_options', 'cryptocurrency', 'collectibles', 'other'
);

CREATE TYPE ownership_type AS ENUM ('sole', 'joint', 'corporate');
```

---

#### asset_beneficiaries

Junction table for asset-to-beneficiary allocation.

| Column        | Type         | Constraints                   | Description   |
| ------------- | ------------ | ----------------------------- | ------------- |
| id            | uuid         | PK, DEFAULT gen_random_uuid() | Primary key   |
| assetId       | uuid         | FK → assets, NOT NULL         | Asset         |
| beneficiaryId | uuid         | FK → beneficiaries, NOT NULL  | Beneficiary   |
| allocation    | numeric(6,3) | NOT NULL                      | Percentage    |
| createdAt     | timestamptz  | NOT NULL, DEFAULT now()       | Creation time |

**Constraints:**

- UNIQUE(assetId, beneficiaryId)

---

#### debts

Enhanced debt tracking.

| Column               | Type              | Constraints                   | Description          |
| -------------------- | ----------------- | ----------------------------- | -------------------- |
| id                   | uuid              | PK, DEFAULT gen_random_uuid() | Primary key          |
| clientId             | uuid              | FK → clients, NOT NULL        | Debtor               |
| name                 | varchar(255)      | NOT NULL                      | Debt description     |
| type                 | debt_type         | NOT NULL                      | Classification       |
| ---                  | ---               | ---                           | **Terms**            |
| originalPrincipal    | numeric(14,2)     | NOT NULL                      | Initial amount       |
| currentBalance       | numeric(14,2)     | NOT NULL                      | Current balance      |
| interestRate         | numeric(6,3)      | NOT NULL                      | Interest rate        |
| amortizationYears    | numeric(6,3)      | NOT NULL                      | Term                 |
| yearAcquired         | smallint          | NOT NULL                      | Start year           |
| ---                  | ---               | ---                           | **Payment**          |
| paymentFrequency     | payment_frequency | NOT NULL                      | Payment schedule     |
| paymentAmount        | numeric(14,2)     | NOT NULL                      | Payment amount       |
| ---                  | ---               | ---                           | **Insurance**        |
| isInsurable          | boolean           | NOT NULL, DEFAULT true        | Cover with insurance |
| insurableFutureValue | numeric(14,2)     | NOT NULL                      | Projected at death   |
| ---                  | ---               | ---                           | **Details**          |
| lender               | varchar(255)      | NULLABLE                      | Lender name          |
| accountNumber        | varchar(100)      | NULLABLE                      | Account #            |
| metadata             | jsonb             | DEFAULT '{}'                  | Extra data           |
| ---                  | ---               | ---                           | **Timestamps**       |
| createdAt            | timestamptz       | NOT NULL, DEFAULT now()       | Creation time        |
| updatedAt            | timestamptz       | NOT NULL, DEFAULT now()       | Last update          |
| deletedAt            | timestamptz       | NULLABLE                      | Soft delete          |

**Enums:**

```sql
CREATE TYPE debt_type AS ENUM (
  'mortgage', 'heloc', 'car_loan', 'student_loan',
  'personal_loan', 'credit_card', 'line_of_credit',
  'business_loan', 'other'
);

CREATE TYPE payment_frequency AS ENUM (
  'weekly', 'biweekly', 'semi_monthly', 'monthly',
  'quarterly', 'annually'
);
```

---

#### businesses

Business ownership tracking.

| Column                      | Type               | Constraints                   | Description          |
| --------------------------- | ------------------ | ----------------------------- | -------------------- |
| id                          | uuid               | PK, DEFAULT gen_random_uuid() | Primary key          |
| clientId                    | uuid               | FK → clients, NOT NULL        | Owner                |
| name                        | varchar(255)       | NOT NULL                      | Business name        |
| industry                    | varchar(100)       | NULLABLE                      | Industry             |
| legalStructure              | business_structure | NOT NULL                      | Legal type           |
| ---                         | ---                | ---                           | **Valuation**        |
| currentValuation            | numeric(14,2)      | NOT NULL                      | Current value        |
| purchasePrice               | numeric(14,2)      | NOT NULL                      | Original cost        |
| yearAcquired                | smallint           | NOT NULL                      | Acquisition year     |
| ebitda                      | numeric(14,2)      | NOT NULL                      | Annual EBITDA        |
| appreciationRate            | numeric(6,3)       | NOT NULL                      | Growth rate          |
| valuationMultiple           | numeric(6,2)       | NULLABLE                      | EBITDA multiple      |
| ---                         | ---                | ---                           | **Client Share**     |
| clientOwnershipPct          | numeric(6,3)       | NOT NULL                      | Client's %           |
| clientEbitdaContributionPct | numeric(6,3)       | NOT NULL                      | Revenue contribution |
| ---                         | ---                | ---                           | **Insurance**        |
| shareholderInsuranceAmount  | numeric(14,2)      | NOT NULL                      | Buy-sell coverage    |
| keyPersonInsuranceAmount    | numeric(14,2)      | NOT NULL                      | Key person coverage  |
| ---                         | ---                | ---                           | **Planning**         |
| successionPlan              | text               | NULLABLE                      | Notes                |
| toBeSold                    | boolean            | NOT NULL                      | Exit planned         |
| estimatedSaleYear           | smallint           | NULLABLE                      | Target exit year     |
| metadata                    | jsonb              | DEFAULT '{}'                  | Extra data           |
| ---                         | ---                | ---                           | **Timestamps**       |
| createdAt                   | timestamptz        | NOT NULL, DEFAULT now()       | Creation time        |
| updatedAt                   | timestamptz        | NOT NULL, DEFAULT now()       | Last update          |
| deletedAt                   | timestamptz        | NULLABLE                      | Soft delete          |

**Enums:**

```sql
CREATE TYPE business_structure AS ENUM (
  'sole_proprietorship', 'partnership', 'corporation',
  'professional_corporation', 'cooperative', 'other'
);
```

---

#### shareholders

Co-owners of businesses.

| Column              | Type          | Constraints                   | Description      |
| ------------------- | ------------- | ----------------------------- | ---------------- |
| id                  | uuid          | PK, DEFAULT gen_random_uuid() | Primary key      |
| businessId          | uuid          | FK → businesses, NOT NULL     | Parent business  |
| name                | varchar(255)  | NOT NULL                      | Shareholder name |
| ownershipPct        | numeric(6,3)  | NOT NULL                      | Ownership %      |
| insuranceCoverage   | numeric(14,2) | NOT NULL                      | Coverage amount  |
| hasBuySellAgreement | boolean       | DEFAULT false                 | Agreement exists |
| priority            | integer       | DEFAULT 100                   | Sort order       |
| metadata            | jsonb         | DEFAULT '{}'                  | Extra data       |
| createdAt           | timestamptz   | NOT NULL, DEFAULT now()       | Creation time    |
| updatedAt           | timestamptz   | NOT NULL, DEFAULT now()       | Last update      |
| deletedAt           | timestamptz   | NULLABLE                      | Soft delete      |

---

#### key_people

Key person insurance tracking.

| Column                | Type          | Constraints                   | Description     |
| --------------------- | ------------- | ----------------------------- | --------------- |
| id                    | uuid          | PK, DEFAULT gen_random_uuid() | Primary key     |
| businessId            | uuid          | FK → businesses, NOT NULL     | Parent business |
| name                  | varchar(255)  | NOT NULL                      | Person name     |
| role                  | varchar(100)  | NOT NULL                      | Job title       |
| ebitdaContributionPct | numeric(6,3)  | NOT NULL                      | Revenue %       |
| salary                | numeric(14,2) | NULLABLE                      | Annual salary   |
| insuranceCoverage     | numeric(14,2) | NOT NULL                      | Coverage amount |
| priority              | integer       | DEFAULT 100                   | Sort order      |
| metadata              | jsonb         | DEFAULT '{}'                  | Extra data      |
| createdAt             | timestamptz   | NOT NULL, DEFAULT now()       | Creation time   |
| updatedAt             | timestamptz   | NOT NULL, DEFAULT now()       | Last update     |
| deletedAt             | timestamptz   | NULLABLE                      | Soft delete     |

---

#### goals

Financial objectives.

| Column          | Type          | Constraints                   | Description     |
| --------------- | ------------- | ----------------------------- | --------------- |
| id              | uuid          | PK, DEFAULT gen_random_uuid() | Primary key     |
| clientId        | uuid          | FK → clients, NOT NULL        | Client          |
| name            | varchar(255)  | NOT NULL                      | Goal name       |
| type            | goal_type     | NOT NULL                      | Category        |
| targetAmount    | numeric(14,2) | NOT NULL                      | Target value    |
| currentFunding  | numeric(14,2) | DEFAULT 0                     | Current funding |
| targetYear      | smallint      | NULLABLE                      | Target year     |
| priority        | integer       | DEFAULT 100                   | Ranking         |
| isPhilanthropic | boolean       | DEFAULT false                 | Charitable      |
| notes           | text          | NULLABLE                      | Description     |
| metadata        | jsonb         | DEFAULT '{}'                  | Extra data      |
| createdAt       | timestamptz   | NOT NULL, DEFAULT now()       | Creation time   |
| updatedAt       | timestamptz   | NOT NULL, DEFAULT now()       | Last update     |
| deletedAt       | timestamptz   | NULLABLE                      | Soft delete     |

**Enums:**

```sql
CREATE TYPE goal_type AS ENUM (
  'retirement', 'education', 'emergency_fund', 'home_purchase',
  'debt_payoff', 'travel', 'legacy', 'charitable', 'other'
);
```

---

#### policies (NEW)

Structured insurance policy tracking.

| Column           | Type              | Constraints                   | Description        |
| ---------------- | ----------------- | ----------------------------- | ------------------ |
| id               | uuid              | PK, DEFAULT gen_random_uuid() | Primary key        |
| clientId         | uuid              | FK → clients, NOT NULL        | Insured            |
| ---              | ---               | ---                           | **Policy Info**    |
| carrier          | varchar(255)      | NOT NULL                      | Insurance company  |
| policyNumber     | varchar(100)      | NULLABLE                      | Policy #           |
| productType      | policy_type       | NOT NULL                      | Product type       |
| productName      | varchar(255)      | NULLABLE                      | Product name       |
| ---              | ---               | ---                           | **Coverage**       |
| faceAmount       | numeric(14,2)     | NOT NULL                      | Death benefit      |
| cashValue        | numeric(14,2)     | DEFAULT 0                     | CSV if applicable  |
| ---              | ---               | ---                           | **Premium**        |
| premiumAmount    | numeric(14,2)     | NOT NULL                      | Premium            |
| premiumFrequency | payment_frequency | NOT NULL                      | Payment frequency  |
| premiumMode      | premium_mode      | NOT NULL                      | Payment method     |
| ---              | ---               | ---                           | **Dates**          |
| effectiveDate    | date              | NOT NULL                      | Start date         |
| expiryDate       | date              | NULLABLE                      | End date (if term) |
| paidUpDate       | date              | NULLABLE                      | Paid-up date       |
| ---              | ---               | ---                           | **Status**         |
| status           | policy_status     | NOT NULL                      | Current status     |
| ownershipType    | ownership_type    | NOT NULL                      | Owner              |
| ---              | ---               | ---                           | **Riders**         |
| riders           | jsonb             | DEFAULT '[]'                  | Rider details      |
| metadata         | jsonb             | DEFAULT '{}'                  | Extra data         |
| ---              | ---               | ---                           | **Timestamps**     |
| createdAt        | timestamptz       | NOT NULL, DEFAULT now()       | Creation time      |
| updatedAt        | timestamptz       | NOT NULL, DEFAULT now()       | Last update        |
| deletedAt        | timestamptz       | NULLABLE                      | Soft delete        |

**Enums:**

```sql
CREATE TYPE policy_type AS ENUM (
  'term_10', 'term_20', 'term_30', 'term_100',
  'whole_life', 'universal_life', 'participating_whole_life',
  'disability_income', 'critical_illness', 'long_term_care',
  'group_life', 'group_disability', 'other'
);

CREATE TYPE premium_mode AS ENUM (
  'direct_billing', 'pre_authorized_debit', 'payroll_deduction',
  'credit_card', 'annual_check'
);

CREATE TYPE policy_status AS ENUM (
  'applied', 'underwriting', 'approved', 'in_force',
  'lapsed', 'surrendered', 'paid_up', 'declined', 'withdrawn'
);
```

---

#### letters (NEW)

AI-generated letter storage.

| Column          | Type          | Constraints                   | Description       |
| --------------- | ------------- | ----------------------------- | ----------------- |
| id              | uuid          | PK, DEFAULT gen_random_uuid() | Primary key       |
| clientId        | uuid          | FK → clients, NOT NULL        | Client            |
| createdByUserId | uuid          | FK → users, NOT NULL          | Creator           |
| type            | letter_type   | NOT NULL                      | Letter type       |
| title           | varchar(255)  | NOT NULL                      | Title             |
| content         | text          | NOT NULL                      | Letter content    |
| version         | integer       | DEFAULT 1                     | Version number    |
| status          | letter_status | NOT NULL                      | Current status    |
| metadata        | jsonb         | DEFAULT '{}'                  | Generation params |
| createdAt       | timestamptz   | NOT NULL, DEFAULT now()       | Creation time     |
| updatedAt       | timestamptz   | NOT NULL, DEFAULT now()       | Last update       |
| deletedAt       | timestamptz   | NULLABLE                      | Soft delete       |

**Enums:**

```sql
CREATE TYPE letter_type AS ENUM (
  'cover_letter', 'reasons_why', 'recommendation',
  'policy_summary', 'annual_review', 'custom'
);

CREATE TYPE letter_status AS ENUM ('draft', 'final', 'sent', 'archived');
```

---

### Documents Module

#### documents

Generic file uploads with versioning support.

| Column           | Type              | Constraints                   | Description   |
| ---------------- | ----------------- | ----------------------------- | ------------- |
| id               | uuid              | PK, DEFAULT gen_random_uuid() | Primary key   |
| clientId         | uuid              | FK → clients, NOT NULL        | Client        |
| uploadedByUserId | uuid              | FK → users, NOT NULL          | Uploader      |
| category         | document_category | NOT NULL                      | Category      |
| name             | varchar(255)      | NOT NULL                      | Display name  |
| description      | text              | NULLABLE                      | Description   |
| fileKey          | varchar(255)      | NOT NULL                      | Storage key   |
| fileName         | varchar(255)      | NOT NULL                      | Original name |
| fileSize         | integer           | NOT NULL                      | Size in bytes |
| fileUrl          | text              | NOT NULL                      | Access URL    |
| mimeType         | varchar(100)      | NOT NULL                      | MIME type     |
| metadata         | jsonb             | DEFAULT '{}'                  | Extra data    |
| createdAt        | timestamptz       | NOT NULL, DEFAULT now()       | Upload time   |
| deletedAt        | timestamptz       | NULLABLE                      | Soft delete   |

**Enums:**

```sql
CREATE TYPE document_category AS ENUM (
  'application', 'identification', 'financial_statement',
  'tax_return', 'will', 'trust_document', 'medical_record',
  'correspondence', 'other'
);
```

---

#### illustrations

Insurance illustration files with parsed data.

| Column           | Type         | Constraints                   | Description       |
| ---------------- | ------------ | ----------------------------- | ----------------- |
| id               | uuid         | PK, DEFAULT gen_random_uuid() | Primary key       |
| clientId         | uuid         | FK → clients, NOT NULL        | Client            |
| policyId         | uuid         | FK → policies                 | Linked policy     |
| uploadedByUserId | uuid         | FK → users, NOT NULL          | Uploader          |
| carrier          | varchar(255) | NOT NULL                      | Insurance company |
| productType      | policy_type  | NULLABLE                      | Product type      |
| productName      | varchar(255) | NULLABLE                      | Product name      |
| fileKey          | varchar(255) | NOT NULL                      | Storage key       |
| fileName         | varchar(255) | NOT NULL                      | Original name     |
| fileSize         | integer      | NOT NULL                      | Size in bytes     |
| fileUrl          | text         | NOT NULL                      | Access URL        |
| parsedData       | jsonb        | DEFAULT '{}'                  | Extracted data    |
| createdAt        | timestamptz  | NOT NULL, DEFAULT now()       | Upload time       |
| deletedAt        | timestamptz  | NULLABLE                      | Soft delete       |

---

### Compliance Module

#### checklist_templates

Configurable checklist definitions.

| Column         | Type           | Constraints                   | Description         |
| -------------- | -------------- | ----------------------------- | ------------------- |
| id             | uuid           | PK, DEFAULT gen_random_uuid() | Primary key         |
| organizationId | uuid           | FK → organizations            | Org (null = system) |
| name           | varchar(255)   | NOT NULL                      | Template name       |
| type           | checklist_type | NOT NULL                      | Category            |
| description    | text           | NULLABLE                      | Description         |
| isDefault      | boolean        | DEFAULT false                 | Auto-apply          |
| isActive       | boolean        | DEFAULT true                  | Enabled             |
| createdAt      | timestamptz    | NOT NULL, DEFAULT now()       | Creation time       |
| updatedAt      | timestamptz    | NOT NULL, DEFAULT now()       | Last update         |

**Enums:**

```sql
CREATE TYPE checklist_type AS ENUM (
  'new_business', 'settling_requirements', 'annual_review',
  'policy_replacement', 'claims', 'custom'
);
```

---

#### checklist_template_items

Items within a template.

| Column      | Type         | Constraints                        | Description     |
| ----------- | ------------ | ---------------------------------- | --------------- |
| id          | uuid         | PK, DEFAULT gen_random_uuid()      | Primary key     |
| templateId  | uuid         | FK → checklist_templates, NOT NULL | Parent template |
| label       | varchar(255) | NOT NULL                           | Item label      |
| description | text         | NULLABLE                           | Help text       |
| isRequired  | boolean      | DEFAULT false                      | Required flag   |
| sortOrder   | integer      | DEFAULT 100                        | Display order   |
| metadata    | jsonb        | DEFAULT '{}'                       | Extra config    |

---

#### checklists

Checklist instances for clients/policies.

| Column            | Type             | Constraints                     | Description       |
| ----------------- | ---------------- | ------------------------------- | ----------------- |
| id                | uuid             | PK, DEFAULT gen_random_uuid()   | Primary key       |
| templateId        | uuid             | FK → checklist_templates        | Source template   |
| clientId          | uuid             | FK → clients, NOT NULL          | Client            |
| policyId          | uuid             | FK → policies                   | Policy (optional) |
| type              | checklist_type   | NOT NULL                        | Category          |
| status            | checklist_status | NOT NULL, DEFAULT 'in_progress' | Status            |
| completedAt       | timestamptz      | NULLABLE                        | Completion time   |
| completedByUserId | uuid             | FK → users                      | Completing user   |
| metadata          | jsonb            | DEFAULT '{}'                    | Extra data        |
| createdAt         | timestamptz      | NOT NULL, DEFAULT now()         | Creation time     |
| updatedAt         | timestamptz      | NOT NULL, DEFAULT now()         | Last update       |

**Enums:**

```sql
CREATE TYPE checklist_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'cancelled'
);
```

---

#### checklist_items

Individual items within a checklist.

| Column            | Type         | Constraints                   | Description      |
| ----------------- | ------------ | ----------------------------- | ---------------- |
| id                | uuid         | PK, DEFAULT gen_random_uuid() | Primary key      |
| checklistId       | uuid         | FK → checklists, NOT NULL     | Parent checklist |
| templateItemId    | uuid         | FK → checklist_template_items | Source item      |
| label             | varchar(255) | NOT NULL                      | Item label       |
| description       | text         | NULLABLE                      | Help text        |
| isCompleted       | boolean      | DEFAULT false                 | Done flag        |
| completedAt       | timestamptz  | NULLABLE                      | Completion time  |
| completedByUserId | uuid         | FK → users                    | Completing user  |
| notes             | text         | NULLABLE                      | Notes            |
| attachmentUrl     | text         | NULLABLE                      | File attachment  |
| sortOrder         | integer      | DEFAULT 100                   | Display order    |
| createdAt         | timestamptz  | NOT NULL, DEFAULT now()       | Creation time    |
| updatedAt         | timestamptz  | NOT NULL, DEFAULT now()       | Last update      |

---

## Relationship Summary

```
organizations (1) ─────────────── (N) users
organizations (1) ─────────────── (1) subscriptions
organizations (1) ─────────────── (N) invitations
organizations (1) ─────────────── (N) clients
organizations (1) ─────────────── (N) audit_logs
organizations (1) ─────────────── (N) checklist_templates

users (1) ─────────────────────── (1) user_preferences
users (1) ─────────────────────── (N) clients (created)
users (1) ─────────────────────── (N) clients (assigned)
users (1) ─────────────────────── (N) client_notes
users (1) ─────────────────────── (N) audit_logs
users (1) ─────────────────────── (N) invitations (sent)

clients (1) ───────────────────── (1) clients (spouse - self ref)
clients (1) ───────────────────── (N) beneficiaries
clients (1) ───────────────────── (N) assets
clients (1) ───────────────────── (N) debts
clients (1) ───────────────────── (N) businesses
clients (1) ───────────────────── (N) goals
clients (1) ───────────────────── (N) policies
clients (1) ───────────────────── (N) documents
clients (1) ───────────────────── (N) illustrations
clients (1) ───────────────────── (N) letters
clients (1) ───────────────────── (N) checklists
clients (1) ───────────────────── (N) client_notes

assets (N) ────────────────────── (N) beneficiaries (via asset_beneficiaries)

businesses (1) ────────────────── (N) shareholders
businesses (1) ────────────────── (N) key_people

policies (1) ──────────────────── (N) illustrations
policies (1) ──────────────────── (N) checklists

checklist_templates (1) ───────── (N) checklist_template_items
checklist_templates (1) ───────── (N) checklists
checklists (1) ────────────────── (N) checklist_items
```

---

## Migration Strategy

### Phase 1: Foundation

1. Create new enum types
2. Create `organizations` and `users` tables
3. Migrate existing data from Kinde references
4. Create `audit_logs` table

### Phase 2: Client Enhancement

1. Add new columns to `clients` (soft delete, status, etc.)
2. Create `client_notes` table
3. Enhance `beneficiaries` with type/relationship
4. Add `costBasis` and `ownership` to `assets`

### Phase 3: New Features

1. Create `policies` table
2. Create `letters` table
3. Migrate `reasonsWhy` and `coverLetter` from clients

### Phase 4: Compliance Refactor

1. Create checklist template system
2. Migrate `new_business` and `settling_requirements` data
3. Deprecate old checklist tables

### Phase 5: Cleanup

1. Remove deprecated columns
2. Add missing indexes
3. Enable audit triggers

---

## Index Strategy

```sql
-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Users
CREATE INDEX idx_users_external_id ON users(external_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Clients
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_assigned_to ON clients(assigned_to_user_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_name ON clients(last_name, first_name);

-- Assets
CREATE INDEX idx_assets_client_id ON assets(client_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_deleted_at ON assets(deleted_at) WHERE deleted_at IS NULL;

-- Debts
CREATE INDEX idx_debts_client_id ON debts(client_id);
CREATE INDEX idx_debts_deleted_at ON debts(deleted_at) WHERE deleted_at IS NULL;

-- Businesses
CREATE INDEX idx_businesses_client_id ON businesses(client_id);
CREATE INDEX idx_businesses_deleted_at ON businesses(deleted_at) WHERE deleted_at IS NULL;

-- Policies
CREATE INDEX idx_policies_client_id ON policies(client_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_carrier ON policies(carrier);
CREATE INDEX idx_policies_deleted_at ON policies(deleted_at) WHERE deleted_at IS NULL;

-- Audit Logs
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Checklists
CREATE INDEX idx_checklists_client_id ON checklists(client_id);
CREATE INDEX idx_checklists_policy_id ON checklists(policy_id);
CREATE INDEX idx_checklists_status ON checklists(status);
```

---

## Security Considerations

### Row-Level Security (RLS)

```sql
-- Enable RLS on all client data tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Users can only see clients in their organization
CREATE POLICY clients_org_isolation ON clients
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id')::uuid);
```

### Encryption

- PII fields (email, phone, SIN) should use pgcrypto or application-level encryption
- Consider column-level encryption for `annualIncome`

### Audit

- All mutations should go through audit triggers
- Audit logs are append-only (no updates/deletes)

---

## Summary of Improvements

| Area              | V1 Issue           | V2 Solution                       |
| ----------------- | ------------------ | --------------------------------- |
| Users             | External only      | Local `users` table with sync     |
| Organizations     | Implicit           | Explicit `organizations` table    |
| Audit             | None               | Full `audit_logs` system          |
| Soft Deletes      | None               | `deletedAt` on all entities       |
| Spouse            | Beneficiary only   | Self-referential `spouseClientId` |
| Policies          | None               | New `policies` table              |
| Cost Basis        | Missing            | Added to `assets`                 |
| Beneficiary Types | None               | `type` and `relationship` fields  |
| Checklists        | Hardcoded booleans | Dynamic template system           |
| Letters           | In clients table   | Separate `letters` table          |
| Notes             | None               | `client_notes` table              |
| Indexes           | Minimal            | Comprehensive index strategy      |
| Security          | Basic              | RLS-ready, encryption-ready       |
