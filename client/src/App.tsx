import { useCallback, useState } from "react";
import { AddSongForm } from "./components/AddSongForm";
import { ImportJsonForm } from "./components/ImportJsonForm";
import { RecommendPanel } from "./components/RecommendPanel";
import { SongLibrary } from "./components/SongLibrary";
import { useSongs } from "./hooks/useSongs";
import type { Song } from "./types/song";

export default function App() {
  const {
    songs,
    loading,
    error,
    addSong,
    deleteSong,
    deleteAllSongs,
    importSongs,
    getRecommendations,
  } = useSongs();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleSelect = (song: Song) => setSelectedSong(song);

  const handleDelete = async (id: number) => {
    await deleteSong(id);
    if (selectedSong?.id === id) setSelectedSong(null);
  };

  const handleDeleteAll = async () => {
    await deleteAllSongs();
    setSelectedSong(null);
  };

  const fetchRecommendations = useCallback(
    (id: number, topK: number) => getRecommendations(id, topK),
    [getRecommendations]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">Music Recommender</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Vector similarity search with pgvector — cosine distance in 5D audio feature space
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <AddSongForm
              onSubmit={async (payload) => {
                await addSong(payload);
              }}
            />
            <ImportJsonForm onImport={importSongs} />
            <SongLibrary
              songs={songs}
              loading={loading}
              error={error}
              selectedId={selectedSong?.id ?? null}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onDeleteAll={handleDeleteAll}
            />
          </div>
          <RecommendPanel
            selectedSong={selectedSong}
            onFetchRecommendations={fetchRecommendations}
          />
        </div>
      </main>
    </div>
  );
}
