import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border-subtle)] bg-bg-surface/40 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2">
            <Link to="/" className="flex h-10 max-w-60 items-center gap-2" aria-label="AgenticROS Skills home">
              <img
                src="/agenticros-logo-only.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 object-cover object-center"
              />
              <img
                src="/agenticros-text-only-white.png"
                alt="AgenticROS"
                className="h-5 min-w-0 flex-1 object-contain object-left"
              />
              <span className="shrink-0 text-sm font-semibold text-coral-bright">
                Skills
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
        </div>
      </div>
    </footer>
  );
}
