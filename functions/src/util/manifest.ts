import { isValidSlug } from "./slug";

/** Schema for the `synapse` block in a skill's package.json. */
export interface SynapseBlock {
  id: string;
  displayName?: string;
  description?: string;
  tutorial?: boolean;
  categories?: string[];
  screenshots?: string[];
  demoVideoUrl?: string;
  capabilities?: Capability[];
}

export interface Capability {
  id: string;
  verb: string;
  description: string;
  inputs?: Record<string, string>;
  outputs?: Record<string, string>;
  interruptible?: boolean;
  blocks_base?: boolean;
  /** ALL-OF hardware features (frozen vocabulary). Unused names warn, never fail submit. */
  requires?: string[];
  /** Features the verb can use but does not require. Docs / listing only. */
  optional?: string[];
}

export interface SkillManifest {
  name: string;
  version: string;
  description?: string;
  main?: string;
  homepage?: string;
  bugs?: string | { url?: string };
  keywords?: string[];
  repository?: string | { url?: string };
  dependencies?: Record<string, string>;
  synapse?: SynapseBlock;
  /** Old contract — surfaced as a warning so submitters know to migrate. */
  synapseSkill?: unknown;
}

export interface ValidatedManifest {
  manifest: SkillManifest;
  block: SynapseBlock;
  warnings: string[];
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestError";
  }
}

/** Frozen hardware feature names from Corebrum Synapse robot profiles. Warn-only. */
const FEATURE_VOCABULARY = new Set([
  "base",
  "arm",
  "gripper",
  "camera",
  "depth",
  "lidar",
  "imu",
  "dock",
  "display",
  "audio",
  "battery",
  "estop",
]);

/**
 * Validate a parsed package.json conforms to the simplified
 * Corebrum Synapse skill contract (the `synapse` block).
 */
export function validateManifest(raw: unknown): ValidatedManifest {
  if (!raw || typeof raw !== "object") {
    throw new ManifestError("package.json is missing or empty");
  }
  const m = raw as SkillManifest;

  if (!m.name || typeof m.name !== "string") {
    throw new ManifestError("package.json must declare a `name`");
  }
  if (!m.version || typeof m.version !== "string") {
    throw new ManifestError("package.json must declare a `version`");
  }
  if (!m.main || typeof m.main !== "string") {
    throw new ManifestError(
      "package.json must declare a `main` entry (e.g. `dist/index.js`).",
    );
  }
  if (!m.synapse || typeof m.synapse !== "object") {
    throw new ManifestError(
      "package.json must declare a `synapse` block. " +
        "See https://skills.corebrum.com/docs for the schema.",
    );
  }
  const block = m.synapse;
  if (!block.id || typeof block.id !== "string" || !isValidSlug(block.id)) {
    throw new ManifestError(
      "`synapse.id` is required and must be a kebab-case slug " +
        "(2-64 chars, [a-z0-9-]).",
    );
  }

  const warnings: string[] = [];
  if (m.synapseSkill !== undefined) {
    warnings.push(
      "The legacy `synapseSkill` field is deprecated. Move metadata into the `synapse` block.",
    );
  }
  const coreDep = m.dependencies?.["@corebrum/core"];
  if (coreDep?.startsWith("file:")) {
    warnings.push(
      "`@corebrum/core` is declared as a `file:` path. This skill will not install for anyone other than the maintainer until it points at a published version (e.g. `^0.5.0`).",
    );
  }
  if (!block.description && !m.description) {
    warnings.push("Add a one-sentence `description` (top-level or in `synapse`).");
  }
  if (!block.capabilities || block.capabilities.length === 0) {
    warnings.push(
      "Declare at least one capability in `synapse.capabilities` so the agent planner can reason about your skill.",
    );
  } else {
    for (const cap of block.capabilities) {
      const names = [...(cap.requires ?? []), ...(cap.optional ?? [])];
      const unknown = names.filter((n) => n && !FEATURE_VOCABULARY.has(n));
      if (unknown.length > 0) {
        warnings.push(
          `Capability "${cap.id}" names unknown hardware feature(s): ${unknown.join(", ")}. ` +
            `Known: ${[...FEATURE_VOCABULARY].join(", ")}. Submit still succeeds.`,
        );
      }
    }
  }
  if (!block.screenshots || block.screenshots.length === 0) {
    warnings.push(
      "Add at least one entry to `synapse.screenshots` (a path inside your repo) so the marketplace card has a preview image.",
    );
  }

  return { manifest: m, block, warnings };
}

/** Pull the repository URL out of the package.json `repository` field. */
export function manifestRepoUrl(m: SkillManifest): string | null {
  if (!m.repository) return null;
  if (typeof m.repository === "string") return m.repository;
  return m.repository.url ?? null;
}
