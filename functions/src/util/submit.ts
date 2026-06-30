/**
 * Shared skill submission logic for Firebase callables and REST API.
 */

import { createHash } from "node:crypto";
import { db, FieldValue } from "../admin";
import {
  fetchFileAtRef,
  fetchPackageJson,
  fetchReadme,
  getRepo,
  verifyOwnership,
} from "../github";
import {
  manifestRepoUrl,
  validateManifest,
  type AgenticROSBlock,
} from "./manifest";
import { parseGithubUrl } from "./slug";

export interface SubmitInput {
  githubUrl: string;
  githubAccessToken: string;
  maintainerUid: string;
  maintainerLogin: string;
  maintainerAvatarUrl?: string;
}

export interface SubmitResult {
  marketplaceRef: string;
  ownerLogin: string;
  skillSlug: string;
  visibility: "public" | "unlisted";
  warnings: string[];
  docId: string;
}

export function firestoreDocId(ownerLogin: string, skillSlug: string): string {
  return `${ownerLogin.toLowerCase()}__${skillSlug}`;
}

export function marketplaceRef(ownerLogin: string, skillSlug: string): string {
  return `${ownerLogin.toLowerCase()}/${skillSlug}`;
}

/** Known unmodified CLI template hashes (normalized src/index.ts). Updated with CLI releases. */
export const KNOWN_TEMPLATE_FINGERPRINTS = new Set<string>([
  // Populated at deploy from CLI template sources; empty set still allows tutorial flag gate.
]);

