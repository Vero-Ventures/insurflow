# InsurFlow v2.0 — Product Requirements Document

## Document Info

| Field             | Value                      |
| ----------------- | -------------------------- |
| **Product Name**  | InsurFlow                  |
| **Version**       | 2.0                        |
| **Status**        | Greenfield Development     |
| **Target Market** | US Life Insurance Advisors |
| **Company**       | Vero Ventures              |
| **Last Updated**  | January 29, 2026           |

---

## Executive Summary

InsurFlow v2.0 is a modern, AI-native SaaS platform that empowers independent life insurance advisors to conduct comprehensive financial needs analyses for their clients. It replaces archaic spreadsheet workflows with an intuitive, data-driven application that automates complex estate liability calculations, income replacement modeling, and compliance document generation.

This is a **greenfield build** — while v1.0 exists as a functional reference, v2.0 will be architected from scratch to ensure a clean, modern codebase free of technical debt.

---

## Problem Statement

### Current Pain Points for Advisors

1. **Spreadsheet Hell** — Advisors rely on complex Excel workbooks that are error-prone, hard to maintain, and impossible to collaborate on
2. **Fragmented Tools** — Client data, illustrations, documents, and calculations live in disconnected systems
3. **Time-Consuming Compliance** — Writing "Reasons Why" letters and cover letters is manual and repetitive
4. **Outdated Competitors** — Existing tools (LDA, Equisoft, RazorPlan, NaviPlan) have dated UIs, complex pricing, and lack modern AI capabilities
5. **No Real-Time Collaboration** — Advisors can't collaborate on documents with clients or team members in real-time

### Opportunity

Build a lightweight, "AI-native" alternative that prioritizes UX, speed, and modern development practices to capture market share from legacy incumbents.

---

## Target Users

### Primary Persona: Independent Life Insurance Advisor

- Works independently or in a small firm (1-10 advisors)
- Serves high-net-worth clients with complex estate planning needs
- Needs to produce professional, compliant documentation
- Values speed and ease of use over feature bloat
- Comfortable with modern SaaS tools

### Secondary Persona: Advisory Firm Administrator

- Manages a team of advisors
- Needs visibility into team activity and client portfolios
- Controls billing and seat management

---

## Product Vision

> "The fastest path from client data to insurance recommendation — powered by AI."

InsurFlow will be the tool advisors open first when meeting a client, and the system of record for all client financial data, documents, and analysis outputs.

---

## Core Feature Modules

### 1. Client Management

**Purpose:** Central hub for managing client profiles and their complete financial picture.

#### Capabilities

- Create and manage client profiles
- Capture demographics: name, date of birth, state, sex
- Record health factors: smoking status, health rating
- Set life expectancy assumptions
- Track onboarding status
- Store personalized notes and context

#### User Stories

- As an advisor, I want to create a new client profile quickly so I can start the analysis process
- As an advisor, I want to see all my clients in a list with key summary info so I can manage my book of business
- As an advisor, I want to search and filter clients so I can find specific clients quickly

---

### 2. Asset Tracking

**Purpose:** Inventory all client assets with growth projections and beneficiary allocations.

#### Capabilities

- Record assets by type (real estate, investments, TFSA, RRSP, vehicles, etc.)
- Track initial value vs. current value
- Set appreciation rate and term
- Flag assets as:
  - Liquid / Illiquid
  - Taxable / Tax-free
  - To be sold / Retained
- Allocate assets to beneficiaries with percentage splits
- Calculate future value projections

#### User Stories

- As an advisor, I want to add multiple assets for a client so I can capture their complete financial picture
- As an advisor, I want to assign beneficiaries to each asset so I can model estate distribution
- As an advisor, I want to see projected asset values at different future dates so I can plan for growth

---

### 3. Business Ownership Modeling

**Purpose:** Model complex corporate ownership scenarios for business owners.

#### Capabilities

- Record business details: name, valuation, EBITDA, purchase price
- Track client's ownership percentage
- Model appreciation rate and term
- Define **Key People** with:
  - Name and role
  - EBITDA contribution percentage
  - Insurance coverage needs
