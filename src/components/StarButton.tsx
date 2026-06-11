/**
 * Star / favorite button.
 *
 * - Anonymous users see the count + a non-interactive star.
 * - Signed-in users can toggle their star. Calls `starSkill` /
 *   `unstarSkill` Cloud Functions; both update `skills/<slug>.starCount`
 *   inside a transaction, so we just rely on the live Firestore stream
 *   for counter accuracy instead of doing optimistic updates by hand.
 */
import { MouseEvent, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  starSkillCallable,
  unstarSkillCallable,
} from "../lib/api";
import { useNavigate } from "react-router-dom";

interface Props {
  slug: string;
  starCount: number;
  compact?: boolean;
}

export default function StarButton({ slug, starCount, compact = false }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [starred, setStarred] = useState(false);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(starCount);

  useEffect(() => {
    setCount(starCount);
  }, [starCount]);

  useEffect(() => {
    if (!user) {
      setStarred(false);
      return;
    }
    const starId = `${user.uid}_${slug}`;
    void getDoc(doc(db, "stars", starId)).then((snap) => {
      setStarred(snap.exists());
    });
  }, [user, slug]);

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      if (starred) {
        await unstarSkillCallable({ slug });
        setStarred(false);
        setCount((n) => Math.max(0, n - 1));
      } else {
        await starSkillCallable({ slug });
        setStarred(true);
        setCount((n) => n + 1);
      }
    } catch (err) {
      console.error("Star toggle failed", err);
    } finally {
      setBusy(false);
    }
  }

  const padCls = compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const fillCls = starred
    ? "text-accent-bright"
    : "text-text-muted hover:text-accent-bright";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={starred ? "Unstar" : "Star"}
      aria-label={starred ? "Unstar" : "Star"}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] transition hover:bg-bg-elevated ${padCls} ${fillCls}`}
    >
      <StarIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} filled={starred} />
      <span className="font-mono">{count}</span>
    </button>
  );
}

function StarIcon({
  className = "",
  filled,
}: {
  className?: string;
  filled: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
