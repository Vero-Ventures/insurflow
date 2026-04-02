/**
 * Formats text into a lowercase, URL-safe filename segment.
 * @param value - The raw text to normalize for use in a downloaded filename.
 * @returns A hyphenated filename segment with non-alphanumeric characters removed.
 */
export function safeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
