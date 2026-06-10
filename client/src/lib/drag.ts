export const SONG_DRAG_MIME = "application/x-song-id";

export function readSongIdFromDrag(dataTransfer: DataTransfer): number | null {
  const raw = dataTransfer.getData(SONG_DRAG_MIME);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}
