/**
 * Callable Cloud Functions for skill submission and lifecycle:
 *   submitSkill, updateSkill, deleteSkill, refreshSkillMetadata.
 *
 * All run under the caller's auth + use the Admin SDK to bypass Firestore
 * security rules where appropriate (creates go through here because the
 * rules deny direct client writes — server validation is the gate).
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db, FieldValue } from "./admin";
import {
  fetchPackageJson,
  fetchReadme,
  getRepo,
  verifyOwnership,
} from "./github";
import {
  manifestRepoUrl,
  validateManifest,
} from "./util/manifest";
import { parseGithubUrl } from "./util/slug";

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

// ---------------------------------------------------------------------------
// submitSkill
// ---------------------------------------------------------------------------

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

  const parsed = parseGithubUrl(githubUrl);
  if (!parsed) {
    throw new HttpsError(
      "invalid-argument",
      "URL must look like https://github.com/<owner>/<repo>.",
    );
  }
  const { owner, repo } = parsed;

  // 1) Verify the caller has push/admin on the repo.
  let ownership;
  try {
    ownership = await verifyOwnership(owner, repo, githubAccessToken);
  } catch (err) {
    throw new HttpsError(
      "permission-denied",
      (err as Error).message || "Couldn't verify repo ownership.",
    );
  }
  if (!ownership.hasPushAccess) {
    throw new HttpsError(
      "permission-denied",
      `You must be a collaborator (push or admin) on ${owner}/${repo} to submit it. ` +
        "Fork the repo or ask the owner to add you.",
    );
  }

  // 2) Fetch the repo + default branch.
  const ghRepo = await getRepo(owner, repo, githubAccessToken);
  const ref = ghRepo.default_branch;

  // 3) Fetch and validate package.json.
  const pkg = await fetchPackageJson(owner, repo, ref, githubAccessToken);
  const { manifest, block, warnings } = validateManifest(pkg);

  // 4) Fetch README.
  const readme = await fetchReadme(owner, repo, ref, githubAccessToken);

  // 5) Build the Firestore record. Slug is the agenticros.id (already validated).
  const slug = block.id;
  const ref0 = await db.collection("skills").doc(slug).get();
  if (ref0.exists) {
    const existing = ref0.data() as { maintainerUid?: string };
    if (existing.maintainerUid && existing.maintainerUid !== auth.uid) {
      throw new HttpsError(
        "already-exists",
        `A skill with id "${slug}" is already registered by another maintainer.`,
      );
    }
  }

  const me = maintainerInfo(auth);
  const now = FieldValue.serverTimestamp();
  const githubUrlNormalized = `https://github.com/${owner}/${repo}`;
  const declaredRepoUrl = manifestRepoUrl(manifest);

  const record = {
    slug,
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
    tools: [],
    maintainerUid: me.uid,
    maintainerLogin: ownership.viewerLogin || me.login,
    maintainerAvatarUrl: me.avatarUrl,
    repoOwnerVerified: true,
    starCount: ref0.exists ? (ref0.data() as { starCount?: number }).starCount ?? 0 : 0,
    viewCount: ref0.exists ? (ref0.data() as { viewCount?: number }).viewCount ?? 0 : 0,
    readmeMarkdown: readme,
    declaredRepoUrl,
    warnings,
    createdAt: ref0.exists ? ref0.data()?.createdAt ?? now : now,
    updatedAt: now,
    lastSyncedAt: now,
    defaultBranch: ref,
  };

  await db.collection("skills").doc(slug).set(record, { merge: true });
  logger.info("submitSkill ok", { slug, owner, repo, uid: auth.uid });

  return { slug, warnings };
});

// ---------------------------------------------------------------------------
// updateSkill — limited self-service patch for marketplace-only fields.
// (Everything code-derived comes from refreshSkillMetadata.)
// ---------------------------------------------------------------------------

export const updateSkill = onCall<{
  slug: string;
  description?: string;
  categories?: string[];
  screenshots?: string[];
  demoVideoUrl?: string;
}>(async (request) => {
  const auth = requireAuth(request.auth);
  const { slug, ...patch } = request.data ?? {};
  if (!slug) throw new HttpsError("invalid-argument", "Missing slug.");
  const doc = await db.collection("skills").doc(slug).get();
  if (!doc.exists) throw new HttpsError("not-found", "Skill not found.");
  const data = doc.data() as { maintainerUid?: string };
  if (data.maintainerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "Only the maintainer may edit this skill.");
  }
  const allowed: Record<string, unknown> = {};
  if (typeof patch.description === "string") allowed.description = patch.description;
  if (Array.isArray(patch.categories)) allowed.categories = patch.categories;
  if (Array.isArray(patch.screenshots)) allowed.screenshots = patch.screenshots;
  if (typeof patch.demoVideoUrl === "string") allowed.demoVideoUrl = patch.demoVideoUrl;
  allowed.updatedAt = FieldValue.serverTimestamp();
  await db.collection("skills").doc(slug).set(allowed, { merge: true });
  return { ok: true };
});

// ---------------------------------------------------------------------------
// deleteSkill
// ---------------------------------------------------------------------------

export const deleteSkill = onCall<{ slug: string }>(async (request) => {
  const auth = requireAuth(request.auth);
  const { slug } = request.data ?? {};
  if (!slug) throw new HttpsError("invalid-argument", "Missing slug.");
  const doc = await db.collection("skills").doc(slug).get();
  if (!doc.exists) throw new HttpsError("not-found", "Skill not found.");
  const data = doc.data() as { maintainerUid?: string };
  if (data.maintainerUid !== auth.uid) {
    throw new HttpsError("permission-denied", "Only the maintainer may delete this skill.");
  }
  await db.collection("skills").doc(slug).delete();
  return { ok: true };
});

// ---------------------------------------------------------------------------
// refreshSkillMetadata — re-pull package.json + README from GitHub.
// ---------------------------------------------------------------------------

export const refreshSkillMetadata = onCall<{
  slug: string;
  githubAccessToken?: string;
}>(async (request) => {
  const auth = requireAuth(request.auth);
  const { slug, githubAccessToken } = request.data ?? {};
  if (!slug) throw new HttpsError("invalid-argument", "Missing slug.");
  const ref = await db.collection("skills").doc(slug).get();
  if (!ref.exists) throw new HttpsError("not-found", "Skill not found.");
  const existing = ref.data() as {
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

  await db.collection("skills").doc(slug).set(
    {
      packageName: manifest.name,
      skillId: block.id,
      displayName: block.displayName ?? manifest.name,
      description: block.description ?? manifest.description ?? "",
      version: manifest.version,
      categories: block.categories ?? [],
      screenshots: block.screenshots ?? [],
      demoVideoUrl: block.demoVideoUrl ?? null,
      capabilities: block.capabilities ?? [],
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
