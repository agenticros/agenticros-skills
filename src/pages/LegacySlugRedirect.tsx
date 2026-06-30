import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSkill } from "../lib/api";

/** Redirect legacy /s/:slug URLs to /:owner/:skill. */
export default function LegacySlugRedirect() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    getSkill(slug)
      .then((skill) => {
        if (cancelled) return;
        const dest = skill.marketplaceRef
          ? `/${skill.marketplaceRef}`
          : skill.ownerLogin && (skill.skillSlug ?? skill.slug)
            ? `/${skill.ownerLogin}/${skill.skillSlug ?? skill.slug}`
            : null;
        if (dest) navigate(dest, { replace: true });
        else navigate("/browse", { replace: true });
      })
      .catch(() => {
        if (!cancelled) navigate("/browse", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 text-text-muted">Redirecting…</div>
  );
}
