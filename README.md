# Corebrum Skills Marketplace

This project was previously known as AgenticROS Skills.


The web app at **[skills.corebrum.com](https://skills.corebrum.com)** — discover, submit, and install [Corebrum Synapse](https://github.com/Corebrum/corebrum-synapse) skills for your robot.

This repo holds the React SPA and Firebase Cloud Functions that power the marketplace. The marketplace itself stores **metadata only** — every skill's source code lives on GitHub.

## What is a Corebrum Synapse skill?

A skill is an npm package the [Corebrum Synapse](https://github.com/Corebrum/corebrum-synapse) plugin loads at startup. Each skill registers tools the AI agent can call (e.g. "follow me", "find object"), reads its config from `config.skills.<skillId>`, and uses the plugin context for ROS2 transport and depth sampling.

See **[synapse/docs/skills.md](https://github.com/Corebrum/corebrum-synapse/blob/main/docs/skills.md)** for the skill contract.

This marketplace lists **Corebrum Synapse robot skills** only — npm packages with a `synapse` block that install via `npx @corebrum/synapse skills install`. Third-party [Agent Skills](https://agentskills.io/home) (`SKILL.md` catalogs) are not indexed here. For official maker catalogs (including NVIDIA) see **[skills.sh/official](https://www.skills.sh/official)**; for Jetson Device and BSP workflows see **[Jetson Agent Skills](https://www.jetson-ai-lab.com/tutorials/jetson-agent-skills/)**.

## Install a skill on your robot

```bash
# Search the marketplace
npx @corebrum/synapse skills search follow

# Prefer npm @corebrum/* when listed; else git clone + build.
# Registers skillPaths/skillRefs, syncs contracts.tools, auto-restarts gateway.
npx @corebrum/synapse skills install @corebrum/followme
npx @corebrum/synapse skills install chrismatthieu/followme

# Skip automatic OpenClaw gateway restart:
npx @corebrum/synapse skills install @corebrum/navigate-to --no-restart
```

Skills use **namespaced refs** `owner/skill-id` and/or scoped npm names `@corebrum/<slug>`. Legacy flat slugs still resolve.

The CLI calls `https://skills.corebrum.com/api/skills/:owner/:skill/install`. When `npmPackage` is present it packs into `~/.synapse/skills-cache/`; otherwise it clones GitHub and builds.

## Submit a skill

**CLI (recommended):**

```bash
npx @corebrum/synapse create-skill my-skill
cd corebrum-skill-my-skill && npm install && npm run dev
npx @corebrum/synapse publish
```

**Web UI:**

1. Sign in at **[skills.corebrum.com/login](https://skills.corebrum.com/login)** with GitHub.
2. Paste your skill's GitHub repo URL into the Submit form.
3. We fetch `package.json` from GitHub, validate the `synapse` block, verify you have push access on the repo, then publish your listing.

Your skill `package.json` must include:

```jsonc
{
  "name": "corebrum-skill-<id>",
  "main": "dist/index.js",
  "repository": { "type": "git", "url": "https://github.com/<you>/<repo>.git" },
  "synapse": {
    "id": "<id>",
    "displayName": "Your Skill",
    "description": "One-sentence summary.",
    "categories": ["navigation", "vision"],
    "screenshots": ["docs/screenshot.png"],
    "capabilities": [
      { "id": "do_thing", "verb": "do", "description": "...", "requires": ["base", "camera"] }
    ]
  }
}
```

Use **[corebrum-skill-followme](https://github.com/Corebrum/corebrum-skill-followme)** as a reference ([chrismatthieu/followme](https://skills.corebrum.com/chrismatthieu/followme) on the marketplace).

## Develop locally

```bash
npm install
npm run dev          # SPA on http://localhost:5174

# Cloud Functions + Firestore emulators
cd functions && npm install && cd -
npm run emulators

# Deploy (requires Firebase auth + Blaze plan)
npm run deploy
```

## Deployment

- **Hosting**: Firebase Hosting on `skills.corebrum.com` (custom domain configured in Firebase Console)
- **API**: Cloud Functions, reverse-proxied via `/api/**` rewrites
- **DB**: Cloud Firestore (production mode, `nam5`)
- **Auth**: Firebase Auth — GitHub OAuth provider only
- **Analytics**: Google Analytics 4 (`G-ZD9TN0RXBT`)

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for first-time setup (GitHub OAuth App, custom domain DNS, Blaze plan, etc.).

## License

Apache-2.0
