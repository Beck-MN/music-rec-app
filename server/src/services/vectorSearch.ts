import { db } from "../db";
import { songs } from "../db/schema";
import { eq, sql } from "drizzle-orm";

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

export type ImportSongPayload = {
  title: string;
  artist: string;
  genre?: string;
  features: RawAudioFeatures;
};

const FEATURE_KEYS = ["tempo", "energy", "danceability", "valence", "acousticness"] as const;

export function normalizeFeatures(features: RawAudioFeatures): AudioFeatures {
  const normalized = {} as AudioFeatures;
  for (const key of FEATURE_KEYS) {
    const value = features[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`Missing or invalid feature: ${key}`);
    }
    normalized[key] = value;
  }
  return normalized;
}

export function featuresToVector(f: RawAudioFeatures | AudioFeatures): number[] {
  const normalized = normalizeFeatures(f);
  return FEATURE_KEYS.map((key) => normalized[key]);
}

/** Rescale each feature dimension to [0, 1] using min/max across the corpus. */
export function minMaxNormalizeCorpus<T extends { features: RawAudioFeatures }>(entries: T[]): T[] {
  if (entries.length === 0) return entries;

  const ranges = FEATURE_KEYS.map((key) => {
    const values = entries.map((e) => e.features[key]);
    return { key, min: Math.min(...values), max: Math.max(...values) };
  });

  return entries.map((entry) => {
    const features = { ...entry.features };
    for (const { key, min, max } of ranges) {
      const span = max - min;
      features[key] = span > 0 ? (features[key] - min) / span : 0.5;
    }
    return { ...entry, features };
  });
}

/** Min-max normalize a list of raw 5D vectors (e.g. parsed from stored embeddings). */
export function minMaxNormalizeVectors(vectors: number[][]): number[][] {
  if (vectors.length === 0) return vectors;

  const dims = vectors[0].length;
  const ranges = Array.from({ length: dims }, (_, d) => {
    const values = vectors.map((v) => v[d]);
    return { min: Math.min(...values), max: Math.max(...values) };
  });

  return vectors.map((vector) =>
    vector.map((value, d) => {
      const { min, max } = ranges[d];
      const span = max - min;
      return span > 0 ? (value - min) / span : 0.5;
    })
  );
}

export function parseEmbedding(embedding: unknown): number[] {
  if (Array.isArray(embedding)) return embedding.map(Number);
  if (typeof embedding === "string") {
    return embedding
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  }
  return [];
}

export async function findSimilarSongs(
  queryVector: number[],
  topK: number = 5,
  excludeId?: number
) {
  const vectorLiteral = `[${queryVector.join(",")}]`;

  const results = await db.execute(sql`
    SELECT
      id, title, artist, genre, embedding::text AS embedding,
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM songs
    ${excludeId ? sql`WHERE id != ${excludeId}` : sql``}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `);

  return results.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    similarity: Number(row.similarity),
    embedding: parseEmbedding(row.embedding),
  }));
}

export async function findSimilarSongsById(songId: number, topK: number = 5) {
  const [song] = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);

  if (!song) return null;

  const queryVector = parseEmbedding(song.embedding);
  const results = await findSimilarSongs(queryVector, topK, songId);
  return { song, results };
}
