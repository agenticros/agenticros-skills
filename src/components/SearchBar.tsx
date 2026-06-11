import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  initialValue?: string;
  size?: "sm" | "lg";
  placeholder?: string;
}

export default function SearchBar({
  initialValue = "",
  size = "lg",
  placeholder = "Search skills (e.g. follow, vision, depth)…",
}: Props) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  }

  const sizeCls =
    size === "sm"
      ? "py-2 text-sm"
      : "py-4 text-lg";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-bg-surface/80 px-4 backdrop-blur-md"
    >
      <SearchIcon className="h-5 w-5 flex-shrink-0 text-text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent text-text-primary outline-none placeholder:text-text-muted ${sizeCls}`}
      />
      <button
        type="submit"
        className="rounded-lg bg-cyan-bright px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-mid"
      >
        Search
      </button>
    </form>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
