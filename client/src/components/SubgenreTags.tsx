const SUBGENRE_PALETTE = [
  { bg: "bg-fuchsia-500/20", text: "text-fuchsia-300", border: "border-fuchsia-400/40" },
  { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-400/40" },
  { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-400/40" },
  { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-400/40" },
  { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-400/40" },
  { bg: "bg-sky-500/20", text: "text-sky-300", border: "border-sky-400/40" },
  { bg: "bg-lime-500/20", text: "text-lime-300", border: "border-lime-400/40" },
  { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-400/40" },
  { bg: "bg-violet-500/20", text: "text-violet-300", border: "border-violet-400/40" },
  { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-400/40" },
];

function hashLabel(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getSubgenreStyle(label: string) {
  return SUBGENRE_PALETTE[hashLabel(label) % SUBGENRE_PALETTE.length];
}

type Props = {
  subgenres: string[];
  primaryGenre?: string;
  compact?: boolean;
};

export function SubgenreTags({ subgenres, primaryGenre, compact = false }: Props) {
  const unique = [...new Set(subgenres.filter(Boolean))];
  if (unique.length === 0 && !primaryGenre) return null;

  const sorted = [...unique].sort((a, b) => {
    if (primaryGenre && a === primaryGenre) return -1;
    if (primaryGenre && b === primaryGenre) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {sorted.map((tag) => {
        const isPrimary = primaryGenre === tag;
        const style = getSubgenreStyle(tag);
        return (
          <span
            key={tag}
            className={`inline-block rounded-full border px-2 py-0.5 font-medium ${style.bg} ${style.text} ${style.border} ${
              compact ? "text-[10px]" : "text-xs"
            } ${isPrimary ? "ring-1 ring-white/30" : ""}`}
            title={isPrimary ? "Primary genre" : undefined}
          >
            {tag}
            {isPrimary ? " ★" : ""}
          </span>
        );
      })}
    </div>
  );
}
