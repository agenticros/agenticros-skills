#!/usr/bin/env node
/**
 * Upsert chrismatthieu seed skills into Firestore as public listings.
 * Bypasses the 2-new-listings / 24h submit rate limit.
 *
 * Usage (from agenticros-skills/functions):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/seed-chrismatthieu-skills.mjs
 *
 * Or with Application Default Credentials:
 *   gcloud auth application-default login
 *   node scripts/seed-chrismatthieu-skills.mjs
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

if (getApps().length === 0) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    initializeApp({
      credential: cert(JSON.parse(readFileSync(credPath, "utf8"))),
    });
  } else {
    initializeApp();
  }
}

const db = getFirestore();
const OWNER = "chrismatthieu";

/** @type {Array<{ skillSlug: string, githubRepo: string, npmPackage: string, npmVersion: string }>} */
const SEEDS = [
  { skillSlug: "followme", githubRepo: "agenticros/agenticros-skill-followme", npmPackage: "@agenticros/followme", npmVersion: "0.2.0" },
  { skillSlug: "find", githubRepo: "agenticros/agenticros-skill-find", npmPackage: "@agenticros/find", npmVersion: "0.2.0" },
  { skillSlug: "detect-humans", githubRepo: "agenticros/agenticros-skill-detect-humans", npmPackage: "@agenticros/detect-humans", npmVersion: "0.1.0" },
  { skillSlug: "start-slam", githubRepo: "agenticros/agenticros-skill-start-slam", npmPackage: "@agenticros/start-slam", npmVersion: "0.1.2" },
  { skillSlug: "navigate-to", githubRepo: "agenticros/agenticros-skill-navigate-to", npmPackage: "@agenticros/navigate-to", npmVersion: "0.1.0" },
  { skillSlug: "follow-me-ros", githubRepo: "agenticros/agenticros-skill-follow-me-ros", npmPackage: "@agenticros/follow-me-ros", npmVersion: "0.1.1" },
  { skillSlug: "navigate-through-poses", githubRepo: "agenticros/agenticros-skill-navigate-through-poses", npmPackage: "@agenticros/navigate-through-poses", npmVersion: "0.1.0" },
  { skillSlug: "moveit-pick", githubRepo: "agenticros/agenticros-skill-moveit-pick", npmPackage: "@agenticros/moveit-pick", npmVersion: "0.1.0" },
  { skillSlug: "dock-to-charger", githubRepo: "agenticros/agenticros-skill-dock-to-charger", npmPackage: "@agenticros/dock-to-charger", npmVersion: "0.1.0" },
];

async function fetchGithubJson(repo, path) {
  const url = `https://raw.githubusercontent.com/${repo}/main/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function fetchGithubText(repo, path) {
  const url = `https://raw.githubusercontent.com/${repo}/main/${path}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  return res.text();
}

async function upsertSeed(seed) {
  const pkg = await fetchGithubJson(seed.githubRepo, "package.json");
  const readme = await fetchGithubText(seed.githubRepo, "README.md");
  const block = pkg.agenticros ?? {};
  const skillSlug = seed.skillSlug;
  const marketplaceRef = `${OWNER}/${skillSlug}`;
  const docId = `${OWNER}__${skillSlug}`;
  const existing = await db.collection("skills").doc(docId).get();

  const record = {
    slug: skillSlug,
    skillSlug,
    ownerLogin: OWNER,
    marketplaceRef,
    packageName: pkg.name ?? seed.npmPackage,
    npmPackage: seed.npmPackage,
    npmVersion: seed.npmVersion,
    skillId: block.id ?? skillSlug,
    name: pkg.name ?? seed.npmPackage,
    displayName: block.displayName ?? skillSlug,
    description: block.description ?? pkg.description ?? "",
    version: pkg.version ?? seed.npmVersion,
    githubUrl: `https://github.com/${seed.githubRepo}`,
    homepage: pkg.homepage ?? null,
    bugs: typeof pkg.bugs === "string" ? pkg.bugs : pkg.bugs?.url ?? null,
    keywords: Array.isArray(pkg.keywords) ? pkg.keywords : [],
    categories: block.categories ?? [],
    screenshots: block.screenshots ?? [],
    demoVideoUrl: block.demoVideoUrl ?? null,
    capabilities: block.capabilities ?? [],
    tutorial: block.tutorial === true,
    visibility: "public",
    tools: [],
    maintainerUid: existing.exists
      ? (existing.data()?.maintainerUid ?? "seed-script")
      : "seed-script",
    maintainerLogin: OWNER,
    maintainerAvatarUrl: existing.exists
      ? (existing.data()?.maintainerAvatarUrl ?? "")
      : "",
    repoOwnerVerified: true,
    starCount: existing.exists ? (existing.data()?.starCount ?? 0) : 0,
    viewCount: existing.exists ? (existing.data()?.viewCount ?? 0) : 0,
    readmeMarkdown: readme,
    defaultBranch: "main",
    updatedAt: FieldValue.serverTimestamp(),
    lastSyncedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  };

  await db.collection("skills").doc(docId).set(record, { merge: true });
  console.log(`Upserted ${marketplaceRef} → ${seed.npmPackage}@${seed.npmVersion} (public)`);
}

async function main() {
  for (const seed of SEEDS) {
    try {
      await upsertSeed(seed);
    } catch (e) {
      console.error(`FAILED ${seed.skillSlug}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
