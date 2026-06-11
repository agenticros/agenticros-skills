/**
 * Public REST API ("api" function).
 *
 * Mounted under `https://skills.agenticros.com/api/**` via the Hosting
 * rewrite in firebase.json. Read-only — no auth required.
 *
 * Endpoints:
 *   GET  /skills                       List + simple text search
 *   GET  /skills/:slug                 Get one
 *   GET  /skills/:slug/install         Install descriptor for the CLI
 */
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import { db, FieldValue } from "./admin";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// When invoked via the Firebase Hosting rewrite (/api/**), the function
// receives the full original path including the /api prefix. When invoked
// directly at https://<region>-<project>.cloudfunctions.net/api/..., the
// function name segment is already stripped before reaching Express. Strip
// any remaining /api prefix here so route patterns match in both cases.
app.use((req, _res, next) => {
  if (req.url === "/api") {
    req.url = "/";
  } else if (req.url.startsWith("/api/")) {
    req.url = req.url.slice(4) || "/";
  }
  next();
});

interface SkillDoc {
  slug?: string;
  name?: string;
  displayName?: string;
  description?: string;
  packageName?: string;
  skillId?: string;
  version?: string;
  githubUrl?: string;
  homepage?: string | null;
  bugs?: string | null;
  keywords?: string[];
  categories?: string[];
  screenshots?: string[];
  demoVideoUrl?: string | null;
  capabilities?: unknown[];
  tools?: string[];
  maintainerUid?: string;
  maintainerLogin?: string;
  maintainerAvatarUrl?: string;
  repoOwnerVerified?: boolean;
  starCount?: number;
  viewCount?: number;
  readmeMarkdown?: string;
  defaultBranch?: string;
  createdAt?: FirebaseFirestore.Timestamp | null;
  updatedAt?: FirebaseFirestore.Timestamp | null;
  lastSyncedAt?: FirebaseFirestore.Timestamp | null;
}

function serialize(slug: string, d: SkillDoc): Record<string, unknown> {
  return {
    slug,
    name: d.name ?? slug,
    displayName: d.displayName ?? d.name ?? slug,
    description: d.description ?? "",
    packageName: d.packageName ?? d.name ?? "",
    skillId: d.skillId ?? slug,
    version: d.version ?? "0.0.0",
    githubUrl: d.githubUrl ?? "",
    homepage: d.homepage ?? null,
    bugs: d.bugs ?? null,
    keywords: d.keywords ?? [],
    categories: d.categories ?? [],
    screenshots: d.screenshots ?? [],
    demoVideoUrl: d.demoVideoUrl ?? null,
    capabilities: d.capabilities ?? [],
    tools: d.tools ?? [],
    maintainerUid: d.maintainerUid ?? "",
    maintainerLogin: d.maintainerLogin ?? "",
    maintainerAvatarUrl: d.maintainerAvatarUrl ?? "",
    repoOwnerVerified: !!d.repoOwnerVerified,
    starCount: d.starCount ?? 0,
    viewCount: d.viewCount ?? 0,
    readmeMarkdown: d.readmeMarkdown ?? "",
    createdAt: d.createdAt?.toMillis?.() ?? 0,
    updatedAt: d.updatedAt?.toMillis?.() ?? 0,
    lastSyncedAt: d.lastSyncedAt?.toMillis?.() ?? 0,
  };
}

// ---- /skills ---------------------------------------------------------------

app.get("/skills", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const sort = req.query.sort === "popular" ? "popular" : "recent";
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 100);

    let query: FirebaseFirestore.Query = db.collection("skills");
    if (category) query = query.where("categories", "array-contains", category);
    if (sort === "popular") {
      query = query.orderBy("starCount", "desc");
    } else {
      query = query.orderBy("createdAt", "desc");
    }
    query = query.limit(limit);

    const snap = await query.get();
    let skills = snap.docs.map((d) => serialize(d.id, d.data() as SkillDoc));

    // Tiny in-memory text filter — fine for the marketplace scale.
    if (q) {
      skills = skills.filter((s) => {
        const blob = [
          s.slug,
          s.name,
          s.displayName,
          s.description,
          (s.keywords as string[]).join(" "),
          (s.categories as string[]).join(" "),
          s.maintainerLogin,
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }

    res.set("Cache-Control", "public, max-age=30, s-maxage=60");
    res.json({ skills });
  } catch (err) {
    console.error("GET /skills failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---- /skills/:slug ---------------------------------------------------------

app.get("/skills/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const doc = await db.collection("skills").doc(slug).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    // Bump view count (fire-and-forget; don't block the response).
    void db.collection("skills").doc(slug).update({
      viewCount: FieldValue.increment(1),
    });
    res.set("Cache-Control", "public, max-age=30, s-maxage=60");
    res.json(serialize(slug, doc.data() as SkillDoc));
  } catch (err) {
    console.error("GET /skills/:slug failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---- /skills/:slug/install -------------------------------------------------

app.get("/skills/:slug/install", async (req, res) => {
  try {
    const slug = req.params.slug;
    const doc = await db.collection("skills").doc(slug).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const d = doc.data() as SkillDoc;
    if (!d.githubUrl) {
      res.status(500).json({ error: "Skill has no githubUrl on record" });
      return;
    }
    res.set("Cache-Control", "public, max-age=60, s-maxage=120");
    res.json({
      slug,
      skillId: d.skillId ?? slug,
      packageName: d.packageName ?? "",
      githubUrl: d.githubUrl,
      ref: d.defaultBranch ?? "main",
      buildCmd: "pnpm install && pnpm build",
    });
  } catch (err) {
    console.error("GET /skills/:slug/install failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---- Health ---------------------------------------------------------------

app.get("/health", (_req, res) => res.json({ ok: true }));

export const api = onRequest(
  { region: "us-central1", cors: true, maxInstances: 10 },
  app,
);
