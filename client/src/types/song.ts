export type AudioFeatures = {
  tempo: number;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
};

export type RawAudioFeatures = AudioFeatures & {
  bpm_raw?: number;
};

export type Song = {
  id: number;
  title: string;
  artist: string;
  genre: string;
  primaryGenre: string;
  subgenres: string[];
  embedding: number[];
  createdAt: string;
};

export type SongWithSimilarity = Song & {
  similarity: number;
};

export type NewSongPayload = {
  title: string;
  artist: string;
  genre: string;
  primaryGenre?: string;
  subgenres?: string[];
  features: AudioFeatures;
};

export type ImportSongPayload = {
  title: string;
  artist: string;
  genre?: string;
  primaryGenre?: string;
  primary_genre?: string;
  subgenres?: string[];
  features: RawAudioFeatures;
};

export type UpdateSongPayload = {
  title: string;
  artist: string;
  genre?: string;
  primaryGenre?: string;
  subgenres?: string[];
};

export type ImportSongsResult = {
  imported: number;
  songs: Song[];
};

export type QdrantSong = Omit<Song, "id"> & {
  id: string;
};

export type QdrantSongWithSimilarity = QdrantSong & {
  similarity: number;
};

export type QdrantStatus = {
  connected: boolean;
  collection: string;
  exists: boolean;
  pointsCount: number;
  vectorSize?: number;
  error?: string;
};

export type QdrantSyncResult = {
  synced: number;
};

export const FEATURE_LABELS: Record<keyof AudioFeatures, string> = {
  tempo: "Tempo",
  energy: "Energy",
  danceability: "Danceability",
  valence: "Valence",
  acousticness: "Acousticness",
};

export const DEFAULT_FEATURES: AudioFeatures = {
  tempo: 0.5,
  energy: 0.5,
  danceability: 0.5,
  valence: 0.5,
  acousticness: 0.5,
};
