import type { TourStep } from "./tour-overlay";

/**
 * Tour steps for each demo segment.
 * These guide users through the key features of each page.
 */

type TourStepInput = [
  target: TourStep["target"],
  title: TourStep["title"],
  content: TourStep["content"],
  placement?: NonNullable<TourStep["placement"]>,
  actionHint?: TourStep["actionHint"],
];

function createTourSteps(inputs: TourStepInput[]): TourStep[] {
  return inputs.map(([target, title, content, placement, actionHint]) => ({
    target,
    title,
    content,
    placement,
    actionHint,
  }));
}

export const demoIntakeTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='intake-heading']",
    "Capture Core Inputs",
    "This section captures household and financial context to drive a first-pass recommendation.",
    "bottom",
  ],
  [
    "[data-tour='intake-form']",
    "Structured Intake",
    "The guided form keeps data entry lightweight while still collecting enough signal for meaningful analysis.",
    "bottom",
  ],
]);

export const demoEstimateTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='estimate-heading']",
    "Interactive Estimate",
    "This recommendation responds immediately to assumption changes so advisors can model scenarios live.",
    "bottom",
  ],
  [
    "[data-tour='assumptions-controls']",
    "Assumption Controls",
    "Adjust income replacement, duration, and liquid asset offsets to pressure-test outcomes.",
    "bottom",
  ],
  [
    "[data-tour='estimate-kpis']",
    "Coverage Snapshot",
    "Recommended coverage and coverage gap are presented side by side for clear conversation framing.",
    "top",
  ],
  [
    "[data-tour='estimate-transparency']",
    "Calculation Transparency",
    "Open this section to show the exact methodology and state-specific reference tables behind the estimate.",
    "top",
  ],
  [
    "[data-tour='showcase-next']",
    "Continue to Showcase",
    "Next you will see AI and report deliverables generated from this analysis.",
    "top",
    "Click to continue",
  ],
]);

export const demoShowcaseTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='ai-letter-preview']",
    "AI Narrative Output",
    "The letter preview turns the numbers into recommendation reasoning advisors can refine before delivery.",
    "bottom",
  ],
  [
    "[data-tour='report-preview']",
    "Client Report Preview",
    "The report card condenses assumptions and recommendation values into an advisor-ready summary.",
    "bottom",
  ],
  [
    "[data-tour='showcase-handoff']",
    "Advisor Handoff",
    "Continue with confidence: both analysis and communication artifacts are now ready.",
    "top",
    "Click to continue",
  ],
]);
