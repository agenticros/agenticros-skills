import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-display text-6xl font-bold text-coral-bright">404</h1>
      <p className="mt-4 text-lg text-text-secondary">
        That page doesn't exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-cyan-bright px-6 py-3 text-sm font-medium text-white transition hover:bg-cyan-mid"
      >
        Back home
      </Link>
    </div>
  );
}
