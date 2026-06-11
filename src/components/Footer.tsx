import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border-subtle)] bg-bg-surface/40 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <img src="/agenticros.png" alt="AgenticROS" className="h-7 w-7" />
              <span className="font-display text-lg font-semibold text-coral-bright">
                AgenticROS Skills
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm text-text-secondary">
              Discover, submit, and install skills for your agentic robot. Skills are
              community-built npm packages that extend AgenticROS with new tools the AI
              agent can call.
            </p>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
              Marketplace
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>
                <Link to="/browse" className="hover:text-text-primary">
                  Browse all
                </Link>
              </li>
              <li>
                <Link to="/submit" className="hover:text-text-primary">
                  Submit a skill
                </Link>
              </li>
              <li>
                <Link to="/my-skills" className="hover:text-text-primary">
                  My skills
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
              AgenticROS
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>
                <a
                  href="https://agenticros.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-text-primary"
                >
                  Website
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agenticros/agenticros"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-text-primary"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/agenticros/agenticros/blob/main/docs/skills.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-text-primary"
                >
                  Skill contract
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start gap-2 border-t border-[var(--border-subtle)] pt-6 text-xs text-text-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} AgenticROS. Apache-2.0 licensed.</p>
          <p>Built by the community on top of Firebase + React.</p>
        </div>
      </div>
    </footer>
  );
}
