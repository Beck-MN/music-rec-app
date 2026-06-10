import type { Song, SongWithSimilarity } from "../types/song";
import { EditMenuButton } from "./EditSongModal";
import { SubgenreTags } from "./SubgenreTags";
import { VectorVisualizer } from "./VectorVisualizer";

type Props = {
  song: Song | SongWithSimilarity;
  onRecommend?: (song: Song) => void;
  onEdit?: (song: Song) => void;
  onDelete?: (id: number) => void;
  selected?: boolean;
  showSimilarity?: boolean;
};

export function SongCard({ song, onRecommend, onEdit, onDelete, selected, showSimilarity }: Props) {
  const similarity = "similarity" in song ? song.similarity : undefined;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        selected
          ? "border-violet-400 bg-violet-500/10 shadow-lg shadow-violet-500/20"
          : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-zinc-100">{song.title}</h3>
          <p className="text-sm text-zinc-400">{song.artist}</p>
          {(song.subgenres?.length > 0 || song.primaryGenre || song.genre) && (
            <div className="mt-2">
              <SubgenreTags
                subgenres={
                  song.subgenres?.length
                    ? song.subgenres
                    : song.genre
                      ? [song.genre]
                      : []
                }
                primaryGenre={song.primaryGenre || song.genre}
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {onEdit && <EditMenuButton onClick={() => onEdit(song)} />}
          {showSimilarity && similarity !== undefined && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Match</p>
              <p className="text-lg font-bold text-emerald-400">{(similarity * 100).toFixed(0)}%</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <VectorVisualizer vector={song.embedding} compact />
      </div>

      <div className="mt-3 flex gap-2">
        {onRecommend && (
          <button
            onClick={() => onRecommend(song)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
          >
            Find similar
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(song.id)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-500/50 hover:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
