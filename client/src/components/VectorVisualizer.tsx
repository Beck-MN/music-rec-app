import { FEATURE_LABELS } from "../types/song";

const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as (keyof typeof FEATURE_LABELS)[];

type Props = {
  vector: number[];
  compact?: boolean;
};

export function VectorVisualizer({ vector, compact = false }: Props) {
  const size = compact ? 80 : 120;
  const center = size / 2;
  const maxRadius = center - 8;

  const points = vector.map((value, i) => {
    const angle = (i / vector.length) * 2 * Math.PI - Math.PI / 2;
    const radius = value * maxRadius;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      label: FEATURE_KEYS[i],
      value,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={compact ? "" : "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"}>
      {!compact && (
        <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">5D feature vector</p>
      )}
      <svg width={size} height={size} className="mx-auto">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <circle
            key={scale}
            cx={center}
            cy={center}
            r={maxRadius * scale}
            fill="none"
            stroke="#3f3f46"
            strokeWidth={0.5}
          />
        ))}
        {points.map((p, i) => {
          const angle = (i / vector.length) * 2 * Math.PI - Math.PI / 2;
          const axisX = center + Math.cos(angle) * maxRadius;
          const axisY = center + Math.sin(angle) * maxRadius;
          return (
            <line
              key={p.label}
              x1={center}
              y1={center}
              x2={axisX}
              y2={axisY}
              stroke="#52525b"
              strokeWidth={0.5}
            />
          );
        })}
        <polygon
          points={polygon}
          fill="rgba(139, 92, 246, 0.25)"
          stroke="#8b5cf6"
          strokeWidth={1.5}
        />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={compact ? 2 : 3} fill="#a78bfa" />
        ))}
      </svg>
      {!compact && (
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[10px] text-zinc-500">
          {FEATURE_KEYS.map((key, i) => (
            <div key={key}>
              <p>{FEATURE_LABELS[key].slice(0, 4)}</p>
              <p className="font-mono text-zinc-400">{vector[i]?.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
