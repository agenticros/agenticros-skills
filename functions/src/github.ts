/**
 * Tiny GitHub REST API client used by the marketplace Functions.
 *
 * Uses the raw fetch API (available on Node 18+) and an optional bearer
 * token — anonymous reads for public repo metadata, authenticated reads
 * (with a user's OAuth `public_repo` token) to verify ownership.
 */
import { ManifestError } from "./util/manifest";

const GH = "https://api.github.com";
const GH_RAW = "https://raw.githubusercontent.com";

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "agenticros-skills-marketplace",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export interface GithubRepo {
  full_name: string;
  default_branch: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  topics: string[];
  permissions?: { admin: boolean; push: boolean; pull: boolean };
  owner: { login: string; avatar_url: string; type: string };
}

export async function getRepo(
  owner: string,
  repo: string,
  token?: string,
): Promise<GithubRepo> {
  const r = await fetch(`${GH}/repos/${owner}/${repo}`, { headers: headers(token) });
  if (r.status === 404) {
    throw new ManifestError(
      `Repo ${owner}/${repo} not found or not accessible. Make sure it's public.`,
    );
  }
  if (!r.ok) {
    throw new Error(`GitHub /repos returned ${r.status}: ${await r.text()}`);
  }
  return (await r.json()) as GithubRepo;
}

/**
 * Fetch a file from a GitHub repo at the given ref (branch / tag / sha).
 * Returns null on 404, throws on other errors.
 */
export async function fetchFileAtRef(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string,
): Promise<string | null> {
  // Try raw.githubusercontent.com first (no rate limit for public files).
  const rawUrl = `${GH_RAW}/${owner}/${repo}/${ref}/${path}`;
  const r = await fetch(rawUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (r.status === 404) return null;
  if (r.ok) return await r.text();
  // Fallback: use the contents API (needed for private repos).
  const api = await fetch(
    `${GH}/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    { headers: headers(token) },
  );
  if (api.status === 404) return null;
  if (!api.ok) {
    throw new Error(`GitHub contents API returned ${api.status}: ${await api.text()}`);
  }
  const body = (await api.json()) as { content?: string; encoding?: string };
  if (body.content && body.encoding === "base64") {
    return Buffer.from(body.content, "base64").toString("utf8");
  }
  return null;
}

export async function fetchPackageJson(
  owner: string,
  repo: string,
  ref: string,
  token?: string,
): Promise<unknown> {
  const text = await fetchFileAtRef(owner, repo, "package.json", ref, token);
  if (!text) {
    throw new ManifestError(
      `package.json not found at the root of ${owner}/${repo}@${ref}.`,
    );
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ManifestError(
      `Failed to parse package.json from ${owner}/${repo}@${ref}: ${(err as Error).message}`,
    );
  }
}

export async function fetchReadme(
  owner: string,
  repo: string,
  ref: string,
  token?: string,
): Promise<string> {
  for (const name of ["README.md", "Readme.md", "readme.md", "README.markdown"]) {
    const txt = await fetchFileAtRef(owner, repo, name, ref, token);
    if (txt) return txt;
  }
  return "";
}

export interface OwnershipResult {
  hasPushAccess: boolean;
  hasAdminAccess: boolean;
  viewerLogin: string;
}

/**
 * Verify the user (identified by their OAuth access token) has push
 * permission on the given repo. Used to gate Submit/Update/Delete actions.
 */
export async function verifyOwnership(
  owner: string,
  repo: string,
  userAccessToken: string,
): Promise<OwnershipResult> {
  // 1) Get the viewer's login.
  const me = await fetch(`${GH}/user`, { headers: headers(userAccessToken) });
  if (!me.ok) {
    throw new ManifestError(
      "Couldn't verify your GitHub identity. Please sign in again.",
    );
  }
  const viewer = (await me.json()) as { login: string };

  // 2) Fetch repo with the user's token; `permissions` is only populated
  //    when the token has access to that repo.
  const r = await getRepo(owner, repo, userAccessToken);
  const perm = r.permissions ?? { admin: false, push: false, pull: false };

  return {
    hasPushAccess: perm.push || perm.admin,
    hasAdminAccess: perm.admin,
    viewerLogin: viewer.login,
  };
}
