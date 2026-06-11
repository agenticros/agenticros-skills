import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SignInWithGithubButton from "./SignInWithGithubButton";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-bg-deep/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/agenticros.png" alt="AgenticROS" className="h-8 w-8" />
          <span className="font-display text-xl font-semibold text-coral-bright">
            AgenticROS Skills
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/browse"
            className="text-sm text-text-secondary transition hover:text-text-primary"
          >
            Browse
          </Link>
          <Link
            to="/submit"
            className="text-sm text-text-secondary transition hover:text-text-primary"
          >
            Submit
          </Link>
          <a
            href="https://github.com/agenticros/agenticros/blob/main/docs/skills.md"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-text-secondary transition hover:text-text-primary"
          >
            Docs
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-text-muted">…</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/my-skills"
                className="hidden text-sm text-text-secondary transition hover:text-text-primary md:block"
              >
                My skills
              </Link>
              <Link to="/profile" className="flex items-center gap-2">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? ""}
                    className="h-8 w-8 rounded-full border border-[var(--border-subtle)]"
                  />
                )}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary md:block"
              >
                Sign out
              </button>
            </div>
          ) : (
            <SignInWithGithubButton size="sm" />
          )}
        </div>
      </div>
    </header>
  );
}
