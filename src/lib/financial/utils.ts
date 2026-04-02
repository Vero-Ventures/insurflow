/**
 * Round a number to 2 decimal places.
 */
export function roundToTwoDecimals(value: number): number {
  const epsilon = Number.EPSILON * Math.max(1, Math.abs(value));
  return Math.round((value + epsilon) * 100) / 100;
}

/**
 * Round a currency amount to 2 decimal places.
 */
export function roundCurrency(value: number): number {
  return roundToTwoDecimals(value);
}
