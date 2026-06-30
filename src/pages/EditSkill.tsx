import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  deleteSkillCallable,
  getSkill,
  refreshSkillMetadataCallable,
  updateSkillCallable,
  type SkillRecord,
} from "../lib/api";
import { getGithubAccessToken } from "../lib/githubToken";

export default function EditSkill() {
  const { owner = "", skill: skillName = "" } = useParams<{
    owner: string;
    skill: string;
  }>();
  const ref = `${owner}/${skillName}`;
  const { user, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<SkillRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [screenshots, setScreenshots] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSkill(ref)
      .then((s) => {
        if (cancelled) return;
        setSkill(s);
        setDescription(s.description);
        setCategories(s.categories.join(", "));
        setScreenshots(s.screenshots.join(", "));
        setDemoVideoUrl(s.demoVideoUrl ?? "");
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (authLoading || loading) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-text-muted">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-text-secondary">You must sign in to edit a skill.</p>
      </div>
    );
  }
  if (!skill) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-text-secondary">{error ?? "Skill not found."}</p>
      </div>
    );
  }
  if (user.uid !== skill.maintainerUid) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-text-secondary">You're not the maintainer of this skill.</p>
        <Link
          to={`/${owner}/${skillName}`}
          className="mt-2 inline-block text-cyan-bright hover:underline"
        >
          ← Back to skill page
        </Link>
      </div>
    );
  }

  const currentSkill = skill;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await updateSkillCallable({
        slug: currentSkill.slug,
        marketplaceRef: ref,
        description: description.trim(),
        categories: categories
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        screenshots: screenshots
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        demoVideoUrl: demoVideoUrl.trim() || undefined,
      });
      setStatus("Saved.");
    } catch (err) {
      setError((err as { message?: string }).message ?? "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResync() {
    setBusy(true);
    setError(null);
    setStatus(null);
    let token = getGithubAccessToken();
    if (!token) {
      try {
        await signIn();
        token = getGithubAccessToken();
      } catch (err) {
        setError(`Sign in to resync: ${(err as Error).message}`);
        setBusy(false);
        return;
      }
    }
    try {
      await refreshSkillMetadataCallable({
        slug: currentSkill.slug,
        marketplaceRef: ref,
        githubAccessToken: token ?? undefined,
      });
      setStatus("Resynced from GitHub. Reloading…");
      setTimeout(() => navigate(`/${owner}/${skillName}`), 800);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Resync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${ref} from the marketplace? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSkillCallable({ slug: currentSkill.slug, marketplaceRef: ref });
      navigate("/my-skills");
    } catch (err) {
      setError((err as { message?: string }).message ?? "Delete failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        to={`/${owner}/${skillName}`}
        className="text-xs text-text-muted hover:text-text-secondary"
      >
        ← Back to skill page
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
        ⟩ Edit {skill.displayName || skill.name}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Code-derived fields (name, version, capabilities, README) are pulled from your
        repo. Use <strong>Resync</strong> to re-fetch them after pushing changes.
      </p>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <span className="text-sm text-text-secondary">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-bg-surface px-4 py-2 text-text-primary outline-none focus:border-coral-bright"
          />
        </label>
        <label className="block">
          <span className="text-sm text-text-secondary">
            Categories (comma-separated)
          </span>
          <input
            type="text"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-bg-surface px-4 py-2 text-text-primary outline-none focus:border-coral-bright"
          />
        </label>
        <label className="block">
          <span className="text-sm text-text-secondary">
            Screenshots (comma-separated repo paths)
          </span>
          <input
            type="text"
            value={screenshots}
            onChange={(e) => setScreenshots(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-bg-surface px-4 py-2 text-text-primary outline-none focus:border-coral-bright"
          />
        </label>
        <label className="block">
          <span className="text-sm text-text-secondary">Demo video URL (optional)</span>
          <input
            type="url"
            value={demoVideoUrl}
            onChange={(e) => setDemoVideoUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-bg-surface px-4 py-2 text-text-primary outline-none focus:border-coral-bright"
          />
        </label>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-cyan-bright px-5 py-2 text-sm font-medium text-white transition hover:bg-cyan-mid disabled:opacity-60"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={handleResync}
            disabled={busy}
            className="rounded-lg border border-[var(--border-subtle)] px-5 py-2 text-sm text-text-primary transition hover:bg-bg-elevated disabled:opacity-60"
            style={{ background: "var(--surface-card)" }}
          >
            Resync from GitHub
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto rounded-lg border border-red-400/30 px-5 py-2 text-sm text-red-300 transition hover:bg-red-400/10 disabled:opacity-60"
          >
            Delete skill
          </button>
        </div>
      </form>

      {status && (
        <p className="mt-4 text-sm text-accent-bright">{status}</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
