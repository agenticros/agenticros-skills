import { useState } from "react";

interface Props {
  marketplaceRef: string;
}

export default function InstallCommand({ marketplaceRef }: Props) {
  const cmd = `npx agenticros skills install ${marketplaceRef}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-3 font-mono text-sm"
      style={{ background: "var(--surface-inset-highlight)" }}
    >
      <span className="select-none text-coral-bright">$</span>
      <code className="flex-1 overflow-x-auto whitespace-nowrap text-text-primary">
        {cmd}
      </code>
      <button
        type="button"
        onClick={copy}
        className="ml-auto rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-text-secondary transition hover:bg-bg-elevated hover:text-text-primary"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
