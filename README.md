# AgenticROS Skills

A curated list of **AgenticROS skills** — optional plugins that extend [AgenticROS](https://github.com/agenticros/agenticros) with new tools and behaviors so you can control and query your robot in natural language.

Use this repo to **discover skills** for your robot and to **submit your own** via pull request.

---

## What are AgenticROS skills?

[AgenticROS](https://github.com/agenticros/agenticros) connects ROS2 robots to AI agent platforms (e.g. OpenClaw). **Skills** are add-on packages that the AgenticROS plugin loads at startup. Each skill:

- **Registers tools** the agent can call (e.g. “follow me”, “what do you see?”).
- **Reads config** from `config.skills.<skillId>` so you tune behavior without changing code.
- **Uses the plugin context** for ROS2 transport, depth sampling, and logging.

Skills make robots more capable without changing the core: follow a person, run vision models, trigger custom behaviors — all exposed as tools the user can invoke via chat or voice.

**How they work:** You add a skill package to `skillPackages` (or a path to `skillPaths`) in your OpenClaw/AgenticROS config. After a gateway restart, the skill’s tools are available to the agent. Users say things like “follow me” or “start following”; the agent calls the right tool and the skill drives the robot (e.g. publishing `cmd_vel`, querying cameras, calling Ollama).

Full contract and types: **[AgenticROS → docs/skills.md](https://github.com/agenticros/agenticros)** (in the main repo).

---

## Skills

| Skill | Description |
|-------|-------------|
| **[Follow Me](https://github.com/agenticros/agenticros-skill-followme)** | Robot follows the user using depth (and optionally Ollama/VLM). Publishes `cmd_vel`, keeps a target distance, and can search when the person leaves view. Tools: `follow_robot`, `follow_me_see`, `ollama_status`. |

*More skills will be listed here as they are submitted and accepted.*

---

## Discover skills

- Browse the table above for skills that match your robot and use case.
- Each link goes to the skill’s repo for install steps, config options, and usage.
- Install by adding the package to `skillPackages` (or a path to `skillPaths`) in your AgenticROS/OpenClaw config under `plugins.entries.agenticros.config`, then restart the gateway.

---

## Submit a skill

We welcome community skills. To add yours to the list:

1. **Build a skill** that follows the [AgenticROS skill contract](https://github.com/agenticros/agenticros) (export `registerSkill(api, config, context)`, use `config.skills.<skillId>`, etc.). Use [agenticros-skill-followme](https://github.com/agenticros/agenticros-skill-followme) as a reference.
2. **Open a pull request** in this repo that adds one row to the **Skills** table in this README with:
   - **Skill**: Link to the skill’s repository (e.g. `[Follow Me](https://github.com/agenticros/agenticros-skill-followme)`).
   - **Description**: One short sentence summarizing what the skill does and main tools (e.g. “Robot follows the user using depth…”).

Keep descriptions concise so the table stays scannable. We may suggest small edits before merging.

---

## Links

- **[AgenticROS](https://github.com/agenticros/agenticros)** — Core platform and OpenClaw plugin
- **[Follow Me skill (reference)](https://github.com/agenticros/agenticros-skill-followme)** — Example skill and template for building your own
