import { useState } from "react";
import type { QdrantSong, QdrantSongWithSimilarity, Song, SongWithSimilarity } from "../types/song";
import { SONG_DRAG_MIME } from "../lib/drag";
import { EditMenuButton } from "./EditSongModal";
import { SubgenreTags } from "./SubgenreTags";
import { VectorVisualizer } from "./VectorVisualizer";

type Props = {
  song: Song | SongWithSimilarity | QdrantSong | QdrantSongWithSimilarity;
  onRecommend?: (song: Props["song"]) => void;
  onEdit?: (song: Song) => void;
  onDelete?: (id: number) => void;
  selected?: boolean;
  showSimilarity?: boolean;
};

export function SongCard({ song, onRecommend, onEdit, onDelete, selected, showSimilarity }: Props) {
  const similarity = "similarity" in song ? song.similarity : undefined;
  const [dragging, setDragging] = useState(false);
  const draggable = Boolean(onRecommend);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (!onRecommend) return;
        e.dataTransfer.setData(SONG_DRAG_MIME, String(song.id));
        e.dataTransfer.effectAllowed = "copy";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`rounded-xl border p-4 transition-all ${
        dragging ? "cursor-grabbing opacity-50" : draggable ? "cursor-grab" : ""
      } ${
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
                subgenres={song.subgenres?.length ? song.subgenres : song.genre ? [song.genre] : []}
                primaryGenre={song.primaryGenre || song.genre}
              />
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {onEdit && typeof song.id === "number" && (
            <span draggable={false}>
              <EditMenuButton onClick={() => onEdit(song as Song)} />
            </span>
          )}
          {showSimilarity && similarity !== undefined && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Match</p>
              <p className="text-lg font-bold text-emerald-400">{(similarity * 100).toFixed(0)}%</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        {song.embedding.length === 5 ? (
          <VectorVisualizer vector={song.embedding} compact />
        ) : (
          <p className="text-xs text-zinc-600">{song.embedding.length}D embedding vector</p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {onRecommend && (
          <button
            draggable={false}
            onClick={() => onRecommend(song)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
          >
            Find similar
          </button>
        )}
        {onDelete && typeof song.id === "number" && (
          <button
            draggable={false}
            onClick={() => onDelete(song.id as number)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-500/50 hover:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
