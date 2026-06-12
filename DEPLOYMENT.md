# Deploying the AgenticROS Skills Marketplace

This is a one-time setup guide for the owner of the `agenticros` Firebase project. The marketplace is split into three pieces and one external dependency:

- **Hosting** — Vite-built React SPA served from Firebase Hosting site `agenticros-skills`
- **Functions** — Node 22 Cloud Functions (`api`, `submitSkill`, `updateSkill`, `deleteSkill`, `refreshSkillMetadata`, `starSkill`, `unstarSkill`, `onUserCreate`)
- **Firestore** — production-mode database (collections: `skills`, `users`, `stars`)
- **GitHub OAuth App** — external; provides the `client_id` + `client_secret` Firebase Auth uses to authenticate users

## 1. Firebase project setup (one-time, owner-only)

These must be done in the [Firebase Console](https://console.firebase.google.com/project/agenticros/overview) under the `agenticros` project — they can't be done via the CLI.

1. **Upgrade to the Blaze plan.** Cloud Functions require it. Settings → Usage and billing → Modify plan → Blaze (pay-as-you-go). Set a budget alert (e.g. $20/mo) for safety.
2. **Create the Firestore database.** Build → Firestore Database → Create database → **Production mode** → location `nam5 (United States)`.
3. **Enable the GitHub auth provider** (do this *after* you've created the GitHub OAuth App in step 2 — see below). Build → Authentication → Sign-in method → GitHub → enable → paste the OAuth Client ID + Client Secret.
4. **Add the Hosting site for the marketplace.** Build → Hosting → Add another site → site ID `agenticros-skills`. This pairs with the `"site": "agenticros-skills"` field in [`firebase.json`](./firebase.json) and lets you keep `agenticros-website` on a separate Hosting site under the same project.
5. **Connect the custom domain** `skills.agenticros.com` to the `agenticros-skills` Hosting site. Firebase prints the required DNS records (typically two A records pointing to Firebase IPs); add them at your DNS provider and wait for the cert to issue (usually 10–60 min).

## 2. GitHub OAuth App

1. Visit https://github.com/settings/developers → New OAuth App (or, if you publish under the `agenticros` org, do this from https://github.com/organizations/agenticros/settings/applications instead).
2. Fill in:
   - **Application name**: `AgenticROS Skills`
   - **Homepage URL**: `https://skills.agenticros.com`
   - **Application description**: `Marketplace for AgenticROS robot skills.`
   - **Authorization callback URL**: `https://agenticros.firebaseapp.com/__/auth/handler` (the Firebase-supplied handler under your project's auth domain — do **not** point this at `skills.agenticros.com`).
3. Click **Register application**. On the next page generate a new **client secret** and copy both `Client ID` and `Client secret` somewhere safe.
4. Paste them into Firebase Console → Authentication → Sign-in method → GitHub.

> The marketplace SPA requests the `read:user` and `public_repo` OAuth scopes (configured in [`src/lib/firebase.ts`](./src/lib/firebase.ts)). The `public_repo` scope is what lets the `submitSkill` Function call `GET /repos/:owner/:repo` with the user's access token and verify they have push permission before accepting the submission.

## 3. First deploy

```bash
# From repo root.
npm install
cd functions && npm install && cd -

# Build + deploy everything.
firebase login
firebase use agenticros        # confirms .firebaserc is correct
npm run build                  # SPA -> dist/
firebase deploy
```

You should see four URLs printed:

- Hosting site: `https://agenticros-skills.web.app` (and after DNS propagates, `https://skills.agenticros.com`)
- Functions: `https://us-central1-agenticros.cloudfunctions.net/api/health` etc.
- Firestore rules + indexes deployed
- Auth trigger `onUserCreate` deployed

Hit `https://skills.agenticros.com/api/health` to confirm the rewrite + function are wired correctly. It should return `{"ok": true}`.

## 4. Local development

```bash
# Run SPA + emulators side-by-side.
firebase emulators:start      # auth/9099, functions/5001, firestore/8080, hosting/5000
# In another terminal:
VITE_USE_EMULATORS=true npm run dev    # SPA on http://localhost:5174
```

The SPA's [`src/lib/firebase.ts`](./src/lib/firebase.ts) automatically connects to the local Firestore + Functions emulators when `VITE_USE_EMULATORS=true`. (Auth still uses the real GitHub OAuth flow against the live Firebase project — running Auth in the emulator with real GitHub OAuth is messy, and it's anyway a no-op for the read-only flows that matter most in local dev.)

## 5. Continuous deployment

The repo ships a GitHub Actions workflow at [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) that runs on every push to `main` (and via "Run workflow" in the Actions tab). Setup is a one-time process with three pieces — a GitHub secret, GCP IAM grants, and one GCP API enable.

### 5.1 Create the GitHub repo secret

1. In Firebase Console → ⚙️ Project Settings → **Service accounts** tab → click **Generate new private key**, confirm. A JSON file downloads (filename like `agenticros-firebase-adminsdk-XXXXX-XXXXXX.json`).
2. In GitHub: repo Settings → Secrets and variables → Actions → **New repository secret**. Name it exactly `FIREBASE_SERVICE_ACCOUNT_AGENTICROS`, paste the entire JSON contents (from `{` to `}`) into the Value field, save.
3. **Securely delete the downloaded JSON file** once it's saved as a secret. Anyone with that file can deploy to your project and read/write Firestore. If it leaks, rotate it under Firebase Console → Service accounts → Manage service-account permissions → delete the key.

### 5.2 Grant the service account IAM permissions

The downloaded key represents the project's default Firebase Admin SDK service account (`firebase-adminsdk-<id>@<project>.iam.gserviceaccount.com`). It has Firebase-SDK-level permissions out of the box but **not** the Cloud-level permissions needed to deploy Functions, push Firestore rules, etc. You need to grant two things:

1. **Project-level role `Editor` (`roles/editor`)** — covers Hosting deploy, Functions v2 deploy, Cloud Build, Cloud Run, Artifact Registry, Firestore rules, Firestore indexes, and Service Usage in one grant. This is what Firebase's own `firebase init hosting:github` flow grants its CI service accounts by default.
   - In **Cloud Console → IAM** ([direct link](https://console.cloud.google.com/iam-admin/iam?project=agenticros)), find the `firebase-adminsdk-<id>@agenticros.iam.gserviceaccount.com` row → pencil icon → **Add another role** → search for `Editor` → save. Be careful to pick **Basic → Editor** (`roles/editor`), not "Service Account Editor" or similar.
2. **`Service Account User` (`roles/iam.serviceAccountUser`) on the App Engine default service account** (`agenticros@appspot.gserviceaccount.com`) — Functions v2 runs under the App Engine SA's identity, so the deploy SA needs `iam.serviceAccounts.actAs` on it.
   - In **Cloud Console → IAM & Admin → Service Accounts** ([direct link](https://console.cloud.google.com/iam-admin/serviceaccounts?project=agenticros)), click into **`agenticros@appspot.gserviceaccount.com`** → **Permissions** tab → **Grant access** → New principal: `firebase-adminsdk-<id>@agenticros.iam.gserviceaccount.com`, Role: **Service Account User** (be very careful here: "Service Account User" and "Service Account Admin" appear next to each other in the picker and are completely different — Admin does *not* grant `actAs`). Save.

If you'd rather lock down permissions instead of granting `Editor`, the minimum-privilege equivalent is: `roles/firebasehosting.admin` + `roles/cloudfunctions.admin` + `roles/run.admin` + `roles/artifactregistry.admin` + `roles/cloudbuild.builds.editor` + `roles/firebaserules.admin` + `roles/datastore.indexAdmin` + `roles/serviceusage.serviceUsageConsumer`, plus the same `roles/iam.serviceAccountUser` on the App Engine SA.

### 5.3 Enable the Cloud Billing API

Firebase verifies the project is on Blaze before deploying Functions, and that check goes through `cloudbilling.googleapis.com`. Enable it once:

- In **Cloud Console → APIs & Services → Library** ([direct link](https://console.cloud.google.com/apis/library/cloudbilling.googleapis.com?project=agenticros)) → **Enable**. Takes a few seconds; no further config needed.

> Note: a local `firebase deploy` from your dev machine works without this API because user-account credentials bypass the billing pre-check. The service-account-based CI deploy doesn't, which is why this is easy to miss.

### 5.4 What the workflow does on each push

1. Installs SPA + Functions deps (`npm ci`).
2. Type-checks both.
3. Builds the SPA (`vite build`) and Functions (`tsc`).
4. Runs `firebase deploy --only hosting,functions,firestore:rules,firestore:indexes` against the `agenticros` project using the service-account key from the GitHub secret.

A successful run takes ~2–3 minutes. Watch live progress at the [Actions tab](https://github.com/agenticros/agenticros-skills/actions/workflows/deploy.yml).

## 6. Seeding the marketplace

After the first deploy the marketplace is empty. To launch non-empty, submit the two reference skills as the maintainer:

1. **Publish `@agenticros/core` to npm** (one-time): `cd packages/core && npm publish` in the `agenticros` repo. The seed skills depend on `@agenticros/core@^0.5.0`, so users can't install them until this is on the registry.
2. **Sign in at `https://skills.agenticros.com/login`** with the GitHub account that owns `agenticros/agenticros-skill-followme` and `agenticros/agenticros-skill-find` (e.g. PlaiPin, or any org admin).
3. **Open `/submit`** and paste:
   - `https://github.com/agenticros/agenticros-skill-followme`
   - `https://github.com/agenticros/agenticros-skill-find`
   For each one, the `submitSkill` Function verifies you have push access on the repo, pulls the `package.json` + README, and publishes the listing.
4. **Sanity check the install flow** locally:
   ```bash
   AGENTICROS_SKILLS_API=https://skills.agenticros.com/api npx agenticros skills search follow
   AGENTICROS_SKILLS_API=https://skills.agenticros.com/api npx agenticros skills install followme
   ```
   (The env var is only needed if you want to point at a non-default marketplace. Production users don't set it.)

## 8. Maintenance

- **Rotate the GitHub OAuth secret periodically** — Firebase Auth lets you swap it in place without re-prompting users.
- **Monitor Functions usage** in Firebase Console → Functions → Usage tab. The `submitSkill` function makes 4-5 GitHub API calls per submission against the user's OAuth token, so quota pressure is on the user's GitHub token (5,000 req/hr), not the marketplace's.
- **Schema migrations**: skills are written exclusively through `submitSkill` / `updateSkill` / `refreshSkillMetadata`, so a field rename means updating those functions + running `refreshSkillMetadata` for each skill (a small admin script is enough — there's currently fewer than a hundred docs).

## Troubleshooting

- **"GET /api/health returns 404"** — the Hosting rewrite isn't finding the function. Check the function name matches `functionId: "api"` in `firebase.json` and that the function deployed cleanly (`firebase functions:log --only api`).
- **"Sign in with GitHub fails with auth/operation-not-supported-in-this-environment"** — the GitHub auth provider isn't enabled in Firebase Console (step 1.3).
- **"submitSkill returns 'You must be a collaborator'"** — the signed-in GitHub account isn't a push/admin collab on the repo being submitted. Expected behavior.
- **"Marketplace shows zero skills after a fresh deploy"** — that's normal. Sign in, open `/submit`, and submit the seed skills (followme + find).
- **CI fails with "Either FIREBASE_TOKEN or GCP_SA_KEY or GOOGLE_APPLICATION_CREDENTIALS is required"** — the `FIREBASE_SERVICE_ACCOUNT_AGENTICROS` repo secret isn't set, or its value is empty. See §5.1.
- **CI fails with "Missing permissions required for functions deploy. You must have permission `iam.serviceAccounts.ActAs` on service account `…@appspot.gserviceaccount.com`"** — the deploy SA hasn't been granted `Service Account User` (`roles/iam.serviceAccountUser`) on the App Engine default service account. See §5.2 step 2. Important: "Service Account **User**" and "Service Account **Admin**" look almost identical in the role picker but Admin does *not* grant `actAs` — only User does.
- **CI fails with "Request to `firebaserules.googleapis.com/.../test` had HTTP Error: 403, The caller does not have permission"** — the deploy SA doesn't have project-level `Editor` (or the equivalent minimum-privilege role set). See §5.2 step 1.
- **CI fails with "Cloud Billing API has not been used in project … before or it is disabled"** — `cloudbilling.googleapis.com` isn't enabled on the project. See §5.3. A local `firebase deploy` won't reproduce this because user credentials skip the billing precheck; only the SA-based CI deploy hits it.
- **CI deploy ends with `Error: Functions successfully deployed but could not set up cleanup policy in location us-central1`** — non-fatal; just means no Artifact Registry cleanup policy exists yet. Run `firebase functions:artifacts:setpolicy --project agenticros --force` once locally to set a 1-day retention policy (prevents container images from accumulating storage cost). Subsequent CI runs will succeed cleanly.
