import { QdrantClient } from "@qdrant/js-client-rest";
import { db } from "../db";
import { songs } from "../db/schema";
import { eq } from "drizzle-orm";
import { parseEmbedding, parseSubgenres } from "./vectorSearch";

export const COLLECTION = process.env.QDRANT_COLLECTION_NAME || "songs";
const POSTGRES_VECTOR_SIZE = 5;

export type QdrantSongResult = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  primaryGenre: string;
  subgenres: string[];
  embedding: number[];
  similarity?: number;
  createdAt: string;
};

type QdrantPoint = {
  id: string | number;
  payload?: Record<string, unknown> | null;
  vector?: unknown;
};

function getClient(): QdrantClient {
  const cloudUrl = process.env.QDRANT_CLUSTER_ENDPOINT;
  const apiKey = process.env.QDRANT_API_KEY;
  const localUrl = process.env.QDRANT_URL || "http://localhost:6333";

  if (cloudUrl && apiKey) {
    return new QdrantClient({ url: cloudUrl, apiKey });
  }
  return new QdrantClient({ url: localUrl });
}

function getCollectionVectorSize(info: { config?: { params?: { vectors?: unknown } } }): number {
  const vectors = info.config?.params?.vectors;
  if (vectors && typeof vectors === "object" && "size" in vectors) {
    return Number((vectors as { size: number }).size);
  }
  return POSTGRES_VECTOR_SIZE;
}

function payloadString(payload: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function payloadSubgenres(payload: Record<string, unknown>): string[] {
  const value = payload.subgenres ?? payload.tags ?? payload.genres;
  if (Array.isArray(value)) return value.map(String);
  const subgenre = payload.subgenre;
  if (typeof subgenre === "string" && subgenre.trim()) return [subgenre.trim()];
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function parseArtistTitle(value: string): { artist: string; title: string } {
  const sep = value.lastIndexOf(" - ");
  if (sep === -1) return { artist: "", title: value };
  return {
    artist: value.slice(0, sep).trim(),
    title: value.slice(sep + 3).trim(),
  };
}

function filenameToTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").trim();
}

function pointVector(vector: unknown): number[] {
  if (Array.isArray(vector)) return vector.map(Number);
  if (vector && typeof vector === "object" && "default" in vector) {
    const named = (vector as { default?: unknown }).default;
    if (Array.isArray(named)) return named.map(Number);
  }
  return [];
}

function formatPoint(point: QdrantPoint, score?: number): QdrantSongResult {
  const payload = (point.payload ?? {}) as Record<string, unknown>;
  const songIdRaw = payloadString(payload, ["song_id"]);
  const parsed = parseArtistTitle(songIdRaw);
  const filename = payloadString(payload, ["filename"]);
  const genre = payloadString(payload, ["genre", "primary_genre", "primaryGenre"]);
  const subgenre = payloadString(payload, ["subgenre"]);

  const subgenres = payloadSubgenres(payload);
  if (subgenre && !subgenres.includes(subgenre)) {
    subgenres.unshift(subgenre);
  }

  return {
    id: String(point.id),
    title:
      payloadString(payload, ["title", "name", "song_title"]) ||
      parsed.title ||
      filenameToTitle(filename),
    artist: payloadString(payload, ["artist", "artist_name"]) || parsed.artist,
    genre,
    primaryGenre: payloadString(payload, ["primaryGenre", "primary_genre", "genre"]) || genre,
    subgenres,
    embedding: pointVector(point.vector),
    createdAt: "",
    ...(score !== undefined ? { similarity: score } : {}),
  };
}

function searchableText(payload: Record<string, unknown>): string {
  return [
    payloadString(payload, ["song_id", "title", "name", "song_title", "filename"]),
    payloadString(payload, ["artist", "artist_name"]),
    payloadString(payload, ["genre", "primary_genre", "primaryGenre", "subgenre"]),
    ...payloadSubgenres(payload),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesQuery(payload: Record<string, unknown>, query: string): boolean {
  const text = searchableText(payload);
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => text.includes(token));
}

async function scrollAllPoints(limit = 1000): Promise<QdrantPoint[]> {
  const client = getClient();
  const allPoints: QdrantPoint[] = [];
  let offset: string | number | Record<string, unknown> | undefined;

  while (allPoints.length < limit) {
    const page = await client.scroll(COLLECTION, {
      limit: Math.min(100, limit - allPoints.length),
      offset,
      with_payload: true,
      with_vector: true,
    });

    allPoints.push(...page.points);
    if (!page.next_page_offset || page.points.length === 0) break;
    offset = page.next_page_offset;
  }

  return allPoints;
}

export async function getQdrantStatus() {
  const client = getClient();
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION);
    let pointsCount = 0;
    let vectorSize = POSTGRES_VECTOR_SIZE;

    if (exists) {
      const info = await client.getCollection(COLLECTION);
      pointsCount = info.points_count ?? 0;
      vectorSize = getCollectionVectorSize(info);
    }

    return { connected: true, collection: COLLECTION, exists, pointsCount, vectorSize };
  } catch (err) {
    return {
      connected: false,
      collection: COLLECTION,
      exists: false,
      pointsCount: 0,
      vectorSize: POSTGRES_VECTOR_SIZE,
      error: err instanceof Error ? err.message : "Failed to connect to Qdrant",
    };
  }
}

