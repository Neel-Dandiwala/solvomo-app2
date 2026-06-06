/** Matches API `VENDOR_DIRECTORY_CATEGORIES` — product tags only. */
const DIRECTORY_CATEGORIES = new Set([
  "ads",
  "analytics",
  "crm",
  "accounting",
  "social",
]);

export function directoryCategoryTags(categories: readonly string[]): string[] {
  return categories.filter((c) => DIRECTORY_CATEGORIES.has(c));
}
