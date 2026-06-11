import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  GithubAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, githubProvider } from "../lib/firebase";
import {
  setGithubAccessToken,
  clearGithubAccessToken,
} from "../lib/githubToken";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<User>;
  signOut: () => Promise<void>;
  /** GitHub login (e.g. "chrismatthieu") if available from the provider. */
  githubLogin: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) clearGithubAccessToken();
    });
    return unsub;
  }, []);

  async function signIn(): Promise<User> {
    const result = await signInWithPopup(auth, githubProvider);
    const cred = GithubAuthProvider.credentialFromResult(result);
    if (cred?.accessToken) {
      setGithubAccessToken(cred.accessToken);
    }
    return result.user;
  }

  async function signOut(): Promise<void> {
    clearGithubAccessToken();
    await fbSignOut(auth);
  }

  const githubLogin = extractGithubLogin(user);

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signOut, githubLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Pull the GitHub username out of the Firebase user object.
 *
 * Firebase populates `providerData[].displayName` with the GitHub display
 * name (which may include spaces). The actual `@login` ships on the user's
 * additional info during sign-in, but Firebase doesn't persist it; we fall
 * back to parsing the photo URL (`avatars.githubusercontent.com/u/<id>?v=4`)
 * or the email local-part as a best-effort.
 */
function extractGithubLogin(user: User | null): string | null {
  if (!user) return null;
  const githubProvider = user.providerData.find(
    (p) => p.providerId === "github.com",
  );
  if (!githubProvider) return null;

  // Best signal: the email local-part if email ends with @users.noreply.github.com
  if (githubProvider.email?.endsWith("@users.noreply.github.com")) {
    const local = githubProvider.email.split("@")[0];
    // Format: <id>+<login> or just <login>
    const plus = local.indexOf("+");
    return plus >= 0 ? local.slice(plus + 1) : local;
  }

  // Fallback: displayName (may have spaces; not ideal but usable)
  return githubProvider.displayName ?? null;
}
