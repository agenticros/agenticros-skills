#!/usr/bin/env node
/**
 * One-time migration: flat skill slugs → namespaced owner/skill docs.
 *
 * Usage (from agenticros-skills/functions):
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrate-namespaced-slugs.mjs
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

if (getApps().length === 0) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(credPath, "utf8"))) });
  } else {
    initializeApp();
  }
}

const db = getFirestore();

const OFFICIAL_OWNER = "agenticros";

function docId(owner, skillSlug) {
  return `${owner}__${skillSlug}`;
}

async function main() {
  const snap = await db.collection("skills").get();
  let migrated = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.marketplaceRef && d.ownerLogin) continue;

    const legacySlug = doc.id;
    const skillSlug = d.skillSlug ?? d.slug ?? legacySlug;
    const ownerLogin = (d.maintainerLogin ?? OFFICIAL_OWNER).toLowerCase();
    const newId = docId(ownerLogin, skillSlug);
    const mref = `${ownerLogin}/${skillSlug}`;

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
      console.log(`Updated in place: ${mref}`);
    } else {
      await db.collection("skills").doc(newId).set(record, { merge: true });
      await db.collection("skills").doc(doc.id).delete();
      console.log(`Migrated ${legacySlug} → ${mref} (${newId})`);
    }
    migrated++;
  }
  console.log(`Done. ${migrated} document(s) processed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