export async function ensureCollection() {
  const client = getClient();
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION);

  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: POSTGRES_VECTOR_SIZE, distance: "Cosine" },
    });
  }
}

export async function syncSongsToQdrant() {
  await ensureCollection();
  const client = getClient();
  const info = await client.getCollection(COLLECTION);
  const vectorSize = getCollectionVectorSize(info);

  if (vectorSize !== POSTGRES_VECTOR_SIZE) {
    throw new Error(
      `Cannot sync: "${COLLECTION}" uses ${vectorSize}D vectors but Postgres songs are ${POSTGRES_VECTOR_SIZE}D. Use a different collection name for Postgres sync.`
    );
  }

  const allSongs = await db.select().from(songs);
  if (allSongs.length === 0) {
    return { synced: 0 };
  }

  const points = allSongs.map((song) => ({
    id: song.id,
    vector: parseEmbedding(song.embedding),
    payload: {
      id: song.id,
      title: song.title,
      artist: song.artist,
      genre: song.genre ?? "",
      primaryGenre: song.primaryGenre ?? "",
      subgenres: parseSubgenres(song.subgenres),
    },
  }));

  await client.upsert(COLLECTION, { wait: true, points });
  return { synced: points.length };
}

export async function searchQdrantByText(query: string, limit = 10): Promise<QdrantSongResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const status = await getQdrantStatus();
  if (!status.exists) {
    throw new Error(`Collection "${COLLECTION}" not found in Qdrant`);
  }

  const points = await scrollAllPoints(Math.max(limit * 20, 500));

  return points
    .filter((point) => matchesQuery((point.payload ?? {}) as Record<string, unknown>, trimmed))
    .slice(0, limit)
    .map((point) => formatPoint(point));
}

export async function searchQdrantSimilar(
  queryVector: number[],
  topK = 5,
  excludeId?: string | number
): Promise<QdrantSongResult[]> {
  const status = await getQdrantStatus();
  if (!status.exists) {
    throw new Error(`Collection "${COLLECTION}" not found in Qdrant`);
  }

  if (queryVector.length === 0) {
    throw new Error("Missing query vector for similarity search");
  }

  const client = getClient();

  const results = await client.search(COLLECTION, {
    vector: queryVector,
    limit: topK + (excludeId !== undefined ? 1 : 0),
    with_payload: true,
    with_vector: true,
  });

  return results
    .filter((hit) => excludeId === undefined || String(hit.id) !== String(excludeId))
    .slice(0, topK)
    .map((hit) => formatPoint(hit, hit.score));
}

export async function searchQdrantSimilarBySongId(songId: number, topK = 5) {
  const [song] = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);
  if (!song) return null;

  const queryVector = parseEmbedding(song.embedding);
  const status = await getQdrantStatus();
  if (queryVector.length !== status.vectorSize) {
    return null;
  }

  const results = await searchQdrantSimilar(queryVector, topK, songId);
  return {
    song: formatPoint(
      {
        id: song.id,
        payload: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          genre: song.genre ?? "",
          primaryGenre: song.primaryGenre ?? "",
          subgenres: parseSubgenres(song.subgenres),
        },
        vector: queryVector,
      },
      undefined
    ),
    results,
  };
}

export async function searchQdrantSimilarByPointId(pointId: string | number, topK = 5) {
  const client = getClient();
  const retrieved = await client.retrieve(COLLECTION, {
    ids: [pointId],
    with_payload: true,
    with_vector: true,
  });

  const point = retrieved[0];
  if (!point) return null;

  const queryVector = pointVector(point.vector);
  const results = await searchQdrantSimilar(queryVector, topK, pointId);

  return {
    song: formatPoint(point),
    results,
  };
}
