<wizard-report>
# PostHog post-wizard report

The wizard completed a deep integration of PostHog analytics into InsurFlow. The project already had a mature PostHog foundation (`posthog-js`, `PostHogProvider`, server-side capture, typed event schema). This run filled the remaining gaps: user identification on sign-in, client update tracking, environment variable configuration, and a fresh analytics dashboard.

**Changes made:**

| File                                    | Change                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/components/posthog-provider.tsx`   | Added `PostHogSessionTracker` — detects session transitions to fire `auth_signed_in` and call `posthog.identify()` |
| `src/lib/hooks/use-financial-inputs.ts` | Added `client_updated` capture on successful financial inputs save                                                 |
| `.env.local`                            | Set `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_UI_HOST`                           |

**Full event inventory (all tracked events in the codebase):**

| Event                         | Description                                                               | File                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `auth_signed_in`              | User session detected for the first time; also calls `posthog.identify()` | `src/components/posthog-provider.tsx`                                                                 |
| `client_created`              | Advisor successfully creates a new client                                 | `src/components/clients/create/use-client-form.ts`                                                    |
| `client_create_failed`        | Client creation fails (validation or server error)                        | `src/components/clients/create/use-client-form.ts`                                                    |
| `client_updated`              | Advisor saves updated financial inputs for a client                       | `src/lib/hooks/use-financial-inputs.ts`                                                               |
| `d2c_application_started`     | Consumer begins D2C eligibility intake                                    | `src/app/apply/intake/page.tsx`                                                                       |
| `d2c_application_submitted`   | Consumer completes and submits D2C application                            | `src/app/apply/submit/apply-submit-analytics.tsx`                                                     |
| `chat_message_sent`           | AI chat message sent (started/completed/failed/rejected)                  | `src/app/api/clients/[id]/chat/route.ts`                                                              |
| `letter_generation_started`   | "Reasons Why" letter generation queued                                    | `src/app/api/clients/[id]/generate-letter/route.ts`                                                   |
| `letter_generation_completed` | Letter generation succeeded                                               | `src/app/api/clients/[id]/generate-letter/route.ts`                                                   |
| `letter_generation_failed`    | Letter generation failed                                                  | `src/app/api/clients/[id]/generate-letter/route.ts`                                                   |
| `report_pdf_generated`        | PDF report or compliance packet generated                                 | `src/app/api/clients/[id]/report-pdf/route.ts`, `src/app/api/clients/[id]/compliance-packet/route.ts` |
| `calculation_run`             | Insurance needs calculation executed                                      | `src/app/api/clients/[id]/calculate/route.ts`                                                         |
| `page_viewed`                 | Page navigation tracked                                                   | `src/components/posthog-provider.tsx`                                                                 |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/370492/dashboard/1433690
- **D2C Application Funnel** (d2c_application_started → submitted): https://us.posthog.com/project/370492/insights/9DAr7nOe
- **Advisor Activation Funnel** (sign-in → client → calculation → letter): https://us.posthog.com/project/370492/insights/ATow4ZzH
- **Daily Sign-ins & Client Creation:** https://us.posthog.com/project/370492/insights/y2ufKyHr
- **AI Feature Adoption** (chat, letters, PDFs): https://us.posthog.com/project/370492/insights/kT5VXi0K
- **Client Creation Success Rate:** https://us.posthog.com/project/370492/insights/3U35fjPT

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
