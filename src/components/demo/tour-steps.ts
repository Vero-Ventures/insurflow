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

export const demoLandingTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='demo-hero']",
    "Welcome to the Interactive Demo",
    "This walkthrough shows how advisors move from client inputs to recommendation-ready outputs in minutes.",
    "bottom",
  ],
  [
    "[data-tour='scenario-selector']",
    "Choose a Real-World Scenario",
    "Select a persona to explore common planning contexts: family protection, business succession, or estate planning.",
    "top",
  ],
  [
    "[data-tour='live-calc-preview']",
    "Preview Interactive Calculations",
    "See how changing assumptions can impact recommended coverage before entering the full demo flow.",
    "top",
  ],
  [
    "[data-tour='mock-ai-preview']",
    "Mock AI Showcase",
    "The demo includes a mock AI recommendation experience now, with production endpoint integration tracked in a follow-up issue.",
    "left",
  ],
  [
    "[data-tour='start-demo']",
    "Start the Guided Journey",
    "Continue into the portfolio flow to experience the full analysis lifecycle and report output.",
    "top",
    "Click Start Demo to continue",
  ],
]);

export const portfolioTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='portfolio-header']",
    "Your Client Portfolio",
    "This is your command center. View all your clients, their status, and quickly access their analyses.",
    "bottom",
  ],
  [
    "[data-tour='search-clients']",
    "Find Clients Quickly",
    "Search by name to instantly find any client in your portfolio. Great for advisors with many clients.",
    "bottom",
  ],
  [
    "[data-tour='new-client-button']",
    "Add New Clients",
    "Start a new financial analysis with one click. We'll guide you through gathering all the necessary information.",
    "left",
  ],
  [
    "[data-tour='client-row']",
    "Client Overview",
    "Each row shows key details at a glance: age, location, last update, and current status. Click any client to view their full analysis.",
    "bottom",
  ],
]);

export const addClientTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='client-form']",
    "Simple Data Entry",
    "Enter your client's basic information. Our smart form validates as you type and only asks for what's truly needed.",
    "right",
  ],
  [
    "[data-tour='name-fields']",
    "Client Identity",
    "Start with the basics. First and last name are all you need to begin.",
    "bottom",
  ],
  [
    "[data-tour='demographics-fields']",
    "Demographics",
    "Date of birth and state are used for accurate insurance calculations based on actuarial tables and state regulations.",
    "bottom",
  ],
  [
    "[data-tour='health-fields']",
    "Health Profile",
    "Health information helps determine insurance eligibility and premium estimates. This affects the final recommendation.",
    "bottom",
  ],
  [
    "[data-tour='spouse-fields']",
    "Family Situation",
    "If your client has a spouse, their income factors into the insurance needs calculation for comprehensive planning.",
    "bottom",
  ],
  [
    "[data-tour='submit-button']",
    "Create & Continue",
    "Once you submit, the client is created and you can immediately start their financial analysis.",
    "top",
    "Click Create Client to continue",
  ],
]);

export const clientDetailTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='client-header']",
    "Client Profile",
    "View and edit all client details from this central hub. The tabs below organize different aspects of their analysis.",
    "bottom",
  ],
  [
    "[data-tour='client-tabs']",
    "Analysis Sections",
    "Navigate between Profile, Financial inputs, Insurance calculation, and the final Report. Each builds on the previous.",
    "bottom",
  ],
  [
    "[data-tour='insurance-needs']",
    "The Magic Happens Here",
    "Our engine calculates exactly how much life insurance coverage your client needs based on their complete financial picture.",
    "top",
  ],
  [
    "[data-tour='insurance-chart']",
    "Visual Breakdown",
    "See how income replacement, debt payoff, and existing coverage combine. Makes it easy to explain to clients.",
    "left",
  ],
  [
    "[data-tour='ai-letter-tab']",
    "AI-Powered Compliance",
    "Generate a professional 'Reasons Why' letter with one click. Our AI creates compliant documentation explaining your recommendation.",
    "bottom",
    "Click the AI Letter tab to view it",
  ],
  [
    "[data-tour='report-tab']",
    "Professional Reports",
    "Export a polished, print-ready report to share with your client. Everything they need in one beautiful document.",
    "bottom",
    "Click the Report tab to view it",
  ],
]);

export const reportTourSteps: TourStep[] = createTourSteps([
  [
    "[data-tour='report-header']",
    "Client Report",
    "This is the final deliverable - a comprehensive summary of your client's financial situation and insurance needs.",
    "bottom",
  ],
  [
    "[data-tour='print-button']",
    "Export Options",
    "Print directly or save as PDF. The report is designed to look professional in any format.",
    "left",
  ],
]);
