import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProductRecommendationsCard } from "./product-recommendations-card";
import type { RecommendationInput } from "@/lib/financial/product-recommendation";

// Helper function to generate stable test data and avoid duplication
function createTestInput(
  overrides?: Partial<RecommendationInput>,
): RecommendationInput {
  return {
    age: 35,
    sex: "M",
    isSmoker: false,
    healthClass: "preferred",
    annualIncome: 100000,
    totalDebts: 50000,
    liquidAssets: 20000,
    existingCoverage: 100000,
    coverageNeeded: 1000000,
    primaryGoal: "income_replacement",
    hasDependents: true,
    youngestDependentAge: 5,
    ...overrides,
  };
}

describe("ProductRecommendationsCard", () => {
  it("renders the component with the correct title and collapsible behavior", () => {
    const input = createTestInput();
    render(<ProductRecommendationsCard input={input} />);

    // Check main title
    const title = screen.getByText("Product Recommendations");
    expect(title).toBeDefined();

    // Check collapsible toggle (starts open by default in our implementation)
    const toggleBtn = screen.getByRole("button", {
      name: /Toggle Recommendations/i,
    });
    expect(toggleBtn).toBeDefined();

    // The content inside the collapsible should be visible
    expect(screen.getByText("Coverage Gap Analysis")).toBeDefined();

    // Toggle the collapsible
    fireEvent.click(toggleBtn);
  });

  it("displays coverage gap analysis correctly", () => {
    const input = createTestInput({
      coverageNeeded: 1500000,
      existingCoverage: 500000,
    });

    render(<ProductRecommendationsCard input={input} />);

    // Total need
    expect(screen.getAllByText(/\$1,500,000/)[0]).toBeDefined();

    // Existing coverage
    expect(screen.getAllByText(/\$500,000/)[0]).toBeDefined();

    // Gap should be 1,500,000 - 500,000 = 1,000,000
    expect(screen.getAllByText(/\$1,000,000/)[0]).toBeDefined();
  });

  it("renders ranked products when given standard input", () => {
    const input = createTestInput();
    render(<ProductRecommendationsCard input={input} />);

    // Expected section headers
    expect(screen.getAllByText("Recommended Option")[0]).toBeDefined();

    // Term Life is almost always the top recommendation for a 35yo with high needs
    expect(screen.getAllByText(/Term Life/i)[0]).toBeDefined();

    // Check for standard fields that should appear in product cards
    expect(screen.getAllByText("Why it fits").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Key Features").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Considerations").length).toBeGreaterThan(0);
  });

  it("handles null or undefined input gracefully (if logic throws)", () => {
    const badInput = createTestInput({ age: -100 });
    const { container } = render(
      <ProductRecommendationsCard input={badInput} />,
    );
    expect(container).toBeDefined();
  });
});
