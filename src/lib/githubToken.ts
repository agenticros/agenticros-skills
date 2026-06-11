/**
 * GitHub OAuth access token captured at sign-in time.
 *
 * Firebase Auth does NOT persist the upstream OAuth provider access token
 * across sessions — it's only available on the immediate `signInWithPopup`
 * result. We stash it in sessionStorage so the Submit flow can pass it to
 * the `submitSkill` Cloud Function (which uses it to verify the user has
 * push/admin permission on the repo they're submitting).
 *
 * Tokens are cleared on tab close. If a user opens the Submit page in a
 * fresh tab we re-prompt them to sign in (which produces a new token).
 */
const KEY = "agenticros:github-access-token";

export function setGithubAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    sessionStorage.setItem(KEY, token);
  } else {
    sessionStorage.removeItem(KEY);
  }
}

export function getGithubAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function clearGithubAccessToken(): void {
  setGithubAccessToken(null);
}
