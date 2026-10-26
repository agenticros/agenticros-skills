/**
 * Capability ids copied onto a skill document so GET /skills?capability=
 * can match a verb that is not on the first page of popular listings.
 */

export function capabilityIdsFrom(capabilities: unknown): string[] {
  if (!Array.isArray(capabilities)) return [];
  const ids: string[] = [];
  for (const raw of capabilities) {
    if (!raw || typeof raw !== "object") continue;
    const id = (raw as { id?: unknown }).id;
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (trimmed && !ids.includes(trimmed)) ids.push(trimmed);
  }
  return ids;
}

export function skillCapabilityIds(data: {
  capabilityIds?: unknown;
  capabilities?: unknown;
}): string[] {
  if (Array.isArray(data.capabilityIds)) {
    const ids = data.capabilityIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
    if (ids.length > 0) return ids;
  }
  return capabilityIdsFrom(data.capabilities);
}

/** In-memory match used when the indexed field is missing on older listings. */
export function skillMatchesCapability(
  data: { capabilityIds?: unknown; capabilities?: unknown; visibility?: unknown },
  capability: string,
  includeUnlisted: boolean,
): boolean {
  if (!capability) return false;
  if (!includeUnlisted && data.visibility && data.visibility !== "public") return false;
  return skillCapabilityIds(data).includes(capability);
}
