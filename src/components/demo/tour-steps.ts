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
    "Start with the basics",
    "This section captures the key household details needed for a first estimate.",
    "bottom",
  ],
  [
    "[data-tour='intake-form']",
    "Guided form",
    "The form keeps questions short while collecting enough detail for a useful estimate.",
    "bottom",
  ],
]);

export const demoEstimateTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='estimate-heading']",
    "Interactive estimate",
    "Your estimate updates as assumptions change so you can quickly compare outcomes.",
    "bottom",
  ],
  [
    "[data-tour='assumptions-controls']",
    "Assumption controls",
    "Adjust income replacement, duration, and liquid asset offsets to test different outcomes.",
    "bottom",
  ],
  [
    "[data-tour='estimate-kpis']",
    "Coverage snapshot",
    "Recommended coverage and coverage gap are shown side by side for easy comparison.",
    "top",
  ],
  [
    "[data-tour='estimate-transparency']",
    "Calculation transparency",
    "Open this section to review the methodology and reference tables used for this demo estimate.",
    "top",
  ],
  [
    "[data-tour='showcase-next']",
    "Continue",
    "Next you will see the AI explanation and report preview for this estimate.",
    "top",
    "Click to continue",
  ],
]);

export const demoShowcaseTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='ai-letter-preview']",
    "AI explanation",
    "The letter preview turns estimate numbers into clear plain-language reasoning.",
    "bottom",
  ],
  [
    "[data-tour='report-preview']",
    "Report preview",
    "The report card summarizes assumptions and recommendation values in one place.",
    "bottom",
  ],
  [
    "[data-tour='showcase-handoff']",
    "Next steps",
    "Continue when you are ready to review what happens after this estimate.",
    "top",
    "Click to continue",
  ],
]);