- Define **Shareholders** with:
  - Name and ownership percentage
  - Buy-sell agreement terms
  - Insurance contribution requirements
- Calculate corporate insurance needs

#### User Stories

- As an advisor, I want to model a client's business ownership so I can calculate key person and shareholder insurance needs
- As an advisor, I want to add multiple key people to a business so I can assess the full risk exposure
- As an advisor, I want to calculate buy-sell funding requirements so I can recommend appropriate coverage

---

### 4. Beneficiary Management

**Purpose:** Define estate distribution wishes and identify planning gaps.

#### Capabilities

- Add beneficiaries with names and relationships
- Set desired allocation percentages
- Link beneficiaries to specific assets
- Visualize:
  - Desired distribution (what client wants)
  - Actual distribution (what will happen based on current asset allocations)
  - Gap analysis between desired and actual

#### User Stories

- As an advisor, I want to define a client's beneficiaries so I can model their estate wishes
- As an advisor, I want to see the gap between desired and actual distribution so I can identify planning opportunities

---

### 5. Debt Tracking

**Purpose:** Track liabilities and calculate insurable amounts.

#### Capabilities

- Record debt details: name, type, initial value
- Track interest rate, term, and annual payment
- Calculate insurable future value (amount to pay off debt at death)
- Support debt types: mortgages, loans, lines of credit, business debt

#### User Stories

- As an advisor, I want to add all client debts so I can include them in total insurance needs
- As an advisor, I want to see the insurable value of each debt so I can ensure proper coverage

---

### 6. Goals & Legacy Planning

**Purpose:** Capture financial goals and legacy wishes.

#### Capabilities

- Record goals with target amounts
- Categorize goals:
  - Personal financial goals
  - Philanthropic / charitable goals
- Factor goals into total needs calculations

#### User Stories

- As an advisor, I want to capture a client's financial goals so I can factor them into the analysis
- As an advisor, I want to distinguish charitable goals so I can discuss legacy planning

---

### 7. Financial Calculation Engines

**Purpose:** The core analysis engines that power InsurFlow's value proposition.

#### 7.1 Settling Requirements Calculator

Calculates the costs associated with settling an estate:

- **Estate taxes** (state-specific)
- **Final taxes** (capital gains on deemed disposition)
- **Professional fees** (legal, accounting)
- **Funeral and administrative costs**

#### 7.2 Income Replacement Calculator

Calculates ongoing income needs for survivors:

- Annual income replacement amount
- Duration of replacement (until children independent, spouse retirement, etc.)
- Present value calculation with inflation adjustment
- Factor in existing resources (survivor income, pensions)

#### 7.3 Corporate Shareholder Analysis

Calculates business-related insurance needs:

- **EBITDA Contribution Analysis** — value of key people based on their contribution to earnings
- **Key Person Insurance Needs** — coverage to replace key employees
- **Shareholder Buy-Sell Funding** — insurance to fund ownership transfers
- **Share Value Projections** — future value of ownership stakes

#### 7.4 Total Insurable Needs

Aggregates all needs into a single defensible number:

- Income replacement needs
- Debt payoff requirements
- Settling requirements (estate costs)
- Business succession needs
- Goal funding requirements
- Less: existing coverage and liquid assets

#### User Stories

- As an advisor, I want the system to calculate settling requirements automatically so I don't have to use spreadsheets
- As an advisor, I want to see a clear breakdown of total insurable needs so I can justify my recommendations to clients

---

### 8. Interactive Reporting Dashboard

**Purpose:** Visualize complex financial data in an intuitive, client-ready format.

#### Visualizations (using Recharts)

