export type AnalyticsEventName =
  | "auth_signed_in"
  | "chat_message_sent"
  | "client_created"
  | "client_create_failed"
  | "client_updated"
  | "d2c_application_started"
  | "d2c_application_submitted"
  | "letter_generation_completed"
  | "letter_generation_failed"
  | "letter_generation_started"
  | "page_viewed"
  | "report_pdf_generated"
  | "calculation_run";

export type AnalyticsProperties = {
  feature?: string;
  outcome?:
    | "completed"
    | "failed"
    | "queued"
    | "rejected"
    | "started"
    | "succeeded";
  route?: string;
  source?: string;
} & Partial<Record<"count" | "step" | "statusCode", number>> &
  Partial<Record<"hasBusiness" | "hasDependents", boolean>>;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: AnalyticsProperties;
}
