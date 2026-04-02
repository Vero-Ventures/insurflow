/**
 * Safely convert a decimal string (from DB or form input) to a number.
 * Returns 0 for null, undefined, or unparseable values.
 */
export function decimalToNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
}
