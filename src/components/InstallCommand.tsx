import { useState } from "react";

interface Props {
  marketplaceRef: string;
  /** Optional scoped npm package name, e.g. @agenticros-skills/navigate-to */
  npmPackage?: string;
}

export default function InstallCommand({ marketplaceRef, npmPackage }: Props) {
  const cliCmd = `npx agenticros skills install ${marketplaceRef}`;
  const npmCmd = npmPackage
    ? `npx agenticros skills install ${npmPackage}`
    : null;
  const [copied, setCopied] = useState<"cli" | "npm" | null>(null);

  async function copy(which: "cli" | "npm") {
    const text = which === "npm" && npmCmd ? npmCmd : cliCmd;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-3 font-mono text-sm"
        style={{ background: "var(--surface-inset-highlight)" }}
      >
        <span className="select-none text-coral-bright">$</span>
        <code className="flex-1 overflow-x-auto whitespace-nowrap text-text-primary">
          {cliCmd}
        </code>
        <button
          type="button"
          onClick={() => copy("cli")}
          className="ml-auto rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
        >
          {copied === "cli" ? "Copied!" : "Copy"}
        </button>
      </div>
      {npmCmd ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-3 font-mono text-sm"
          style={{ background: "var(--surface-inset-highlight)" }}
        >
          <span className="select-none text-coral-bright">$</span>
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-text-primary">
            {npmCmd}
          </code>
          <button
            type="button"
            onClick={() => copy("npm")}
            className="ml-auto rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
          >
            {copied === "npm" ? "Copied!" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
