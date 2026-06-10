import { Link, Outlet, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Library" },
  { to: "/qdrant", label: "Qdrant Search" },
];

export function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Music Recommender</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Vector similarity search with pgvector and Qdrant
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            {navLinks.map(({ to, label }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-violet-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
