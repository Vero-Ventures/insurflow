"use client";

import { useEffect } from "react";

import { captureAnalyticsEvent } from "@/lib/analytics/capture";

export function ApplySubmitAnalytics() {
  useEffect(() => {
    captureAnalyticsEvent("d2c_application_submitted", {
      feature: "d2c-application",
      outcome: "completed",
      route: "/apply/submit",
      source: "page-load",
    });
  }, []);

  return null;
}
