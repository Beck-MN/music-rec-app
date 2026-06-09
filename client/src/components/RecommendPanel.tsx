import { useEffect, useMemo, useState } from "react";
import type { Song, SongWithSimilarity } from "../types/song";
import { SongCard } from "./SongCard";
import { VectorVisualizer } from "./VectorVisualizer";

type SortOrder = "desc" | "asc";

type Props = {
  selectedSong: Song | null;
  onFetchRecommendations: (id: number, topK: number) => Promise<SongWithSimilarity[]>;
};

export function RecommendPanel({ selectedSong, onFetchRecommendations }: Props) {
  const [recommendations, setRecommendations] = useState<SongWithSimilarity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topK, setTopK] = useState(5);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  useEffect(() => {
    if (!selectedSong) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    setError(null);
    onFetchRecommendations(selectedSong.id, topK)
      .then(setRecommendations)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to get recommendations")
      )
      .finally(() => setLoading(false));
  }, [selectedSong, topK, onFetchRecommendations]);

  const sortedRecommendations = useMemo(() => {
    return [...recommendations].sort((a, b) =>
      sortOrder === "desc" ? b.similarity - a.similarity : a.similarity - b.similarity
    );
  }, [recommendations, sortOrder]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Recommendations</h2>
          <p className="text-sm text-zinc-500">Top matches via pgvector cosine similarity</p>
        </div>

        {selectedSong && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Results (top K)</span>
              <input
                type="number"
                min={1}
                max={50}
                value={topK}
                onChange={(e) => setTopK(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Sort by match</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              >
                <option value="desc">Highest first</option>
                <option value="asc">Lowest first</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {!selectedSong && (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <p className="text-zinc-400">Select a song to find similar tracks</p>
        </div>
      )}

      {selectedSong && (
        <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
          <p className="text-xs uppercase tracking-wide text-violet-400">Query vector</p>
          <p className="mt-1 font-medium text-zinc-100">
            {selectedSong.title} — {selectedSong.artist}
          </p>
          <div className="mt-3">
            <VectorVisualizer vector={selectedSong.embedding} />
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-zinc-500">Searching vector space...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && selectedSong && sortedRecommendations.length === 0 && !error && (
        <p className="text-sm text-zinc-500">No similar songs found.</p>
      )}

      <div className="grid gap-3">
        {sortedRecommendations.map((song) => (
          <SongCard key={song.id} song={song} showSimilarity />
        ))}
      </div>
    </section>
  );
}
