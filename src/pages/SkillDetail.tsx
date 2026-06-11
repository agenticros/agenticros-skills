import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSkill, type SkillRecord } from "../lib/api";
import InstallCommand from "../components/InstallCommand";
import MarkdownReadme from "../components/MarkdownReadme";
import StarButton from "../components/StarButton";
import { useAuth } from "../contexts/AuthContext";

export default function SkillDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [skill, setSkill] = useState<SkillRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSkill(slug)
      .then((s) => {
        if (!cancelled) setSkill(s);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="h-8 w-1/3 animate-pulse rounded bg-bg-elevated" />
        <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-bg-elevated" />
        <div className="mt-8 h-64 w-full animate-pulse rounded bg-bg-elevated/40" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Skill not found
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
        <Link
          to="/browse"
          className="mt-4 inline-block text-cyan-bright hover:underline"
        >
          ← Browse all skills
        </Link>
      </div>
    );
  }

  const isMaintainer = !!user && user.uid === skill.maintainerUid;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Hero */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              to="/browse"
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              ← Browse
            </Link>
            <h1 className="mt-2 font-display text-4xl font-bold text-text-primary">
              {skill.displayName || skill.name}
            </h1>
            <p className="mt-1 font-mono text-sm text-text-muted">
              {skill.packageName} · v{skill.version}
            </p>
          </div>
          <StarButton slug={skill.slug} starCount={skill.starCount} />
        </div>

        <p className="text-lg text-text-secondary">{skill.description}</p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <a
            href={`https://github.com/${skill.maintainerLogin}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:text-text-primary"
          >
            {skill.maintainerAvatarUrl && (
              <img
                src={skill.maintainerAvatarUrl}
                alt={skill.maintainerLogin}
                className="h-6 w-6 rounded-full"
              />
            )}
            @{skill.maintainerLogin}
          </a>
          <span className="text-text-muted">·</span>
          <a
            href={skill.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-bright hover:underline"
          >
            GitHub repo
          </a>
          {skill.homepage && (
            <>
              <span className="text-text-muted">·</span>
              <a
                href={skill.homepage}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-bright hover:underline"
              >
                Homepage
              </a>
            </>
          )}
          {skill.repoOwnerVerified && (
            <>
              <span className="text-text-muted">·</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-bright/30 bg-accent-bright/10 px-2 py-0.5 text-xs text-accent-bright">
                ✓ verified maintainer
              </span>
            </>
          )}
          {isMaintainer && (
            <>
              <span className="text-text-muted">·</span>
              <Link
                to={`/s/${skill.slug}/edit`}
                className="text-coral-bright hover:underline"
              >
                Edit skill
              </Link>
            </>
          )}
        </div>

        {skill.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skill.categories.map((c) => (
              <Link
                key={c}
                to={`/browse?category=${encodeURIComponent(c)}`}
                className="rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              >
                {c}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Install */}
      <div className="mt-8 rounded-xl border border-[var(--border-subtle)] p-5"
        style={{ background: "var(--surface-card)" }}>
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
          Install on your robot
        </h2>
        <p className="mt-1 text-xs text-text-muted">
          One command — clones, builds, and registers the skill with your AgenticROS gateway.
        </p>
        <div className="mt-3">
          <InstallCommand slug={skill.slug} />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Requires{" "}
          <a
            href="https://github.com/agenticros/agenticros"
            className="text-cyan-bright hover:underline"
          >
            AgenticROS
          </a>{" "}
          to be installed locally. After install, restart your OpenClaw gateway to load
          the skill.
        </p>
      </div>

      {/* Capabilities */}
      {skill.capabilities.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            ⟩ Capabilities
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {skill.capabilities.map((cap) => (
              <div
                key={cap.id}
                className="rounded-xl border border-[var(--border-subtle)] p-4"
                style={{ background: "var(--surface-card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-coral-bright">
                    {cap.verb}
                  </h3>
                  <span className="font-mono text-xs text-text-muted">{cap.id}</span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{cap.description}</p>
                {cap.inputs && Object.keys(cap.inputs).length > 0 && (
                  <div className="mt-2 text-xs text-text-muted">
                    inputs:{" "}
                    {Object.entries(cap.inputs).map(([k, t], i) => (
                      <span key={k}>
                        <code className="rounded bg-bg-elevated px-1 py-0.5 font-mono text-coral-bright">
                          {k}: {t}
                        </code>
                        {i < Object.keys(cap.inputs!).length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Screenshots */}
      {skill.screenshots.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            ⟩ Preview
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {skill.screenshots.map((path) => {
              const url = resolveScreenshotUrl(skill.githubUrl, path);
              return (
                <a
                  key={path}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-[var(--border-subtle)]"
                >
                  <img src={url} alt={path} className="w-full" />
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* README */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          ⟩ README
        </h2>
        <div className="mt-4 rounded-xl border border-[var(--border-subtle)] p-6"
          style={{ background: "var(--surface-card)" }}>
          <MarkdownReadme source={skill.readmeMarkdown} />
        </div>
      </section>
    </div>
  );
}

function resolveScreenshotUrl(githubUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  // Convert github.com/owner/repo -> raw.githubusercontent.com/owner/repo/main
  const m = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return path;
  return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/main/${path.replace(/^\/+/, "")}`;
}
