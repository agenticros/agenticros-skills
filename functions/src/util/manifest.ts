import { isValidSlug } from "./slug";

/** Schema for the `agenticros` block in a skill's package.json. */
export interface AgenticROSBlock {
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
  agenticros?: AgenticROSBlock;
  /** Old contract — surfaced as a warning so submitters know to migrate. */
  agenticrosSkill?: unknown;
}

export interface ValidatedManifest {
  manifest: SkillManifest;
  block: AgenticROSBlock;
  warnings: string[];
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestError";
  }
}

/**
 * Validate a parsed package.json conforms to the simplified
 * AgenticROS skill contract (the `agenticros` block).
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
  if (!m.agenticros || typeof m.agenticros !== "object") {
    throw new ManifestError(
      "package.json must declare an `agenticros` block. " +
        "See https://skills.agenticros.com/docs for the schema.",
    );
  }
  const block = m.agenticros;
  if (!block.id || typeof block.id !== "string" || !isValidSlug(block.id)) {
    throw new ManifestError(
      "`agenticros.id` is required and must be a kebab-case slug " +
        "(2-64 chars, [a-z0-9-]).",
    );
  }

  const warnings: string[] = [];
  if (m.agenticrosSkill !== undefined) {
    warnings.push(
      "The legacy `agenticrosSkill` field is deprecated. Move metadata into the `agenticros` block.",
    );
  }
  const coreDep = m.dependencies?.["@agenticros/core"];
  if (coreDep?.startsWith("file:")) {
    warnings.push(
      "`@agenticros/core` is declared as a `file:` path. This skill will not install for anyone other than the maintainer until it points at a published version (e.g. `^0.5.0`).",
    );
  }
  if (!block.description && !m.description) {
    warnings.push("Add a one-sentence `description` (top-level or in `agenticros`).");
  }
  if (!block.capabilities || block.capabilities.length === 0) {
    warnings.push(
      "Declare at least one capability in `agenticros.capabilities` so the agent planner can reason about your skill.",
    );
  }
  if (!block.screenshots || block.screenshots.length === 0) {
    warnings.push(
      "Add at least one entry to `agenticros.screenshots` (a path inside your repo) so the marketplace card has a preview image.",
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
