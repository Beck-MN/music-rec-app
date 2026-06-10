import { useCallback, useEffect, useState } from "react";
import { SongCard } from "../components/SongCard";
import { api } from "../lib/api";
import type { QdrantSong, QdrantSongWithSimilarity, QdrantStatus } from "../types/song";

export function QdrantSearchPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<QdrantStatus | null>(null);
  const [results, setResults] = useState<QdrantSong[]>([]);
  const [similarResults, setSimilarResults] = useState<QdrantSongWithSimilarity[]>([]);
  const [selectedSong, setSelectedSong] = useState<QdrantSong | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topK, setTopK] = useState(5);
  const [searched, setSearched] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await api.qdrant.status();
      setStatus(next);
    } catch (err) {
      setStatus({
        connected: false,
        collection: "songs",
        exists: false,
        pointsCount: 0,
        error: err instanceof Error ? err.message : "Failed to reach Qdrant API",
      });
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await api.qdrant.sync();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSimilarResults([]);
    setSelectedSong(null);
    setSearched(true);
    try {
      const hits = await api.qdrant.search(trimmed);
      setResults(hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilar = useCallback(async (song: QdrantSong, k: number) => {
    setSimilarLoading(true);
    setError(null);
    try {
      const hits = await api.qdrant.similarByPointId(song.id, k);
      setSimilarResults(hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Similarity search failed");
      setSimilarResults([]);
    } finally {
      setSimilarLoading(false);
    }
  }, []);

  const handleFindSimilar = (song: QdrantSong) => {
    setSelectedSong(song);
  };

  useEffect(() => {
    if (!selectedSong) return;
    void fetchSimilar(selectedSong, topK);
  }, [selectedSong, topK, fetchSimilar]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Qdrant Search Test</h2>
            <p className="text-sm text-zinc-500">
              Search indexed songs by title or artist, then run vector similarity in Qdrant
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing || (status?.vectorSize !== undefined && status.vectorSize !== 5)}
            title={
              status?.vectorSize !== undefined && status.vectorSize !== 5
                ? "This collection uses audio embeddings and cannot be overwritten by Postgres sync"
                : undefined
            }
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-violet-500/50 hover:text-violet-300 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync from database"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span
            className={`rounded-full px-3 py-1 ${
              status?.connected
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {status?.connected ? "Qdrant connected" : "Qdrant disconnected"}
          </span>
          {status?.connected && (
            <>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-400">
                Collection: {status.collection}
              </span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-400">
                {status.pointsCount} points indexed
              </span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-400">
                {status.vectorSize ?? 5}D vectors
              </span>
            </>
          )}
        </div>

        {status?.error && <p className="mb-4 text-sm text-red-400">{status.error}</p>}

        <form onSubmit={(e) => void handleSearch(e)} className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or artist..."
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {!loading && searched && results.length === 0 && !error && (
          <p className="mt-3 text-sm text-zinc-500">No matches in Qdrant for "{query.trim()}".</p>
        )}
      </section>

      {results.length > 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">
            Text matches ({results.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                selected={selectedSong?.id === song.id}
                onRecommend={(song) => handleFindSimilar(song as QdrantSong)}
              />
            ))}
          </div>
        </section>
      )}

      {selectedSong && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Similar in Qdrant</h3>
              <p className="text-sm text-zinc-500">
                Cosine similarity for {selectedSong.title} — {selectedSong.artist}
              </p>
            </div>
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
          </div>

          {similarLoading && <p className="text-sm text-zinc-500">Searching vector space...</p>}

          {!similarLoading && similarResults.length === 0 && (
            <p className="text-sm text-zinc-500">No similar songs found.</p>
          )}

          <div className="grid gap-3">
            {similarResults.map((song) => (
              <SongCard key={song.id} song={song} showSimilarity />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