export function hashSkillSource(source: string): string {
  const normalized = source.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

export async function resolveSkillDoc(ref: string): Promise<{
  docId: string;
  data: FirebaseFirestore.DocumentData;
} | null> {
  const trimmed = ref.trim();
  if (trimmed.includes("/")) {
    const [owner, ...rest] = trimmed.split("/");
    const skill = rest.join("/");
    const docId = firestoreDocId(owner, skill);
    const doc = await db.collection("skills").doc(docId).get();
    if (doc.exists) return { docId, data: doc.data()! };
    return null;
  }

  // Legacy flat slug: doc id or legacySlug field.
  const byId = await db.collection("skills").doc(trimmed).get();
  if (byId.exists) return { docId: byId.id, data: byId.data()! };

  const byLegacy = await db
    .collection("skills")
    .where("legacySlug", "==", trimmed)
    .limit(1)
    .get();
  if (!byLegacy.empty) {
    const d = byLegacy.docs[0];
    return { docId: d.id, data: d.data() };
  }

  const bySkillSlug = await db
    .collection("skills")
    .where("skillSlug", "==", trimmed)
    .limit(1)
    .get();
  if (!bySkillSlug.empty) {
    const d = bySkillSlug.docs[0];
    return { docId: d.id, data: d.data() };
  }

  return null;
}

async function countRecentSubmits(maintainerUid: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snap = await db
    .collection("skills")
    .where("maintainerUid", "==", maintainerUid)
    .where("createdAt", ">=", since)
    .get();
  return snap.size;
}

async function countMaintainerSkills(maintainerUid: string): Promise<number> {
  const snap = await db
    .collection("skills")
    .where("maintainerUid", "==", maintainerUid)
    .get();
  return snap.size;
}

async function maintainerFirstSubmitAgeDays(maintainerUid: string): Promise<number | null> {
  const snap = await db
    .collection("skills")
    .where("maintainerUid", "==", maintainerUid)
    .orderBy("createdAt", "asc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const created = snap.docs[0].data().createdAt?.toDate?.() as Date | undefined;
  if (!created) return null;
  return (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000);
}

function computeVisibility(opts: {
  block: AgenticROSBlock;
  templateFingerprint: string | null;
  maintainerPublicCount: number;
  maintainerAgeDays: number | null;
}): "public" | "unlisted" {
  if (opts.block.tutorial === true) return "unlisted";
  if (
    opts.templateFingerprint &&
    KNOWN_TEMPLATE_FINGERPRINTS.has(opts.templateFingerprint)
  ) {
    return "unlisted";
  }
  const noScreenshot = !opts.block.screenshots || opts.block.screenshots.length === 0;
  if (
    noScreenshot &&
    opts.maintainerPublicCount < 2 &&
    opts.maintainerAgeDays !== null &&
    opts.maintainerAgeDays < 7
  ) {
    return "unlisted";
  }
  return "public";
}

export async function submitSkillFromGithub(input: SubmitInput): Promise<SubmitResult> {
  const parsed = parseGithubUrl(input.githubUrl);
  if (!parsed) {
    throw new Error("URL must look like https://github.com/<owner>/<repo>.");
  }
  const { owner, repo } = parsed;

  const ownership = await verifyOwnership(owner, repo, input.githubAccessToken);
  if (!ownership.hasPushAccess) {
    throw new Error(
      `You must have push access on ${owner}/${repo} to submit it.`,
    );
  }

  const ownerLogin = ownership.viewerLogin.toLowerCase();
  const ghRepo = await getRepo(owner, repo, input.githubAccessToken);
  const ref = ghRepo.default_branch;

  const pkg = await fetchPackageJson(owner, repo, ref, input.githubAccessToken);
  const { manifest, block, warnings } = validateManifest(pkg);
  const readme = await fetchReadme(owner, repo, ref, input.githubAccessToken);

  const skillSlug = block.id;
  const docId = firestoreDocId(ownerLogin, skillSlug);
  const mref = marketplaceRef(ownerLogin, skillSlug);

  const existingDoc = await db.collection("skills").doc(docId).get();
  const isUpdate = existingDoc.exists;
  if (isUpdate) {
    const existing = existingDoc.data() as { maintainerUid?: string; githubUrl?: string };
    if (
      existing.maintainerUid &&
      existing.maintainerUid !== input.maintainerUid &&
      existing.githubUrl !== `https://github.com/${owner}/${repo}`
    ) {
      throw new Error(
        `Skill ${mref} is already registered by another maintainer.`,
      );
    }
  } else {
    const recent = await countRecentSubmits(input.maintainerUid);
    if (recent >= 2) {
      throw new Error("Rate limit: max 2 new skill listings per 24 hours.");
    }
    const total = await countMaintainerSkills(input.maintainerUid);
    const ageDays = await maintainerFirstSubmitAgeDays(input.maintainerUid);
    if (total >= 10 && ageDays !== null && ageDays < 30) {
      throw new Error("Rate limit: max 10 listings for accounts younger than 30 days.");
    }
  }

  let templateFingerprint: string | null = null;
  const indexSrc = await fetchFileAtRef(
    owner,
    repo,
    "src/index.ts",
    ref,
    input.githubAccessToken,
  );
  if (indexSrc) {
    templateFingerprint = hashSkillSource(indexSrc);
  }

  const maintainerPublicSnap = await db
    .collection("skills")
    .where("maintainerUid", "==", input.maintainerUid)
    .where("visibility", "==", "public")
    .get();
  const maintainerAgeDays = await maintainerFirstSubmitAgeDays(input.maintainerUid);

  const visibility = computeVisibility({
    block,
    templateFingerprint,
    maintainerPublicCount: maintainerPublicSnap.size,
    maintainerAgeDays,
  });

  const now = FieldValue.serverTimestamp();
  const githubUrlNormalized = `https://github.com/${owner}/${repo}`;
  const declaredRepoUrl = manifestRepoUrl(manifest);

  const record = {
    slug: skillSlug,
    skillSlug,
    ownerLogin,
    marketplaceRef: mref,
    packageName: manifest.name,
    skillId: block.id,
    name: manifest.name,
    displayName: block.displayName ?? manifest.name,
    description: block.description ?? manifest.description ?? "",
    version: manifest.version,
    githubUrl: githubUrlNormalized,
    homepage: manifest.homepage ?? null,
    bugs:
      typeof manifest.bugs === "string"
        ? manifest.bugs
        : manifest.bugs?.url ?? null,
    keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
    categories: block.categories ?? [],
    screenshots: block.screenshots ?? [],
    demoVideoUrl: block.demoVideoUrl ?? null,
    capabilities: block.capabilities ?? [],
    tutorial: block.tutorial === true,
    templateFingerprint,
    visibility,
    tools: [],
    maintainerUid: input.maintainerUid,
    maintainerLogin: ownerLogin,
    maintainerAvatarUrl: input.maintainerAvatarUrl ?? "",
    repoOwnerVerified: true,
    starCount: existingDoc.exists
      ? (existingDoc.data() as { starCount?: number }).starCount ?? 0
      : 0,
    viewCount: existingDoc.exists
      ? (existingDoc.data() as { viewCount?: number }).viewCount ?? 0
      : 0,
    readmeMarkdown: readme,
    declaredRepoUrl,
    warnings,
    createdAt: existingDoc.exists ? existingDoc.data()?.createdAt ?? now : now,
    updatedAt: now,
    lastSyncedAt: now,
    defaultBranch: ref,
  };

  await db.collection("skills").doc(docId).set(record, { merge: true });

  return {
    marketplaceRef: mref,
    ownerLogin,
    skillSlug,
    visibility,
    warnings,
    docId,
  };
}

export function serializeSkillDoc(
  docId: string,
  d: FirebaseFirestore.DocumentData,
): Record<string, unknown> {
  const marketplaceRefVal =
    (d.marketplaceRef as string) ??
    (d.ownerLogin && d.skillSlug
      ? marketplaceRef(String(d.ownerLogin), String(d.skillSlug))
      : docId);
  return {
    slug: d.slug ?? d.skillSlug ?? docId,
    marketplaceRef: marketplaceRefVal,
    ownerLogin: d.ownerLogin ?? "",
    skillSlug: d.skillSlug ?? d.slug ?? "",
    legacySlug: d.legacySlug ?? null,
    name: d.name ?? docId,
    displayName: d.displayName ?? d.name ?? docId,
    description: d.description ?? "",
    packageName: d.packageName ?? d.name ?? "",
    skillId: d.skillId ?? d.skillSlug ?? docId,
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
    visibility: d.visibility ?? "public",
    tutorial: !!d.tutorial,
    starCount: d.starCount ?? 0,
    viewCount: d.viewCount ?? 0,
    readmeMarkdown: d.readmeMarkdown ?? "",
    createdAt: d.createdAt?.toMillis?.() ?? 0,
    updatedAt: d.updatedAt?.toMillis?.() ?? 0,
    lastSyncedAt: d.lastSyncedAt?.toMillis?.() ?? 0,
  };
}

const OFFICIAL_OWNER = "agenticros";
const MIGRATE_ADMINS = new Set(["chrismatthieu", "agenticros"]);

/** One-time migration: flat skill doc ids → owner__skill namespaced docs. */
export async function migrateLegacySkillDocs(): Promise<{
  processed: number;
  migrated: string[];
}> {
  const snap = await db.collection("skills").get();
  const migrated: string[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.marketplaceRef && d.ownerLogin) continue;

    const legacySlug = doc.id;
    const skillSlug = String(d.skillSlug ?? d.slug ?? legacySlug);
    const ownerLogin = String(d.maintainerLogin ?? OFFICIAL_OWNER).toLowerCase();
    const newId = firestoreDocId(ownerLogin, skillSlug);
    const mref = marketplaceRef(ownerLogin, skillSlug);

    const record = {
      ...d,
      legacySlug,
      skillSlug,
      ownerLogin,
      marketplaceRef: mref,
      slug: skillSlug,
      visibility: d.visibility ?? "public",
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (newId === doc.id) {
      await db.collection("skills").doc(doc.id).set(record, { merge: true });
      migrated.push(`updated:${mref}`);
    } else {
      await db.collection("skills").doc(newId).set(record, { merge: true });
      await db.collection("skills").doc(doc.id).delete();
      migrated.push(`${legacySlug}→${mref}`);
    }
  }
  return { processed: snap.size, migrated };
}

export function isMigrateAdmin(login: string): boolean {
  return MIGRATE_ADMINS.has(login.toLowerCase());
}
