/**
 * Typed wrappers around the Skills API.
 *
 * - Callable Cloud Functions are invoked via the Firebase Functions SDK
 *   (`httpsCallable`). They require auth and run server-side with the
 *   Admin SDK.
 * - The public REST `api` function (read-only list/search/install) is
 *   reachable both directly (Cloud Functions URL) and at
 *   `https://skills.agenticros.com/api/**` via Firebase Hosting rewrite.
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export interface Capability {
  id: string;
  verb: string;
  description: string;
  inputs?: Record<string, string>;
  outputs?: Record<string, string>;
  interruptible?: boolean;
  blocks_base?: boolean;
}

export interface SkillRecord {
  slug: string;
  marketplaceRef?: string;
  ownerLogin?: string;
  skillSlug?: string;
  legacySlug?: string;
  visibility?: string;
  packageName: string;
  skillId: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  githubUrl: string;
  homepage?: string;
  bugs?: string;
  keywords: string[];
  categories: string[];
  screenshots: string[];
  demoVideoUrl?: string;
  capabilities: Capability[];
  tools: string[];
  maintainerUid: string;
  maintainerLogin: string;
  maintainerAvatarUrl: string;
  repoOwnerVerified: boolean;
  starCount: number;
  viewCount: number;
  readmeMarkdown: string;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
}

export interface InstallDescriptor {
  slug: string;
  marketplaceRef?: string;
  skillId: string;
  packageName: string;
  githubUrl: string;
  ref: string;
  buildCmd: string;
}

// --- Callable functions (auth required) -----------------------------------

export const submitSkillCallable = httpsCallable<
  { githubUrl: string; githubAccessToken: string },
  { slug: string; marketplaceRef?: string; visibility?: string; warnings?: string[] }
>(functions, "submitSkill");

export const updateSkillCallable = httpsCallable<
  {
    slug: string;
    marketplaceRef?: string;
    description?: string;
    categories?: string[];
    screenshots?: string[];
    demoVideoUrl?: string;
  },
  { ok: boolean }
>(functions, "updateSkill");

export const deleteSkillCallable = httpsCallable<
  { slug: string; marketplaceRef?: string },
  { ok: boolean }
>(functions, "deleteSkill");

export const refreshSkillMetadataCallable = httpsCallable<
  { slug: string; marketplaceRef?: string; githubAccessToken?: string },
  { ok: boolean }
>(functions, "refreshSkillMetadata");

export const starSkillCallable = httpsCallable<{ slug: string }, { starred: boolean }>(
  functions,
  "starSkill",
);

export const unstarSkillCallable = httpsCallable<{ slug: string }, { starred: boolean }>(
  functions,
  "unstarSkill",
);

// --- Public REST endpoints -------------------------------------------------

const API_BASE =
  import.meta.env.VITE_SKILLS_API_BASE ?? "/api";

export async function listSkills(params: {
  q?: string;
  category?: string;
  owner?: string;
  sort?: "recent" | "popular";
  limit?: number;
} = {}): Promise<SkillRecord[]> {
  const u = new URL(`${apiOrigin()}/skills`, window.location.origin);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.category) u.searchParams.set("category", params.category);
  if (params.owner) u.searchParams.set("owner", params.owner);
  if (params.sort) u.searchParams.set("sort", params.sort);
  if (params.limit) u.searchParams.set("limit", String(params.limit));
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`Failed to list skills: ${r.status}`);
  const body = await r.json();
  return body.skills as SkillRecord[];
}

export function skillRef(skill: SkillRecord): string {
  return skill.marketplaceRef ?? skill.slug;
}

export function skillPath(ref: string): string {
  if (ref.includes("/")) return `/${ref}`;
  return `/s/${ref}`;
}

export async function getSkill(ref: string): Promise<SkillRecord> {
  const path = ref.includes("/")
    ? `/skills/${ref.split("/").map(encodeURIComponent).join("/")}`
    : `/skills/${encodeURIComponent(ref)}`;
  const r = await fetch(`${apiOrigin()}${path}`);
  if (r.status === 404) throw new Error("Skill not found");
  if (!r.ok) throw new Error(`Failed to fetch skill: ${r.status}`);
  const body = (await r.json()) as SkillRecord & { redirect?: string };
  if (body.redirect && !body.marketplaceRef) {
    return getSkill(body.redirect);
  }
  return body;
}

export async function getInstallDescriptor(ref: string): Promise<InstallDescriptor> {
  const path = ref.includes("/")
    ? `/skills/${ref.split("/").map(encodeURIComponent).join("/")}/install`
    : `/skills/${encodeURIComponent(ref)}/install`;
  const r = await fetch(`${apiOrigin()}${path}`);
  if (!r.ok) throw new Error(`Failed to fetch install descriptor: ${r.status}`);
  return (await r.json()) as InstallDescriptor;
}

function apiOrigin(): string {
  // Allow override (e.g. when running emulators) via VITE_SKILLS_API_BASE.
  if (API_BASE.startsWith("http")) return API_BASE.replace(/\/+$/, "");
  return API_BASE.replace(/\/+$/, "");
}
