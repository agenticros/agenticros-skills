import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SignInWithGithubButton from "../components/SignInWithGithubButton";

export default function Login() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") ?? "/";
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate(redirect, { replace: true });
  }, [user, loading, redirect, navigate]);

  if (loading) {
    return <div className="mx-auto max-w-md px-6 py-20 text-text-muted">Loading…</div>;
  }
  if (user) return <Navigate to={redirect} replace />;

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="rounded-2xl border border-[var(--border-subtle)] p-8 text-center"
        style={{ background: "var(--surface-card)" }}>
        <img
          src="/agenticros.png"
          alt="AgenticROS"
          className="mx-auto h-16 w-16"
        />
        <h1 className="mt-4 font-display text-2xl font-semibold text-text-primary">
          Sign in to AgenticROS Skills
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          We use GitHub to verify you own the repos you submit. No email or password
          needed — your GitHub identity is all we ask.
        </p>
        <div className="mt-6 flex justify-center">
          <SignInWithGithubButton redirectTo={redirect} />
        </div>
        <p className="mt-4 text-xs text-text-muted">
          We request <code className="rounded bg-bg-elevated px-1 py-0.5">read:user</code> and{" "}
          <code className="rounded bg-bg-elevated px-1 py-0.5">public_repo</code> scopes only.
          We do <strong>not</strong> get access to your private repos.
        </p>
      </div>
    </div>
  );
}