| Chart Type               | Data Displayed                          |
| ------------------------ | --------------------------------------- |
| Net Worth Chart          | Assets vs. liabilities over time        |
| Tax Burden Chart         | Projected tax liability by year         |
| Liquidity Analysis       | Liquid vs. illiquid asset breakdown     |
| Beneficiary Distribution | Desired vs. actual allocation (pie/bar) |
| Asset Diversification    | Asset mix by type                       |
| Debt Amortization        | Debt paydown over time                  |
| Goals Progress           | Goal funding status                     |
| Business Valuation       | Share value projections                 |
| EBITDA Contribution      | Key person contribution breakdown       |

#### Report Sections

- Client summary and demographics
- Asset inventory with future values
- Beneficiary allocation analysis
- Debt summary
- Business analysis (if applicable)
- Goals summary
- Total insurable needs breakdown
- Settling requirements detail
- Income replacement calculation

#### Output Formats

- Interactive on-screen dashboard
- Print-optimized view
- PDF export

#### User Stories

- As an advisor, I want to view interactive charts so I can explore the data with clients
- As an advisor, I want to generate a PDF report so I can share it with clients after meetings
- As an advisor, I want charts to be client-friendly so non-financial clients can understand them

---

### 9. GenAI "Co-Pilot"

**Purpose:** AI-powered assistant that analyzes client data and generates compliance documents.

#### Capabilities

**Document Generation:**

- Auto-generate "Reasons Why" letters explaining insurance recommendations
- Auto-generate cover letters for client reports
- Customize tone and detail level
- Edit and refine AI-generated content

**Conversational Analysis:**

- Chat interface to ask questions about a client's financial situation
- AI has full context of client data (assets, debts, businesses, goals)
- Example queries:
  - "What are the biggest risks for this client?"
  - "Summarize the key person insurance needs"
  - "What would happen to the estate if the client died today?"

**Compliance Support:**

- Ensure generated documents meet regulatory requirements
- Flag potential compliance issues in recommendations

#### User Stories

- As an advisor, I want to auto-generate a Reasons Why letter so I can save hours of writing time
- As an advisor, I want to ask the AI questions about my client so I can prepare for meetings quickly
- As an advisor, I want to edit AI-generated content so I can personalize it for each client

---

### 10. Insurance Illustration Management

**Purpose:** Upload, parse, and compare insurance policy illustrations from carriers.

#### Capabilities

- Upload Excel-based illustrations from US insurers
- Parse illustration data automatically
- Display illustration data in tables and charts
- Compare multiple illustrations side-by-side
- Track insurer and product for each illustration
- Link illustrations to specific clients

#### Supported Data Points

- Premium schedules
- Cash value projections
- Death benefit amounts
- Policy loan values
- Dividend projections (for participating policies)

#### User Stories

- As an advisor, I want to upload illustrations so I can keep them with the client file
- As an advisor, I want to compare illustrations so I can recommend the best product

---

### 11. Document Storage

**Purpose:** Centralized, secure storage for client documents.

#### Capabilities

- Upload PDFs (applications, existing policies, ID documents, etc.)
- Documents linked to specific clients
- Secure, advisor-only access
- Document categorization and tagging

#### User Stories

- As an advisor, I want to upload client documents so everything is in one place
- As an advisor, I want to find documents quickly so I don't waste time searching

---

### 12. Collaborative Document Editing

**Purpose:** Real-time collaboration on client documents and letters.

#### Capabilities

- Real-time collaborative editing using Operational Transformation (OT) and WebSockets
- Multiple users can edit simultaneously
- See other users' cursors and selections
- Version history and change tracking
- Works on: cover letters, reasons why letters, notes

#### User Stories

- As an advisor, I want to collaborate on a cover letter with my assistant in real-time so we can work together efficiently
- As an advisor, I want to see version history so I can track changes made to documents

---

### 13. Team & Multi-Tenancy

**Purpose:** Support advisory firms with multiple advisors.

#### Capabilities

- Create organizations/teams
- Invite team members via email
- Role-based access:
  - **Owner** — full admin access, billing management
  - **Admin** — manage team members, access all clients
  - **Advisor** — access own clients only
- Seat-based billing
- Shared client access within teams (configurable)

#### User Stories

