import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SignInWithGithubButton from "../components/SignInWithGithubButton";

export default function Profile() {
  const { user, loading, signOut, githubLogin } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-text-muted">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-text-primary">
          Not signed in
        </h1>
        <div className="mt-6 flex justify-center">
          <SignInWithGithubButton redirectTo="/profile" />
        </div>
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-text-primary">
        ⟩ Profile
      </h1>
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] p-6"
        style={{ background: "var(--surface-card)" }}>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt={user.displayName ?? "avatar"}
            className="h-16 w-16 rounded-full border border-[var(--border-subtle)]"
          />
        )}
        <div className="flex-1">
          <p className="font-display text-xl font-semibold text-text-primary">
            {user.displayName ?? githubLogin}
          </p>
          {githubLogin && (
            <a
              href={`https://github.com/${githubLogin}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-cyan-bright hover:underline"
            >
              @{githubLogin}
            </a>
          )}
          {user.email && (
            <p className="mt-1 text-sm text-text-muted">{user.email}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/my-skills"
          className="rounded-lg bg-cyan-bright px-5 py-2 text-sm font-medium text-white transition hover:bg-cyan-mid"
        >
          My skills
        </Link>
        <Link
          to="/submit"
          className="rounded-lg border border-[var(--border-subtle)] px-5 py-2 text-sm text-text-primary transition hover:bg-bg-elevated"
          style={{ background: "var(--surface-card)" }}
        >
          Submit new skill
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="ml-auto rounded-lg border border-[var(--border-subtle)] px-5 py-2 text-sm text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
