/**
 * Public REST API ("api" function).
 *
 * Mounted under `https://skills.agenticros.com/api/**` via Firebase Hosting.
 */
import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import { db, FieldValue } from "./admin";
import { ManifestError, validateManifest } from "./util/manifest";
import {
  resolveSkillDoc,
  serializeSkillDoc,
  submitSkillFromGithub,
  migrateLegacySkillDocs,
  isMigrateAdmin,
} from "./util/submit";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
  if (req.url === "/api") {
    req.url = "/";
  } else if (req.url.startsWith("/api/")) {
    req.url = req.url.slice(4) || "/";
  }
  next();
});

function bearerToken(req: express.Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

async function githubUserFromToken(token: string): Promise<{
  id: number;
  login: string;
  avatar_url: string;
}> {
  const r = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "agenticros-skills-marketplace",
    },
  });
  if (!r.ok) throw new Error("Invalid GitHub token.");
  return (await r.json()) as { id: number; login: string; avatar_url: string };
}

// ---- POST /skills/validate -------------------------------------------------

app.post("/skills/validate", (req, res) => {
  try {
    const manifest = req.body?.manifest ?? req.body;
    const { warnings } = validateManifest(manifest);
    res.json({ ok: true, errors: [], warnings });
  } catch (err) {
    if (err instanceof ManifestError) {
      res.status(400).json({ ok: false, errors: [err.message], warnings: [] });
      return;
    }
    res.status(500).json({ ok: false, errors: [(err as Error).message], warnings: [] });
  }
});

// ---- POST /skills/submit -----------------------------------------------------

app.post("/skills/submit", async (req, res) => {
  try {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Authorization: Bearer <github_pat> required." });
      return;
    }
    const githubUrl = req.body?.githubUrl;
    if (!githubUrl || typeof githubUrl !== "string") {
      res.status(400).json({ error: "githubUrl is required." });
      return;
    }
    const ghUser = await githubUserFromToken(token);
    const result = await submitSkillFromGithub({
      githubUrl,
      githubAccessToken: token,
      maintainerUid: `github:${ghUser.id}`,
      maintainerLogin: ghUser.login,
      maintainerAvatarUrl: ghUser.avatar_url,
    });
    res.json({
      marketplaceRef: result.marketplaceRef,
      ownerLogin: result.ownerLogin,
      skillSlug: result.skillSlug,
      visibility: result.visibility,
      warnings: result.warnings,
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Rate limit")) {
      res.status(429).json({ error: msg });
      return;
    }
    res.status(400).json({ error: msg });
  }
});

// ---- POST /admin/migrate-slugs (one-time; GitHub admin login required) --------

app.post("/admin/migrate-slugs", async (req, res) => {
  try {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Authorization: Bearer <github_pat> required." });
      return;
    }
    const ghUser = await githubUserFromToken(token);
    if (!isMigrateAdmin(ghUser.login)) {
      res.status(403).json({ error: "Admin GitHub login required." });
      return;
    }
    const result = await migrateLegacySkillDocs();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---- GET /skills -------------------------------------------------------------

app.get("/skills", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const owner = typeof req.query.owner === "string" ? req.query.owner.toLowerCase() : "";
    const sort = req.query.sort === "popular" ? "popular" : "recent";
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 100);
    const includeUnlisted = req.query.include === "unlisted";

    let query: FirebaseFirestore.Query = db.collection("skills");
    if (owner) query = query.where("ownerLogin", "==", owner);
    if (category) query = query.where("categories", "array-contains", category);
    if (!includeUnlisted && !owner) {
      query = query.where("visibility", "==", "public");
    }
    if (sort === "popular") {
      query = query.orderBy("starCount", "desc");
    } else {
      query = query.orderBy("createdAt", "desc");
    }
    query = query.limit(limit);

    const snap = await query.get();
    let skills = snap.docs.map((d) => serializeSkillDoc(d.id, d.data()));

    if (!includeUnlisted && owner) {
      skills = skills.filter((s) => s.visibility === "public");
    }

    if (q) {
      skills = skills.filter((s) => {
        const blob = [
          s.slug,
          s.marketplaceRef,
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

// ---- GET /skills/:owner/:skill ---------------------------------------------

app.get("/skills/:owner/:skill", async (req, res) => {
  try {
    const ref = `${req.params.owner}/${req.params.skill}`;
    const resolved = await resolveSkillDoc(ref);
    if (!resolved) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    void db.collection("skills").doc(resolved.docId).update({
      viewCount: FieldValue.increment(1),
    });
    res.set("Cache-Control", "public, max-age=30, s-maxage=60");
    res.json(serializeSkillDoc(resolved.docId, resolved.data));
  } catch (err) {
    console.error("GET /skills/:owner/:skill failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/skills/:owner/:skill/install", async (req, res) => {
  try {
    const ref = `${req.params.owner}/${req.params.skill}`;
    const resolved = await resolveSkillDoc(ref);
    if (!resolved) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const d = resolved.data;
    if (!d.githubUrl) {
      res.status(500).json({ error: "Skill has no githubUrl on record" });
      return;
    }
    const mref =
      (d.marketplaceRef as string) ??
      `${req.params.owner}/${req.params.skill}`;
    res.set("Cache-Control", "public, max-age=60, s-maxage=120");
    res.json({
      slug: d.skillSlug ?? d.slug ?? req.params.skill,
      marketplaceRef: mref,
      skillId: d.skillId ?? d.skillSlug ?? req.params.skill,
      packageName: d.packageName ?? "",
      githubUrl: d.githubUrl,
      ref: d.defaultBranch ?? "main",
      buildCmd: "pnpm install && pnpm build",
    });
  } catch (err) {
    console.error("GET install failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---- GET /skills/:slug (legacy) --------------------------------------------

app.get("/skills/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const resolved = await resolveSkillDoc(slug);
    if (!resolved) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const serialized = serializeSkillDoc(resolved.docId, resolved.data);
    if (serialized.marketplaceRef && serialized.marketplaceRef !== slug) {
      res.status(200).json({ redirect: serialized.marketplaceRef, ...serialized });
      return;
    }
    void db.collection("skills").doc(resolved.docId).update({
      viewCount: FieldValue.increment(1),
    });
    res.set("Cache-Control", "public, max-age=30, s-maxage=60");
    res.json(serialized);
  } catch (err) {
    console.error("GET /skills/:slug failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/skills/:slug/install", async (req, res) => {
  try {
    const slug = req.params.slug;
    const resolved = await resolveSkillDoc(slug);
    if (!resolved) {
      res.status(404).json({ error: "Skill not found" });
      return;
    }
    const d = resolved.data;
    if (!d.githubUrl) {
      res.status(500).json({ error: "Skill has no githubUrl on record" });
      return;
    }
    const mref = (d.marketplaceRef as string) ?? slug;
    res.set("Cache-Control", "public, max-age=60, s-maxage=120");
    res.json({
      slug: d.skillSlug ?? d.slug ?? slug,
      marketplaceRef: mref,
      skillId: d.skillId ?? d.skillSlug ?? slug,
      packageName: d.packageName ?? "",
      githubUrl: d.githubUrl,
      ref: d.defaultBranch ?? "main",
      buildCmd: "pnpm install && pnpm build",
    });
  } catch (err) {
    console.error("GET legacy install failed", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

export const api = onRequest(
  { region: "us-central1", cors: true, maxInstances: 10 },
  app,
);
