import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSkills, type SkillRecord } from "../lib/api";
import SearchBar from "../components/SearchBar";
import SkillGrid from "../components/SkillGrid";

export default function Home() {
  const [featured, setFeatured] = useState<SkillRecord[]>([]);
  const [recent, setRecent] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pop, rec] = await Promise.all([
          listSkills({ sort: "popular", limit: 6 }),
          listSkills({ sort: "recent", limit: 6 }),
        ]);
        if (!cancelled) {
          setFeatured(pop);
          setRecent(rec);
        }
      } catch (err) {
        console.error("Failed to load home skills", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Quick stats derived from what we just loaded.
  const totalKnown = new Set(
    [...featured, ...recent].map((s) => s.slug),
  ).size;
  const developers = new Set(
    [...featured, ...recent].map((s) => s.maintainerLogin),
  ).size;
  const installs = [...featured, ...recent].reduce(
    (n, s) => n + s.viewCount,
    0,
  );

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)] px-6 py-20 md:py-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <div className="flex w-full max-w-[21rem] flex-col items-center md:max-w-[30rem]">
            <img
              src="/agenticros-logo-only-removebg-preview.png"
              alt=""
              aria-hidden="true"
              className="w-36 object-contain md:w-44"
            />
            <div className="mt-2 h-11 w-full overflow-hidden md:h-12">
              <img
                src="/agenticros-text-removebg-preview.png"
                alt="AgenticROS"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-text-primary md:text-6xl">
            Skills for your <span className="text-coral-bright">agentic robot</span>.
          </h1>
          <p className="max-w-2xl text-lg text-text-secondary md:text-xl">
            Discover, install, and share community-built skills that extend{" "}
            <a
              href="https://agenticros.com"
              className="text-cyan-bright hover:underline"
            >
              AgenticROS
            </a>{" "}
            with new tools the AI agent can call — follow a person, find an object,
            navigate to a waypoint, and more.
          </p>
          <div className="mt-4 w-full max-w-2xl">
            <SearchBar />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
            <span>Try:</span>
            {["follow", "vision", "find", "navigation"].map((t) => (
              <Link
                key={t}
                to={`/browse?q=${t}`}
                className="rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 transition hover:bg-bg-elevated hover:text-text-primary"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* STATS strip */}
      <section className="border-b border-[var(--border-subtle)] bg-bg-surface/40 px-6 py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-6 text-center">
          <Stat label="skills" value={loading ? "…" : totalKnown} />
          <Stat label="developers" value={loading ? "…" : developers} />
          <Stat label="installs" value={loading ? "…" : installs} />
        </div>
      </section>

      {/* FEATURED (popular) */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeader
          title="Most starred"
          subtitle="The skills the community keeps coming back to."
          to="/browse?sort=popular"
        />
        <div className="mt-6">
          {loading ? (
            <SkillGridSkeleton />
          ) : (
            <SkillGrid
              skills={featured}
              emptyMessage="No skills yet — be the first to submit one!"
            />
          )}
        </div>
      </section>

      {/* RECENT */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <SectionHeader
          title="Recently added"
          subtitle="Fresh from the community."
          to="/browse?sort=recent"
        />
        <div className="mt-6">
          {loading ? (
            <SkillGridSkeleton />
          ) : (
            <SkillGrid
              skills={recent}
              emptyMessage="No recent submissions yet."
            />
          )}
        </div>
      </section>

      {/* CTA: submit your skill */}
      <section className="border-t border-[var(--border-subtle)] bg-bg-surface/40 px-6 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
          <h2 className="font-display text-3xl font-semibold text-text-primary">
            Built a skill? Share it.
          </h2>
          <p className="max-w-2xl text-text-secondary">
            Submit your GitHub repo to publish it on the marketplace. We verify ownership,
            pull your README, and make it installable with one command.
          </p>
          <Link
            to="/submit"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-cyan-bright px-6 py-3 text-base font-medium text-white transition hover:bg-cyan-mid"
          >
            Submit a skill
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="font-display text-4xl font-bold text-coral-bright">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-text-muted">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  to,
}: {
  title: string;
  subtitle: string;
  to: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          ⟩ {title}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
      <Link
        to={to}
        className="text-sm text-cyan-bright hover:underline"
      >
        View all →
      </Link>
    </div>
  );
}

function SkillGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-bg-elevated/30"
        />
      ))}
    </div>
  );
}
