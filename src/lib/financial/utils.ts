/**
 * Round a number to 2 decimal places (currency precision).
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
