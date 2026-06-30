import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSkill, skillRef, type SkillRecord } from "../lib/api";
import InstallCommand from "../components/InstallCommand";
import MarkdownReadme from "../components/MarkdownReadme";
import StarButton from "../components/StarButton";
import { useAuth } from "../contexts/AuthContext";

export default function SkillDetail() {
  const { owner = "", skill: skillName = "" } = useParams<{
    owner: string;
    skill: string;
  }>();
  const ref = `${owner}/${skillName}`;
  const { user } = useAuth();
  const [skill, setSkill] = useState<SkillRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSkill(ref)
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
  }, [ref]);

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
  const installRef = skillRef(skill);
  const editPath = `/${owner}/${skillName}/edit`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
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
          <Link
            to={`/${skill.maintainerLogin}`}
            className="flex items-center gap-2 hover:text-text-primary"
          >
            {skill.maintainerAvatarUrl && (
              <img
                src={skill.maintainerAvatarUrl}
                alt={skill.maintainerLogin}
                className="h-6 w-6 rounded-full"
              />
            )}
            <span>@{skill.maintainerLogin}</span>
          </Link>
          <span className="text-text-muted">·</span>
          <Link
            to={`/${skill.maintainerLogin}`}
            className="text-cyan-bright hover:underline"
          >
            More from @{skill.maintainerLogin}
          </Link>
          {skill.repoOwnerVerified && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
              ✓ verified maintainer
            </span>
          )}
          {isMaintainer && (
            <Link
              to={editPath}
              className="ml-auto rounded-md border border-[var(--border-subtle)] px-3 py-1 text-xs hover:bg-bg-elevated"
            >
              Edit listing
            </Link>
          )}
        </div>

        {skill.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skill.categories.map((c) => (
              <Link
                key={c}
                to={`/browse?category=${encodeURIComponent(c)}`}
                className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-text-secondary hover:border-coral-bright/40"
              >
                {c}
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-sm uppercase tracking-wider text-text-muted">
          ⟩ Install
        </h2>
        <div className="mt-3">
          <InstallCommand marketplaceRef={installRef} />
        </div>
      </section>

      {skill.capabilities.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-wider text-text-muted">
            ⟩ Capabilities
          </h2>
          <ul className="mt-3 space-y-2">
            {skill.capabilities.map((cap) => (
              <li
                key={cap.id}
                className="rounded-lg border border-[var(--border-subtle)] p-4"
              >
                <span className="font-mono text-sm text-coral-bright">{cap.verb}</span>
                <span className="mx-2 text-text-muted">—</span>
                <span className="text-sm text-text-secondary">{cap.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {skill.readmeMarkdown && (
        <section className="mt-10">
          <h2 className="font-display text-sm uppercase tracking-wider text-text-muted">
            ⟩ README
          </h2>
          <div className="mt-4 prose prose-invert max-w-none">
            <MarkdownReadme source={skill.readmeMarkdown} />
          </div>
        </section>
      )}

      <div className="mt-8 text-xs text-text-muted">
        <a
          href={skill.githubUrl}
          target="_blank"
          rel="noreferrer"
          className="hover:text-text-secondary"
        >
          View source on GitHub
        </a>
        {skill.visibility === "unlisted" && (
          <span className="ml-3 rounded bg-bg-elevated px-2 py-0.5">Unlisted</span>
        )}
      </div>
    </div>
  );
}
