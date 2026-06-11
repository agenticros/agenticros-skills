/**
 * Phase 2: star / favorite system.
 *
 * Both writes go through Cloud Functions so the `starCount` counter on
 * skills/{slug} stays consistent (atomic transaction). Direct client
 * writes to stars/ are denied by the Firestore rules.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, FieldValue } from "./admin";

function starDocId(uid: string, slug: string): string {
  return `${uid}_${slug}`;
}

export const starSkill = onCall<{ slug: string }>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in to star skills.");
  }
  const { slug } = request.data ?? {};
  if (!slug) throw new HttpsError("invalid-argument", "Missing slug.");
  const uid = request.auth.uid;

  const starId = starDocId(uid, slug);
  const starRef = db.collection("stars").doc(starId);
  const skillRef = db.collection("skills").doc(slug);

  await db.runTransaction(async (tx) => {
    const skillSnap = await tx.get(skillRef);
    if (!skillSnap.exists) {
      throw new HttpsError("not-found", "Skill not found.");
    }
    const starSnap = await tx.get(starRef);
    if (starSnap.exists) return; // already starred — idempotent
    tx.set(starRef, {
      uid,
      slug,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(skillRef, { starCount: FieldValue.increment(1) });
  });

  return { starred: true };
});

export const unstarSkill = onCall<{ slug: string }>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in to unstar skills.");
  }
  const { slug } = request.data ?? {};
  if (!slug) throw new HttpsError("invalid-argument", "Missing slug.");
  const uid = request.auth.uid;

  const starId = starDocId(uid, slug);
  const starRef = db.collection("stars").doc(starId);
  const skillRef = db.collection("skills").doc(slug);

  await db.runTransaction(async (tx) => {
    const starSnap = await tx.get(starRef);
    if (!starSnap.exists) return; // already unstarred — idempotent
    tx.delete(starRef);
    tx.update(skillRef, { starCount: FieldValue.increment(-1) });
  });

  return { starred: false };
});