- As a firm owner, I want to invite my team so we can work together on the platform
- As an admin, I want to manage team members so I can control access
- As an advisor, I want to share a client with a colleague so we can collaborate

---

### 14. Authentication & Security

**Purpose:** Secure, modern authentication using Better Auth.

#### Capabilities

- Email/password authentication
- Social login (Google, etc.)
- Multi-factor authentication (MFA)
- Session management
- Password reset flows
- Organization-level access control

#### Security Requirements

- All data encrypted in transit (HTTPS)
- Database encryption at rest
- Row-level security for multi-tenancy
- Audit logging for sensitive operations
- Data privacy compliance (US state and federal privacy laws)

---

### 15. Billing & Subscriptions

**Purpose:** SaaS monetization via Stripe.

#### Capabilities

- Subscription plans (monthly/annual)
- Seat-based pricing for teams
- Self-service plan management
- Stripe Customer Portal integration
- Invoice history
- Subscription gating (features locked without active subscription)

#### Pricing Tiers (Suggested)

| Tier             | Description  | Features                             |
| ---------------- | ------------ | ------------------------------------ |
| **Starter**      | Solo advisor | 1 seat, core features, limited AI    |
| **Professional** | Power user   | 1 seat, all features, full AI        |
| **Team**         | Small firm   | 5+ seats, collaboration, admin tools |

#### User Stories

- As an advisor, I want to subscribe easily so I can start using the platform
- As a firm owner, I want to add seats so my team can access the platform
- As a user, I want to manage my billing so I can update payment methods

---

### 16. Self-Serve Onboarding

**Purpose:** Consumer-focused onboarding that requires no sales interaction.

#### Capabilities

- Sign up without talking to sales
- Guided onboarding flow
- Interactive product tour
- Sample data to explore features
- Quick-start templates

#### User Stories

- As a new user, I want to sign up and start using the product immediately so I can evaluate it on my own
- As a new user, I want a guided tour so I can learn the features quickly

---

## Out of Scope (v2.0)

The following features are explicitly **not included** in the v2.0 release:

| Feature                        | Reason                                       |
| ------------------------------ | -------------------------------------------- |
| Mobile native apps             | Focus on responsive web first                |
| Offline mode                   | Requires significant additional architecture |
| Custom branding/white-label    | Future enterprise feature                    |
| API access for third parties   | Future platform feature                      |
| Integration with external CRMs | Future integration                           |
| Canadian market support        | US market focus for v2.0                     |

---

## Technical Architecture

### Stack

| Layer               | Technology                              |
| ------------------- | --------------------------------------- |
| **Framework**       | Next.js 14+ (App Router)                |
| **Language**        | TypeScript (Strict Mode)                |
| **Database**        | PostgreSQL (Neon)                       |
| **ORM**             | Drizzle ORM                             |
| **Authentication**  | Better Auth                             |
| **UI Components**   | shadcn/ui, Tailwind CSS                 |
| **Charts**          | Recharts                                |
| **Payments**        | Stripe                                  |
| **File Storage**    | UploadThing                             |
| **AI**              | OpenAI / Gemini API                     |
| **Real-time**       | WebSockets + Operational Transformation |
| **Hosting**         | Vercel                                  |
| **Version Control** | GitHub                                  |

### Key Architectural Decisions

1. **App Router** — Use Next.js App Router for server components and improved performance
2. **Type Safety** — Strict TypeScript throughout, Zod for runtime validation
3. **Server Actions** — Prefer server actions over API routes where appropriate
4. **Multi-tenancy** — Row-level security with organization context
5. **AI Integration** — Streaming responses for real-time AI interactions

---

## Data Model (High-Level)

```
Organizations
  └── Users (many)
  └── Subscriptions

Users
  └── Clients (many)

Clients
  ├── Assets (many)
  │     └── AssetBeneficiaries (many-to-many with Beneficiaries)
  ├── Businesses (many)
  │     ├── KeyPeople (many)
  │     └── Shareholders (many)
  ├── Beneficiaries (many)
  ├── Debts (many)
  ├── Goals (many)
  ├── Documents (many)
  ├── Illustrations (many)
  └── Budgets (one)
```

