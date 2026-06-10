import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ImportSongPayload, NewSongPayload, Song, SongWithSimilarity, UpdateSongPayload } from "../types/song";

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.songs.list();
      setSongs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSong = async (payload: NewSongPayload) => {
    const song = await api.songs.add(payload);
    setSongs((prev) => [...prev, song]);
    return song;
  };

  const deleteSong = async (id: number) => {
    await api.songs.delete(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSong = async (id: number, payload: UpdateSongPayload) => {
    const updated = await api.songs.update(id, payload);
    setSongs((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const deleteAllSongs = async () => {
    await api.songs.deleteAll();
    setSongs([]);
  };

  const importSongs = async (entries: ImportSongPayload[]) => {
    const result = await api.songs.importJson(entries);
    await refresh();
    return result;
  };

  const getRecommendations = async (id: number, topK = 5): Promise<SongWithSimilarity[]> => {
    return api.recommendations.bySongId(id, topK);
  };

  return {
    songs,
    loading,
    error,
    refresh,
    addSong,
    deleteSong,
    updateSong,
    deleteAllSongs,
    importSongs,
    getRecommendations,
  };
}
