/**
 * Persist the GitHub @login across sessions.
 *
 * Firebase Auth keeps the GitHub display name on the user object, but does
 * not persist the actual username (`login`). We capture it at sign-in and
 * stash it in localStorage keyed by Firebase uid.
 */
const KEY_PREFIX = "agenticros:github-login:";

export function isValidGithubLogin(value: string | null | undefined): value is string {
  if (!value) return false;
  // GitHub login rules: 1–39 chars, alphanumeric or hyphen, no leading/trailing
  // hyphen, no consecutive hyphens. Spaces are never valid.
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(value);
}

export function setStoredGithubLogin(uid: string, login: string): void {
  if (typeof window === "undefined") return;
  if (!isValidGithubLogin(login)) return;
  localStorage.setItem(`${KEY_PREFIX}${uid}`, login);
}

export function getStoredGithubLogin(uid: string): string | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(`${KEY_PREFIX}${uid}`);
  return isValidGithubLogin(value) ? value : null;
}

export function clearStoredGithubLogin(uid: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${KEY_PREFIX}${uid}`);
}

/** Resolve the authenticated user's GitHub login via the GitHub API. */
export async function fetchGithubLogin(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { login?: string };
    return isValidGithubLogin(data.login) ? data.login : null;
  } catch {
    return null;
  }
}
