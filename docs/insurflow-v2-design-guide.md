# InsurFlow v2.0 Client Journey Design Guide

## Purpose

This guide defines the intended UX for the current client-first MVP direction.

Use this as the source of truth for demo flow behavior and content tone.

---

## Design Principles

1. **Show value fast**
   - Reach meaningful output in under 7 minutes.
2. **Plain language first**
   - Avoid advisor jargon in client-facing steps.
3. **Progressive input**
   - Ask only what is needed for the next decision.
4. **Transparent math**
   - Explain assumptions and major inputs.
5. **Strong handoff**
   - End with one clear advisor CTA.

---

## MVP Experience Architecture

### Step 1: Entry

**User intent:** "Can this tool help me quickly?"

Requirements:

- Clear promise and expected time.
- Simple start action.
- No heavy account wall before first value.

### Step 2: Guided Intake

**User intent:** "Tell me what to enter next."

Requirements:

- Wizard format with visible progress.
- Small groups of questions.
- Sensible defaults when possible.
- Inline validation and clear error text.

### Step 3: Estimate Snapshot

**User intent:** "What does this mean for me?"

Requirements:

- Clear top-line estimate.
- Plain-language breakdown.
- Visual cues for risk/gap.
- Optional detail reveal for advanced users.

### Step 4: Advisor Handoff

**User intent:** "What should I do now?"

Requirements:

- One primary CTA.
- Explain what happens next.
- Keep friction low (no long forms).

---

## Tone and Copy Rules

- Write at an 8th-grade reading level.
- Use short sentences and concrete wording.
- Prefer "what this means" over technical labels.
- Avoid fear-based language; stay informative.

Example:

- Avoid: "Your estate exhibits material liquidity deficiencies."
- Use: "Your family may not have enough cash to cover taxes and debts."

---

## UX Quality Checklist (MVP)

- User can complete flow on desktop and mobile.
- User always sees where they are in the flow.
- User can go back without losing entered data.
- Errors are actionable and field-specific.
- Snapshot screen includes both result and explanation.
- Handoff CTA is obvious and singular.

---

## Mapping to Current App Areas

- Demo routes: `src/app/demo/*`
- Home/entry route: `src/app/page.tsx`
- Demo support components: `src/components/demo/*`
- Calculation endpoints: `src/app/api/clients/[id]/calculate*/route.ts`

---

## Post-MVP Design Expansion

Add only after MVP flow is stable:

- Richer scenario comparison
- Deeper advisor-facing analysis views
- Extended collaboration and document workflows
- Advanced customization and automation layers

Keep these out of MVP unless directly required for demo conversion.

---

## Change Management

When a design decision changes the client journey, update this file in the same PR.

If a decision is temporary, note it with a short "Decision" line and planned revisit date.
