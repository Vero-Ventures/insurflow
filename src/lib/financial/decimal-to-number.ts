/**
 * Converts a decimal string input into a number with a safe zero fallback.
 * @param value - The decimal string from storage or form input.
 * @returns The parsed numeric value, or 0 when the input is missing or not numeric.
 */
export function decimalToNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
}
