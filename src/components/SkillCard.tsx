import { Link } from "react-router-dom";
import type { SkillRecord } from "../lib/api";
import StarButton from "./StarButton";

interface Props {
  skill: SkillRecord;
}

export default function SkillCard({ skill }: Props) {
  return (
    <Link
      to={`/s/${skill.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] p-5 transition hover:border-coral-bright/50 hover:bg-bg-elevated/40"
      style={{ background: "var(--surface-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold text-text-primary transition group-hover:text-coral-bright">
            {skill.displayName || skill.name}
          </h3>
          <p className="mt-0.5 truncate font-mono text-xs text-text-muted">
            {skill.packageName}
          </p>
        </div>
        <StarButton slug={skill.slug} starCount={skill.starCount} compact />
      </div>

      <p className="line-clamp-2 text-sm text-text-secondary">
        {skill.description || "No description provided."}
      </p>

      {skill.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skill.categories.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-text-secondary"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          {skill.maintainerAvatarUrl && (
            <img
              src={skill.maintainerAvatarUrl}
              alt={skill.maintainerLogin}
              className="h-5 w-5 rounded-full"
            />
          )}
          <span>@{skill.maintainerLogin || "unknown"}</span>
        </div>
        <span className="font-mono">v{skill.version}</span>
      </div>
    </Link>
  );
}
