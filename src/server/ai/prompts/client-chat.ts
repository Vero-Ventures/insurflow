import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
} from "@/lib/financial/insurance-needs";

export interface ClientChatPromptInput {
  firstName: string;
  lastName: string;
  state: string;
  hasSpouse: boolean;
  clientIncome: number;
  spouseIncome: number;
  existingCoverage: number;
  totalAssets: number;
  liquidAssets: number;
  totalDebts: number;
  additionalGoals?: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildClientChatPrompt(
  input: ClientChatPromptInput,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userQuestion: string,
): string {
  const insuranceInput: InsuranceNeedsInput = {
    clientIncome: input.clientIncome,
    spouseIncome: input.spouseIncome,
    includeSpouseIncome: input.hasSpouse,
    incomeReplacementPercent: 70,
    replacementDurationYears: 10,
    existingLifeInsuranceCoverage: input.existingCoverage,
    totalDebts: input.totalDebts,
    liquidAssets: input.liquidAssets,
    totalAssets: input.totalAssets,
    estateBuffer: DEFAULT_ESTATE_BUFFER,
  };

  const estimate = calculateInsuranceNeedsRounded(insuranceInput);

  const serializedHistory = history
    .slice(-8)
    .map((item) => `${item.role.toUpperCase()}: ${item.content}`)
    .join("\n\n");

  return [
    "You are InsurFlow Copilot, an AI assistant helping licensed insurance advisors discuss a client's life insurance planning.",
    "You must be factual, concise, and explain assumptions clearly.",
    "Do not provide legal, tax, or medical advice. If asked, provide a caveat and suggest consulting a qualified professional.",
    "Use markdown bullet points when helpful. Keep recommendations practical and tied to the data below.",
    "",
    "Client context:",
    `- Name: ${input.firstName} ${input.lastName}`,
    `- Province/State: ${input.state}`,
    `- Has spouse: ${input.hasSpouse ? "Yes" : "No"}`,
    `- Client income: ${formatCurrency(input.clientIncome)}`,
    `- Spouse income: ${formatCurrency(input.spouseIncome)}`,
    `- Existing life coverage: ${formatCurrency(input.existingCoverage)}`,
    `- Total assets: ${formatCurrency(input.totalAssets)}`,
    `- Liquid assets: ${formatCurrency(input.liquidAssets)}`,
    `- Total debts: ${formatCurrency(input.totalDebts)}`,
    `- Additional goals: ${input.additionalGoals?.trim() || "None provided"}`,
    "",
    "Insurance estimate snapshot (calculated by InsurFlow):",
    `- Income replacement need: ${formatCurrency(estimate.incomeReplacementNeeds)}`,
    `- Debt payoff need: ${formatCurrency(estimate.debtPayoffNeeds)}`,
    `- Estate buffer need: ${formatCurrency(estimate.estateBufferNeeds)}`,
    `- Gross need: ${formatCurrency(estimate.grossNeeds)}`,
    `- Existing coverage: ${formatCurrency(estimate.existingCoverage)}`,
    `- Liquid assets offset: ${formatCurrency(estimate.liquidAssets)}`,
    `- Net insurance need: ${formatCurrency(estimate.totalInsuranceNeeds)}`,
    "",
    "Conversation history (most recent first relevance):",
    serializedHistory || "No prior messages.",
    "",
    `Advisor question: ${userQuestion}`,
    "",
    "Respond with:",
    "1) Direct answer to the advisor's question",
    "2) Any assumptions or missing data",
    "3) Concrete next steps the advisor can take in the workflow",
  ].join("\n");
}

export function getSuggestedChatQuestions(input: {
  hasSpouse: boolean;
  totalDebts: number;
  totalAssets: number;
  existingCoverage: number;
}): string[] {
  const suggestions = [
    "What are the top coverage risks for this client right now?",
    "How should I explain the current insurance gap in plain language?",
    "What client data would improve confidence in the recommendation?",
  ];

  if (input.hasSpouse) {
    suggestions.push(
      "How would the recommendation change if spouse income stopped tomorrow?",
    );
  }

  if (input.totalDebts > 0) {
    suggestions.push(
      "How much of the recommendation is driven by debt obligations?",
    );
  }

  if (input.totalAssets > 0 || input.existingCoverage > 0) {
    suggestions.push("What offsets already reduce the total insurance need?");
  }

  return suggestions.slice(0, 4);
}
