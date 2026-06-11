/**
 * Convert a skill id ("followme", "find-object") into a URL-safe slug.
 * The marketplace uses the skill id verbatim — it's already the most
 * stable, dev-declared identifier. This helper just enforces the
 * lowercase-alphanumeric-with-hyphens shape and rejects empty/invalid ids.
 */
export function normalizeSlug(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^@[^/]+\//, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(slug);
}

/** Parse "https://github.com/<owner>/<repo>" into its parts. */
export function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  let url = input.trim();
  if (url.startsWith("git@github.com:")) {
    url = "https://github.com/" + url.slice("git@github.com:".length);
  }
  url = url.replace(/\.git$/, "").replace(/\/+$/, "");
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}
