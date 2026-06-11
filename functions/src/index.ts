/**
 * Cloud Functions entry point for the AgenticROS Skills marketplace.
 *
 * Exports:
 *   - api                 — public REST endpoints (browse / search / install)
 *   - submitSkill         — callable: ingest a skill from GitHub
 *   - updateSkill         — callable: maintainer self-service patch
 *   - deleteSkill         — callable: maintainer delete
 *   - refreshSkillMetadata— callable: re-pull package.json + README
 *   - starSkill / unstarSkill — Phase 2 favorites
 *   - onUserCreate        — Auth trigger: provision users/{uid}
 */
export { api } from "./api";
export {
  submitSkill,
  updateSkill,
  deleteSkill,
  refreshSkillMetadata,
} from "./skills";
export { starSkill, unstarSkill } from "./stars";
export { onUserCreate } from "./onUserCreate";
