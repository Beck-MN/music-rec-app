import { useMemo, useState } from "react";
import type { Song } from "../types/song";
import { SongCard } from "./SongCard";

type Props = {
  songs: Song[];
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  onSelect: (song: Song) => void;
  onDelete: (id: number) => void;
  onDeleteAll: () => Promise<void>;
};

function matchesSearch(song: Song, query: string) {
  const q = query.toLowerCase();
  return (
    song.title.toLowerCase().includes(q) ||
    song.artist.toLowerCase().includes(q) ||
    song.genre?.toLowerCase().includes(q)
  );
}

export function SongLibrary({
  songs,
  loading,
  error,
  selectedId,
  onSelect,
  onDelete,
  onDeleteAll,
}: Props) {
  const [search, setSearch] = useState("");
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${songs.length} songs? This cannot be undone.`)) {
      return;
    }

    setDeletingAll(true);
    setDeleteAllError(null);
    try {
      await onDeleteAll();
    } catch (err) {
      setDeleteAllError(err instanceof Error ? err.message : "Failed to delete songs");
    } finally {
      setDeletingAll(false);
    }
  };

  const filteredSongs = useMemo(() => {
    const query = search.trim();
    if (!query) return songs;
    return songs.filter((song) => matchesSearch(song, query));
  }, [songs, search]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Song Library</h2>
          <p className="text-sm text-zinc-500">
            {search.trim()
              ? `${filteredSongs.length} of ${songs.length} tracks`
              : `${songs.length} tracks in vector space`}
          </p>
        </div>
        {songs.length > 0 && (
          <button
            onClick={() => void handleDeleteAll()}
            disabled={deletingAll}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
          >
            {deletingAll ? "Deleting..." : "Delete all"}
          </button>
        )}
      </div>

      {songs.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, artist, or genre..."
          className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
        />
      )}

      {loading && <p className="text-sm text-zinc-500">Loading songs...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {deleteAllError && <p className="text-sm text-red-400">{deleteAllError}</p>}

      {!loading && songs.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-zinc-400">No songs yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            Add a track or import a JSON file to get started.
          </p>
        </div>
      )}

      {!loading && songs.length > 0 && filteredSongs.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-zinc-400">No matches for "{search.trim()}"</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredSongs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            selected={selectedId === song.id}
            onRecommend={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
