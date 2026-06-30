import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getGithubAccessToken } from "../lib/githubToken";
import { submitSkillCallable } from "../lib/api";
import SignInWithGithubButton from "../components/SignInWithGithubButton";

export default function Submit() {
  const { user, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (authLoading) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-text-muted">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-text-primary">
          Sign in to submit a skill
        </h1>
        <p className="mt-2 text-text-secondary">
          We use GitHub to verify you own the repo you're submitting. No email needed.
        </p>
        <div className="mt-6 flex justify-center">
          <SignInWithGithubButton redirectTo="/submit" />
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setWarnings([]);

    let token = getGithubAccessToken();
    if (!token) {
      // Re-prompt for sign-in to get a fresh OAuth token.
      try {
        await signIn();
        token = getGithubAccessToken();
      } catch (err) {
        setError(`Sign-in required to verify repo ownership: ${(err as Error).message}`);
        setSubmitting(false);
        return;
      }
    }
    if (!token) {
      setError("Couldn't capture a GitHub access token. Please sign in again.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await submitSkillCallable({
        githubUrl: url.trim(),
        githubAccessToken: token,
      });
      const data = result.data as {
        slug: string;
        marketplaceRef?: string;
        warnings?: string[];
      };
      if (data.warnings) setWarnings(data.warnings);
      const dest = data.marketplaceRef
        ? `/${data.marketplaceRef}`
        : `/s/${data.slug}`;
      navigate(dest);
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "Submission failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-text-primary">
        ⟩ Submit a skill
      </h1>
      <p className="mt-2 text-text-secondary">
        Paste the GitHub URL of your skill repo. We'll pull the{" "}
        <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-coral-bright">
          package.json
        </code>{" "}
        and README, verify you have push access, and publish it.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="block">
          <span className="font-display text-sm uppercase tracking-wider text-text-muted">
            GitHub repo URL
          </span>
          <input
            type="url"
            required
            placeholder="https://github.com/agenticros/agenticros-skill-followme"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[var(--border-subtle)] bg-bg-surface px-4 py-3 text-text-primary outline-none transition focus:border-coral-bright"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-cyan-bright px-6 py-3 text-base font-medium text-white transition hover:bg-cyan-mid disabled:opacity-60"
        >
          {submitting ? "Validating + publishing…" : "Submit skill"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">
          <strong className="block font-semibold">Submission failed</strong>
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-6 rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm text-yellow-200">
          <strong className="block font-semibold">Warnings</strong>
          <ul className="mt-2 list-disc pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-10 rounded-xl border border-[var(--border-subtle)] p-5"
        style={{ background: "var(--surface-card)" }}>
        <summary className="cursor-pointer font-display text-sm uppercase tracking-wider text-text-secondary">
          What needs to be in package.json?
        </summary>
        <div className="markdown mt-3 text-sm">
          <pre>
            <code>{`{
  "name": "agenticros-skill-<id>",
  "main": "dist/index.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/<you>/<repo>.git"
  },
  "agenticros": {
    "id": "<id>",
    "displayName": "Your Skill",
    "description": "One-sentence summary.",
    "categories": ["navigation", "vision"],
    "screenshots": ["docs/screenshot.png"],
    "capabilities": [
      { "id": "do_thing", "verb": "do", "description": "..." }
    ]
  },
  "dependencies": {
    "@agenticros/core": "^0.5.0"
  }
}`}</code>
          </pre>
          <p>
            See{" "}
            <a
              href="https://github.com/agenticros/agenticros/blob/main/docs/skills.md"
              target="_blank"
              rel="noreferrer"
            >
              docs/skills.md
            </a>{" "}
            for the full contract.
          </p>
        </div>
      </details>
    </div>
  );
}