---

## Success Metrics

### Product Metrics

| Metric                       | Target       |
| ---------------------------- | ------------ |
| Time to first client created | < 5 minutes  |
| Time to generate report      | < 30 seconds |
| AI document generation time  | < 10 seconds |
| Report PDF generation        | < 5 seconds  |

### Business Metrics

| Metric                            | Target |
| --------------------------------- | ------ |
| Free trial conversion rate        | > 15%  |
| Monthly churn rate                | < 5%   |
| Net Promoter Score (NPS)          | > 50   |
| Clients per advisor (monthly avg) | > 5    |

### Technical Metrics

| Metric                       | Target  |
| ---------------------------- | ------- |
| Lighthouse performance score | > 90    |
| Core Web Vitals (all green)  | Yes     |
| Uptime                       | > 99.9% |
| CI/CD pipeline success rate  | > 95%   |

---

## Competitive Positioning

| Competitor                 | Weakness                    | InsurFlow Advantage        |
| -------------------------- | --------------------------- | -------------------------- |
| Life Design Analysis (LDA) | Dated UI, no AI             | Modern UX, AI-native       |
| Equisoft/plan              | Enterprise pricing, complex | Simple pricing, self-serve |
| RazorPlan                  | Limited customization       | Flexible, modern stack     |
| Snap Projections           | Focused on retirement       | Full insurance focus       |
| NaviPlan                   | Heavy, slow                 | Lightweight, fast          |

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

- Project setup (Next.js, Drizzle, Better Auth)
- Database schema design and migration
- Authentication and organization management
- Basic client CRUD

### Phase 2: Core Data Entry (Weeks 5-8)

- Asset management
- Business modeling (key people, shareholders)
- Beneficiary management
- Debt and goals tracking

### Phase 3: Calculation Engines (Weeks 9-12)

- Settling requirements calculator
- Income replacement calculator
- Corporate shareholder analysis
- Total insurable needs aggregation

### Phase 4: Reporting & Visualization (Weeks 13-16)

- Dashboard with Recharts visualizations
- Report generation
- PDF export

### Phase 5: AI & Documents (Weeks 17-20)

- GenAI Co-Pilot integration
- Document generation (Reasons Why, cover letters)
- Chat interface for client analysis
- Document storage

### Phase 6: Collaboration & Polish (Weeks 21-24)

- Collaborative editing (WebSockets + OT)
- Insurance illustration management
- Billing and subscriptions
- Self-serve onboarding
- Performance optimization

---

## Customer Discovery Requirements

As part of the v2.0 development process, the team must:

1. **Conduct customer discovery interviews** with 5-10 life insurance advisors
2. **Validate value propositions** against actual user feedback
3. **Document findings** with quotes and insights
4. **Iterate on features** based on validated learning

Key hypotheses to validate:

- Advisors spend significant time on spreadsheet calculations
- AI-generated compliance documents would save meaningful time
- Real-time collaboration is a desired feature
- Self-serve onboarding is preferred over sales-led

---

## Appendix

### Glossary

| Term                      | Definition                                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| **FNA**                   | Financial Needs Analysis — the process of evaluating a client's insurance needs |
| **Settling Requirements** | Costs to settle an estate (probate, taxes, fees)                                |
| **EBITDA**                | Earnings Before Interest, Taxes, Depreciation, and Amortization                 |
| **Key Person**            | An employee whose loss would significantly impact a business                    |
| **Buy-Sell Agreement**    | Contract governing ownership transfer between shareholders                      |
| **Reasons Why Letter**    | Compliance document explaining why insurance was recommended                    |

### Reference Documents

- InsurFlow v1.0 codebase (functional specification)
- Insurance Advisor App Design Guide
- Feature Research & Style Guide
- ISSP Project Proposal

---

**Document Version:** 1.0  
**Last Updated:** January 29, 2026  
**Next Review:** After customer discovery interviews
