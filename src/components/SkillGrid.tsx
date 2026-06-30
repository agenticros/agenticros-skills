import type { SkillRecord } from "../lib/api";
import { skillRef } from "../lib/api";
import SkillCard from "./SkillCard";

interface Props {
  skills: SkillRecord[];
  emptyMessage?: string;
}

export default function SkillGrid({ skills, emptyMessage = "No skills yet." }: Props) {
  if (skills.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] p-10 text-center text-sm text-text-muted">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((s) => (
        <SkillCard key={skillRef(s)} skill={s} />
      ))}
    </div>
  );
}
