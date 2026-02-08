import type { TourStep } from "./tour-overlay";

/**
 * Tour steps for each demo segment.
 * These guide users through the key features of each page.
 */

export const portfolioTourSteps: TourStep[] = [
  {
    target: "[data-tour='portfolio-header']",
    title: "Your Client Portfolio",
    content:
      "This is your command center. View all your clients, their status, and quickly access their analyses.",
    placement: "bottom",
  },
  {
    target: "[data-tour='search-clients']",
    title: "Find Clients Quickly",
    content:
      "Search by name to instantly find any client in your portfolio. Great for advisors with many clients.",
    placement: "bottom",
  },
  {
    target: "[data-tour='new-client-button']",
    title: "Add New Clients",
    content:
      "Start a new financial analysis with one click. We'll guide you through gathering all the necessary information.",
    placement: "left",
  },
  {
    target: "[data-tour='client-row']",
    title: "Client Overview",
    content:
      "Each row shows key details at a glance: age, location, last update, and current status. Click any client to view their full analysis.",
    placement: "bottom",
  },
];

export const addClientTourSteps: TourStep[] = [
  {
    target: "[data-tour='client-form']",
    title: "Simple Data Entry",
    content:
      "Enter your client's basic information. Our smart form validates as you type and only asks for what's truly needed.",
    placement: "right",
  },
  {
    target: "[data-tour='name-fields']",
    title: "Client Identity",
    content:
      "Start with the basics. First and last name are all you need to begin.",
    placement: "bottom",
  },
  {
    target: "[data-tour='demographics-fields']",
    title: "Demographics",
    content:
      "Date of birth and state are used for accurate insurance calculations based on actuarial tables and state regulations.",
    placement: "bottom",
  },
  {
    target: "[data-tour='health-fields']",
    title: "Health Profile",
    content:
      "Health information helps determine insurance eligibility and premium estimates. This affects the final recommendation.",
    placement: "bottom",
  },
  {
    target: "[data-tour='spouse-fields']",
    title: "Family Situation",
    content:
      "If your client has a spouse, their income factors into the insurance needs calculation for comprehensive planning.",
    placement: "bottom",
  },
  {
    target: "[data-tour='submit-button']",
    title: "Create & Continue",
    content:
      "Once you submit, the client is created and you can immediately start their financial analysis.",
    placement: "top",
    actionHint: "Click Create Client to continue",
  },
];

export const clientDetailTourSteps: TourStep[] = [
  {
    target: "[data-tour='client-header']",
    title: "Client Profile",
    content:
      "View and edit all client details from this central hub. The tabs below organize different aspects of their analysis.",
    placement: "bottom",
  },
  {
    target: "[data-tour='client-tabs']",
    title: "Analysis Sections",
    content:
      "Navigate between Profile, Financial inputs, Insurance calculation, and the final Report. Each builds on the previous.",
    placement: "bottom",
  },
  {
    target: "[data-tour='insurance-needs']",
    title: "The Magic Happens Here",
    content:
      "Our engine calculates exactly how much life insurance coverage your client needs based on their complete financial picture.",
    placement: "top",
  },
  {
    target: "[data-tour='insurance-chart']",
    title: "Visual Breakdown",
    content:
      "See how income replacement, debt payoff, and existing coverage combine. Makes it easy to explain to clients.",
    placement: "left",
  },
  {
    target: "[data-tour='ai-letter']",
    title: "AI-Powered Compliance",
    content:
      "Generate a professional 'Reasons Why' letter with one click. Our AI creates compliant documentation explaining your recommendation.",
    placement: "top",
    actionHint: "Watch the AI generate a letter",
  },
  {
    target: "[data-tour='report-section']",
    title: "Professional Reports",
    content:
      "Export a polished, print-ready report to share with your client. Everything they need in one beautiful document.",
    placement: "top",
  },
];

export const reportTourSteps: TourStep[] = [
  {
    target: "[data-tour='report-header']",
    title: "Client Report",
    content:
      "This is the final deliverable - a comprehensive summary of your client's financial situation and insurance needs.",
    placement: "bottom",
  },
  {
    target: "[data-tour='print-button']",
    title: "Export Options",
    content:
      "Print directly or save as PDF. The report is designed to look professional in any format.",
    placement: "left",
  },
];
