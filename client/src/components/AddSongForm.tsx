import { useState } from "react";
import type { AudioFeatures, NewSongPayload } from "../types/song";
import { DEFAULT_FEATURES, FEATURE_LABELS } from "../types/song";
import { VectorVisualizer } from "./VectorVisualizer";

type Props = {
  onSubmit: (payload: NewSongPayload) => Promise<void>;
};

export function AddSongForm({ onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [features, setFeatures] = useState<AudioFeatures>(DEFAULT_FEATURES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFeature = (key: keyof AudioFeatures, value: number) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title, artist, genre, features });
      setTitle("");
      setArtist("");
      setGenre("");
      setFeatures(DEFAULT_FEATURES);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add song");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Add Song</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manually define a 5D audio feature vector
          </p>
        </div>
        <span
          className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t border-zinc-800 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
          <input
            required
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Genre"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          {(Object.keys(FEATURE_LABELS) as (keyof AudioFeatures)[]).map((key) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm">
                <label className="text-zinc-400">{FEATURE_LABELS[key]}</label>
                <span className="font-mono text-zinc-500">{features[key].toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={features[key]}
                onChange={(e) => updateFeature(key, Number(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>
          ))}
        </div>

        <VectorVisualizer
          vector={[
            features.tempo,
            features.energy,
            features.danceability,
            features.valence,
            features.acousticness,
          ]}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add to library"}
        </button>
        </form>
      )}
    </section>
  );
}
