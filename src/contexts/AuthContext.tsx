import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  GithubAuthProvider,
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db, githubProvider } from "../lib/firebase";
import {
  setGithubAccessToken,
  clearGithubAccessToken,
  getGithubAccessToken,
} from "../lib/githubToken";
import {
  clearStoredGithubLogin,
  fetchGithubLogin,
  getStoredGithubLogin,
  isValidGithubLogin,
  setStoredGithubLogin,
} from "../lib/githubLogin";

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
  const [githubLogin, setGithubLogin] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        clearGithubAccessToken();
        setGithubLogin(null);
        setLoading(false);
        return;
      }

      // Prefer a previously captured @login; never trust displayName.
      const cached = getStoredGithubLogin(u.uid);
      const fromEmail = extractGithubLoginFromEmail(u);
      const initial = cached ?? fromEmail;
      setGithubLogin(initial);
      setLoading(false);

      if (!initial) {
        void resolveGithubLogin(u).then((login) => {
          if (cancelled || !login) return;
          setStoredGithubLogin(u.uid, login);
          setGithubLogin(login);
        });
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  async function signIn(): Promise<User> {
    const result = await signInWithPopup(auth, githubProvider);
    const cred = GithubAuthProvider.credentialFromResult(result);
    if (cred?.accessToken) {
      setGithubAccessToken(cred.accessToken);
    }

    // Firebase exposes the GitHub @login only on the sign-in result.
    const additional = getAdditionalUserInfo(result);
    const username =
      (typeof additional?.username === "string" && additional.username) ||
      (cred?.accessToken ? await fetchGithubLogin(cred.accessToken) : null);

    if (isValidGithubLogin(username)) {
      setStoredGithubLogin(result.user.uid, username);
      setGithubLogin(username);
    } else {
      const fallback = extractGithubLoginFromEmail(result.user);
      setGithubLogin(fallback);
    }

    return result.user;
  }

  async function signOut(): Promise<void> {
    const uid = user?.uid;
    clearGithubAccessToken();
    if (uid) clearStoredGithubLogin(uid);
    setGithubLogin(null);
    await fbSignOut(auth);
  }

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
 * Best-effort extract of GitHub @login from the noreply email Firebase stores.
 * Does NOT fall back to displayName — that is often a real name with spaces.
 */
function extractGithubLoginFromEmail(user: User | null): string | null {
  if (!user) return null;
  const githubProvider = user.providerData.find(
    (p) => p.providerId === "github.com",
  );
  if (!githubProvider?.email?.endsWith("@users.noreply.github.com")) {
    return null;
  }

  const local = githubProvider.email.split("@")[0];
  // Format: <id>+<login> or just <login>
  const plus = local.indexOf("+");
  const candidate = plus >= 0 ? local.slice(plus + 1) : local;
  return isValidGithubLogin(candidate) ? candidate : null;
}

/**
 * Recover @login for an already-signed-in session (Firebase does not persist it).
 * Prefer GitHub API when we still have a session token; otherwise reuse the
 * maintainerLogin from a skill this user already owns.
 */
async function resolveGithubLogin(user: User): Promise<string | null> {
  const token = getGithubAccessToken();
  if (token) {
    const fromApi = await fetchGithubLogin(token);
    if (fromApi) return fromApi;
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, "skills"),
        where("maintainerUid", "==", user.uid),
        limit(1),
      ),
    );
    const login = snap.docs[0]?.data()?.maintainerLogin;
    return isValidGithubLogin(login) ? login : null;
  } catch {
    return null;
  }
}
