/**
 * Callable Cloud Functions for skill submission and lifecycle.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db, FieldValue } from "./admin";
import {
  fetchPackageJson,
  fetchReadme,
  getRepo,
} from "./github";
import { parseGithubUrl } from "./util/slug";
import { validateManifest } from "./util/manifest";
import {
  resolveSkillDoc,
  submitSkillFromGithub,
} from "./util/submit";

interface AuthedUser {
  uid: string;
  token?: { name?: string; picture?: string; firebase?: { identities?: Record<string, string[]> } };
}

function requireAuth(auth: { uid?: string; token?: AuthedUser["token"] } | undefined): AuthedUser {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in with GitHub to do this.");
  }
  return { uid: auth.uid, token: auth.token };
}

function maintainerInfo(auth: AuthedUser): {
  uid: string;
  login: string;
  avatarUrl: string;
} {
  const identities = auth.token?.firebase?.identities ?? {};
  const ghIdentity = identities["github.com"]?.[0];
  const login = (auth.token?.name ?? ghIdentity ?? "").toString();
  const avatarUrl = (auth.token?.picture ?? "").toString();
  return { uid: auth.uid, login, avatarUrl };
}

export const submitSkill = onCall<{
  githubUrl: string;
  githubAccessToken: string;
}>(async (request) => {
  const auth = requireAuth(request.auth);
  const { githubUrl, githubAccessToken } = request.data ?? {};
  if (!githubUrl || typeof githubUrl !== "string") {
    throw new HttpsError("invalid-argument", "Please provide a GitHub repo URL.");
  }
  if (!githubAccessToken || typeof githubAccessToken !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Missing GitHub access token. Sign in again and retry.",
    );
  }

  const me = maintainerInfo(auth);
  try {
    const result = await submitSkillFromGithub({
      githubUrl,
      githubAccessToken,
      maintainerUid: auth.uid,
      maintainerLogin: me.login,
      maintainerAvatarUrl: me.avatarUrl,
    });
    logger.info("submitSkill ok", { ref: result.marketplaceRef, uid: auth.uid });
    return {
      slug: result.skillSlug,
      marketplaceRef: result.marketplaceRef,
      visibility: result.visibility,
      warnings: result.warnings,
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Rate limit")) {
      throw new HttpsError("resource-exhausted", msg);
    }
    if (msg.includes("already registered")) {
      throw new HttpsError("already-exists", msg);
    }
    throw new HttpsError("invalid-argument", msg);
  }
});

export const updateSkill = onCall<{
  slug: string;
  marketplaceRef?: string;
  description?: string;
  categories?: string[];
  screenshots?: string[];
  demoVideoUrl?: string;
}>(async (request) => {
  const auth = requireAuth(request.auth);
  const { slug, marketplaceRef, ...patch } = request.data ?? {};
  const ref = marketplaceRef ?? slug;
  if (!ref) throw new HttpsError("invalid-argument", "Missing slug or marketplaceRef.");
  const resolved = await resolveSkillDoc(ref);
  if (!resolved) throw new HttpsError("not-found", "Skill not found.");
  const data = resolved.data as { maintainerUid?: string };
  if (data.maintainerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "Only the maintainer may edit this skill.");
  }
  const allowed: Record<string, unknown> = {};
  if (typeof patch.description === "string") allowed.description = patch.description;
  if (Array.isArray(patch.categories)) allowed.categories = patch.categories;
  if (Array.isArray(patch.screenshots)) allowed.screenshots = patch.screenshots;
  if (typeof patch.demoVideoUrl === "string") allowed.demoVideoUrl = patch.demoVideoUrl;
  allowed.updatedAt = FieldValue.serverTimestamp();
  await db.collection("skills").doc(resolved.docId).set(allowed, { merge: true });
  return { ok: true };
});

export const deleteSkill = onCall<{ slug: string; marketplaceRef?: string }>(
  async (request) => {
    const auth = requireAuth(request.auth);
    const { slug, marketplaceRef } = request.data ?? {};
    const ref = marketplaceRef ?? slug;
    if (!ref) throw new HttpsError("invalid-argument", "Missing slug.");
    const resolved = await resolveSkillDoc(ref);
    if (!resolved) throw new HttpsError("not-found", "Skill not found.");
    const data = resolved.data as { maintainerUid?: string };
    if (data.maintainerUid !== auth.uid) {
      throw new HttpsError("permission-denied", "Only the maintainer may delete this skill.");
    }
    await db.collection("skills").doc(resolved.docId).delete();
    return { ok: true };
  },
);

export const refreshSkillMetadata = onCall<{
  slug: string;
  marketplaceRef?: string;
  githubAccessToken?: string;
}>(async (request) => {
  const auth = requireAuth(request.auth);
  const { slug, marketplaceRef, githubAccessToken } = request.data ?? {};
  const ref = marketplaceRef ?? slug;
  if (!ref) throw new HttpsError("invalid-argument", "Missing slug.");
  const resolved = await resolveSkillDoc(ref);
  if (!resolved) throw new HttpsError("not-found", "Skill not found.");
  const existing = resolved.data as {
    maintainerUid?: string;
    githubUrl?: string;
    defaultBranch?: string;
  };
  if (existing.maintainerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "Only the maintainer may refresh this skill.");
  }
  if (!existing.githubUrl) throw new HttpsError("failed-precondition", "No githubUrl on record.");
  const parsed = parseGithubUrl(existing.githubUrl);
  if (!parsed) throw new HttpsError("failed-precondition", "Bad githubUrl on record.");

  const ghRepo = await getRepo(parsed.owner, parsed.repo, githubAccessToken);
  const branch = existing.defaultBranch ?? ghRepo.default_branch;
  const pkg = await fetchPackageJson(parsed.owner, parsed.repo, branch, githubAccessToken);
  const { manifest, block, warnings } = validateManifest(pkg);
  const readme = await fetchReadme(parsed.owner, parsed.repo, branch, githubAccessToken);

  await db.collection("skills").doc(resolved.docId).set(
    {
      packageName: manifest.name,
      skillId: block.id,
      skillSlug: block.id,
      displayName: block.displayName ?? manifest.name,
      description: block.description ?? manifest.description ?? "",
      version: manifest.version,
      categories: block.categories ?? [],
      screenshots: block.screenshots ?? [],
      demoVideoUrl: block.demoVideoUrl ?? null,
      capabilities: block.capabilities ?? [],
      tutorial: block.tutorial === true,
      keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
      homepage: manifest.homepage ?? null,
      readmeMarkdown: readme,
      warnings,
      defaultBranch: branch,
      lastSyncedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true };
});
