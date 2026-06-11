import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import type { SkillRecord } from "../lib/api";
import SignInWithGithubButton from "../components/SignInWithGithubButton";
import SkillGrid from "../components/SkillGrid";

export default function MySkills() {
  const { user, loading: authLoading } = useAuth();
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const q = query(
          collection(db, "skills"),
          where("maintainerUid", "==", user.uid),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return { ...raw, slug: d.id, ...toMillis(raw) } as SkillRecord;
        });
        setSkills(list);
      } catch (err) {
        console.error("Failed to load my skills", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-text-muted">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-text-primary">
          Sign in to manage your skills
        </h1>
        <div className="mt-6 flex justify-center">
          <SignInWithGithubButton redirectTo="/my-skills" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            ⟩ My skills
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {skills.length} skill{skills.length === 1 ? "" : "s"} maintained by you
          </p>
        </div>
        <Link
          to="/submit"
          className="rounded-lg bg-cyan-bright px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-mid"
        >
          + Submit new skill
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-bg-elevated/30"
              />
            ))}
          </div>
        ) : (
          <SkillGrid
            skills={skills}
            emptyMessage="You haven't submitted any skills yet."
          />
        )}
      </div>
    </div>
  );
}

function toMillis(raw: Record<string, unknown>): {
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
} {
  const get = (k: string): number => {
    const v = raw[k];
    if (v instanceof Timestamp) return v.toMillis();
    if (typeof v === "number") return v;
    return 0;
  };
  return {
    createdAt: get("createdAt"),
    updatedAt: get("updatedAt"),
    lastSyncedAt: get("lastSyncedAt"),
  };
}
