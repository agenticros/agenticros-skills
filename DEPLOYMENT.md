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

The repo ships a GitHub Actions workflow at [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) that runs on every push to `main`. It needs **one secret**:

- `FIREBASE_SERVICE_ACCOUNT_AGENTICROS` — the JSON contents of a service-account key with the `roles/firebasehosting.admin` + `roles/cloudfunctions.developer` + `roles/datastore.owner` IAM roles. Generate it from Firebase Console → Project Settings → Service accounts → "Generate new private key", then add it as a repository secret named exactly `FIREBASE_SERVICE_ACCOUNT_AGENTICROS`.

The workflow:

1. Installs SPA + Functions deps.
2. Type-checks both.
3. Builds the SPA.
4. Runs `firebase deploy --only hosting,functions,firestore:rules,firestore:indexes` against the `agenticros` project.

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
