import { useEffect, useState } from "react";
import type { Song, UpdateSongPayload } from "../types/song";

type Props = {
  song: Song | null;
  onClose: () => void;
  onSave: (id: number, payload: UpdateSongPayload) => Promise<Song>;
};

function parseSubgenresInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

export function EditSongModal({ song, onClose, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [primaryGenre, setPrimaryGenre] = useState("");
  const [subgenresText, setSubgenresText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!song) return;
    setTitle(song.title);
    setArtist(song.artist);
    setPrimaryGenre(song.primaryGenre || song.genre || "");
    setSubgenresText((song.subgenres ?? []).join(", "));
    setError(null);
  }, [song]);

  if (!song) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(song.id, {
        title: title.trim(),
        artist: artist.trim(),
        primaryGenre: primaryGenre.trim(),
        genre: primaryGenre.trim(),
        subgenres: parseSubgenresInput(subgenresText),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-100">Edit song</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Update metadata — audio features stay unchanged.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Artist</span>
            <input
              required
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Primary genre</span>
            <input
              value={primaryGenre}
              onChange={(e) => setPrimaryGenre(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Subgenres</span>
            <input
              value={subgenresText}
              onChange={(e) => setSubgenresText(e.target.value)}
              placeholder="Dance-pop, R&B, Pop"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-zinc-600">Comma-separated</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
      <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
      <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" />
    </svg>
  );
}

export function EditMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Edit song"
      className="rounded-lg border border-transparent p-1.5 text-zinc-400 transition hover:border-violet-500/50 hover:bg-zinc-800 hover:text-violet-300"
    >
      <MenuIcon />
    </button>
  );
}
