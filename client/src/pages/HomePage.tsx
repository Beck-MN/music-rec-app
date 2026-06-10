import { useCallback, useState } from "react";
import { AddSongForm } from "../components/AddSongForm";
import { ImportJsonForm } from "../components/ImportJsonForm";
import { RecommendPanel } from "../components/RecommendPanel";
import { SongLibrary } from "../components/SongLibrary";
import { useSongs } from "../hooks/useSongs";
import type { Song, UpdateSongPayload } from "../types/song";

export function HomePage() {
  const {
    songs,
    loading,
    error,
    addSong,
    deleteSong,
    updateSong,
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

  const handleEdit = async (id: number, payload: UpdateSongPayload) => {
    const updated = await updateSong(id, payload);
    if (selectedSong?.id === id) setSelectedSong(updated);
    return updated;
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
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDeleteAll={handleDeleteAll}
        />
      </div>
      <RecommendPanel
        selectedSong={selectedSong}
        songs={songs}
        onSelectSong={handleSelect}
        onFetchRecommendations={fetchRecommendations}
      />
    </div>
  );
}
