/**
 * Phase 2: star / favorite system.
 *
 * Both writes go through Cloud Functions so the `starCount` counter on
 * skills/{docId} stays consistent (atomic transaction). Direct client
 * writes to stars/ are denied by the Firestore rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "./admin";
import { resolveSkillDoc } from "./util/submit";

function starDocId(uid: string, skillDocId: string): string {
  return `${uid}_${skillDocId}`;
}

export const starSkill = onCall<{ slug: string; marketplaceRef?: string }>(
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in to star skills.");
    }
    const { slug, marketplaceRef } = request.data ?? {};
    const ref = marketplaceRef ?? slug;
    if (!ref) throw new HttpsError("invalid-argument", "Missing slug or marketplaceRef.");
    const uid = request.auth.uid;

    const resolved = await resolveSkillDoc(ref);
    if (!resolved) throw new HttpsError("not-found", "Skill not found.");

    const starId = starDocId(uid, resolved.docId);
    const starRef = db.collection("stars").doc(starId);
    const skillRef = db.collection("skills").doc(resolved.docId);
    const mref =
      (resolved.data.marketplaceRef as string | undefined) ??
      ref;

    await db.runTransaction(async (tx) => {
      const skillSnap = await tx.get(skillRef);
      if (!skillSnap.exists) {
        throw new HttpsError("not-found", "Skill not found.");
      }
      const starSnap = await tx.get(starRef);
      if (starSnap.exists) return; // already starred — idempotent
      tx.set(starRef, {
        uid,
        slug: resolved.data.slug ?? resolved.data.skillSlug ?? resolved.docId,
        marketplaceRef: mref,
        skillDocId: resolved.docId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(skillRef, { starCount: FieldValue.increment(1) });
    });

    return { starred: true };
  },
);

export const unstarSkill = onCall<{ slug: string; marketplaceRef?: string }>(
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in to unstar skills.");
    }
    const { slug, marketplaceRef } = request.data ?? {};
    const ref = marketplaceRef ?? slug;
    if (!ref) throw new HttpsError("invalid-argument", "Missing slug or marketplaceRef.");
    const uid = request.auth.uid;

    const resolved = await resolveSkillDoc(ref);
    if (!resolved) throw new HttpsError("not-found", "Skill not found.");

    const starId = starDocId(uid, resolved.docId);
    const starRef = db.collection("stars").doc(starId);
    const skillRef = db.collection("skills").doc(resolved.docId);

    await db.runTransaction(async (tx) => {
      const starSnap = await tx.get(starRef);
      if (!starSnap.exists) return; // already unstarred — idempotent
      tx.delete(starRef);
      tx.update(skillRef, { starCount: FieldValue.increment(-1) });
    });

    return { starred: false };
  },
);
