import type {
  AudioFeatures,
  ImportSongPayload,
  ImportSongsResult,
  NewSongPayload,
  QdrantSong,
  QdrantSongWithSimilarity,
  QdrantStatus,
  QdrantSyncResult,
  Song,
  SongWithSimilarity,
  UpdateSongPayload,
} from "../types/song";

const BASE = "http://localhost:3001/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) throw new Error(json.error);
    } catch (err) {
      if (err instanceof Error && !(err instanceof SyntaxError)) throw err;
    }

    if (res.status === 404) {
      throw new Error("Import endpoint not found — restart the server with npm run dev:server");
    }

    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  songs: {
    list: (): Promise<Song[]> => fetch(`${BASE}/songs`).then((r) => handleResponse<Song[]>(r)),

    add: (payload: NewSongPayload): Promise<Song> =>
      fetch(`${BASE}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => handleResponse<Song>(r)),

    delete: (id: number): Promise<void> =>
      fetch(`${BASE}/songs/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error(r.statusText);
      }),

    update: (id: number, payload: UpdateSongPayload): Promise<Song> =>
      fetch(`${BASE}/songs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => handleResponse<Song>(r)),

    deleteAll: (): Promise<void> =>
      fetch(`${BASE}/songs/delete-all`, { method: "POST" }).then((r) =>
        handleResponse<{ deleted: boolean }>(r).then(() => {})
      ),

    importJson: (songs: ImportSongPayload[]): Promise<ImportSongsResult> =>
      fetch(`${BASE}/songs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(songs),
      }).then((r) => handleResponse<ImportSongsResult>(r)),
  },

  recommendations: {
    byFeatures: (
      features: AudioFeatures,
      topK: number = 5,
      excludeId?: number
    ): Promise<SongWithSimilarity[]> =>
      fetch(`${BASE}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, topK, excludeId }),
      }).then((r) => handleResponse<SongWithSimilarity[]>(r)),

    bySongId: (id: number, topK: number = 5): Promise<SongWithSimilarity[]> =>
      fetch(`${BASE}/recommendations/${id}?topK=${topK}`).then((r) =>
        handleResponse<SongWithSimilarity[]>(r)
      ),
  },

  qdrant: {
    status: (): Promise<QdrantStatus> =>
      fetch(`${BASE}/qdrant/status`).then((r) => handleResponse<QdrantStatus>(r)),

    sync: (): Promise<QdrantSyncResult> =>
      fetch(`${BASE}/qdrant/sync`, { method: "POST" }).then((r) =>
        handleResponse<QdrantSyncResult>(r)
      ),

    search: (q: string, limit = 10): Promise<QdrantSong[]> =>
      fetch(`${BASE}/qdrant/search?q=${encodeURIComponent(q)}&limit=${limit}`).then((r) =>
        handleResponse<QdrantSong[]>(r)
      ),

    similarByPointId: (id: string, topK = 5): Promise<QdrantSongWithSimilarity[]> =>
      fetch(`${BASE}/qdrant/similar/${encodeURIComponent(id)}?topK=${topK}`).then((r) =>
        handleResponse<QdrantSongWithSimilarity[]>(r)
      ),
  },
};
