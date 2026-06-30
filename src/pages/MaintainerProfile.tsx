import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listSkills, type SkillRecord } from "../lib/api";
import SkillGrid from "../components/SkillGrid";

const RESERVED = new Set([
  "browse",
  "submit",
  "login",
  "profile",
  "my-skills",
  "api",
  "s",
]);

export default function MaintainerProfile() {
  const { owner = "" } = useParams<{ owner: string }>();
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!owner || RESERVED.has(owner.toLowerCase())) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSkills({ owner: owner.toLowerCase(), limit: 100 })
      .then((s) => {
        if (!cancelled) setSkills(s);
      })
      .catch(() => {
        if (!cancelled) setSkills([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owner]);

  if (RESERVED.has(owner.toLowerCase())) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="text-text-secondary">Not found.</p>
        <Link to="/browse" className="mt-4 inline-block text-cyan-bright hover:underline">
          Browse skills
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <Link to="/browse" className="text-xs text-text-muted hover:text-text-secondary">
        ← Browse
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
        @{owner}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        <a
          href={`https://github.com/${owner}`}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-bright hover:underline"
        >
          github.com/{owner}
        </a>
      </p>
      <p className="mt-4 text-sm text-text-muted">
        {loading
          ? "Loading…"
          : `${skills.length} public skill${skills.length === 1 ? "" : "s"}`}
      </p>

      {!loading && skills.length === 0 && (
        <p className="mt-12 text-center text-text-secondary">No public skills yet.</p>
      )}

      {skills.length > 0 && (
        <div className="mt-8">
          <SkillGrid skills={skills} />
        </div>
      )}
    </div>
  );
}
