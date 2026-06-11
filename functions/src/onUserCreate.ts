/**
 * Auth trigger: first sign-in creates the users/{uid} document.
 *
 * Firebase Functions v2 doesn't expose Auth `onCreate` triggers directly
 * (they moved to "blocking" `beforeUserSignedIn` / `beforeUserCreated`
 * triggers via Identity Platform). We use the v1 trigger here for
 * simplicity — fewer prerequisites and identical semantics for our use case.
 */
import * as functions from "firebase-functions/v1";
import { db, FieldValue } from "./admin";

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const ghProvider = user.providerData.find((p) => p.providerId === "github.com");
  const login = ghProvider?.email?.endsWith("@users.noreply.github.com")
    ? extractLoginFromNoReply(ghProvider.email)
    : (ghProvider?.displayName ?? user.displayName ?? user.uid);

  await db.collection("users").doc(user.uid).set(
    {
      githubLogin: login,
      githubId: ghProvider?.uid ?? null,
      displayName: user.displayName ?? login,
      email: user.email ?? null,
      photoURL: user.photoURL ?? ghProvider?.photoURL ?? null,
      isAdmin: false,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
});

function extractLoginFromNoReply(email: string): string {
  const local = email.split("@")[0];
  const plus = local.indexOf("+");
  return plus >= 0 ? local.slice(plus + 1) : local;
}
