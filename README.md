# AgenticROS Skills Marketplace

The web app at **[skills.agenticros.com](https://skills.agenticros.com)** — discover, submit, and install [AgenticROS](https://github.com/agenticros/agenticros) skills for your robot.

This repo holds the React SPA and Firebase Cloud Functions that power the marketplace. The marketplace itself stores **metadata only** — every skill's source code lives on GitHub.

## What is an AgenticROS skill?

A skill is an npm package the [AgenticROS](https://github.com/agenticros/agenticros) plugin loads at startup. Each skill registers tools the AI agent can call (e.g. "follow me", "find object"), reads its config from `config.skills.<skillId>`, and uses the plugin context for ROS2 transport and depth sampling.

See **[agenticros/docs/skills.md](https://github.com/agenticros/agenticros/blob/main/docs/skills.md)** for the skill contract.

## Install a skill on your robot

```bash
# Search the marketplace
npx agenticros skills search follow

# One-step install (clones, builds, registers, syncs)
npx agenticros skills install followme
```

The CLI calls the public Skills API (`https://skills.agenticros.com/api/skills/:slug/install`), clones the skill's GitHub repo into a sibling of your AgenticROS checkout, runs `pnpm install && pnpm build`, registers the path with your OpenClaw config, and reminds you to restart the gateway.

## Submit a skill

1. Sign in at **[skills.agenticros.com/login](https://skills.agenticros.com/login)** with GitHub.
2. Paste your skill's GitHub repo URL into the Submit form.
3. We fetch `package.json` from GitHub, validate the `agenticros` block, verify you have push access on the repo, then publish your listing.

Your skill `package.json` must include:

```jsonc
{
  "name": "agenticros-skill-<id>",
  "main": "dist/index.js",
  "repository": { "type": "git", "url": "https://github.com/<you>/<repo>.git" },
  "agenticros": {
    "id": "<id>",
    "displayName": "Your Skill",
    "description": "One-sentence summary.",
    "categories": ["navigation", "vision"],
    "screenshots": ["docs/screenshot.png"],
    "capabilities": [
      { "id": "do_thing", "verb": "do", "description": "..." }
    ]
  }
}
```

Use **[agenticros-skill-followme](https://github.com/agenticros/agenticros-skill-followme)** as a reference.

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

- **Hosting**: Firebase Hosting on `skills.agenticros.com` (custom domain configured in Firebase Console)
- **API**: Cloud Functions, reverse-proxied via `/api/**` rewrites
- **DB**: Cloud Firestore (production mode, `nam5`)
- **Auth**: Firebase Auth — GitHub OAuth provider only
- **Analytics**: Google Analytics 4 (`G-ZD9TN0RXBT`)

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for first-time setup (GitHub OAuth App, custom domain DNS, Blaze plan, etc.).

## License

Apache-2.0
