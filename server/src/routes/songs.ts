import { Router } from "express";
import { db } from "../db";
import { songs, NewSong } from "../db/schema";
import {
  featuresToVector,
  ImportSongPayload,
  minMaxNormalizeCorpus,
  minMaxNormalizeVectors,
  normalizeFeatures,
  parseEmbedding,
} from "../services/vectorSearch";
import { asc, eq } from "drizzle-orm";

const router = Router();

function formatSong(song: typeof songs.$inferSelect) {
  return {
    ...song,
    embedding: parseEmbedding(song.embedding),
  };
}

function parseImportPayload(body: unknown): ImportSongPayload[] {
  if (!Array.isArray(body)) {
    throw new Error("Expected a JSON array of songs");
  }

  return body.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Item ${index}: expected an object`);
    }

    const { title, artist, genre, features } = item as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      throw new Error(`Item ${index}: title is required`);
    }
    if (typeof artist !== "string" || !artist.trim()) {
      throw new Error(`Item ${index}: artist is required`);
    }
    if (genre !== undefined && typeof genre !== "string") {
      throw new Error(`Item ${index}: genre must be a string`);
    }
    if (!features || typeof features !== "object") {
      throw new Error(`Item ${index}: features object is required`);
    }

    normalizeFeatures(features as ImportSongPayload["features"]);

    return {
      title: title.trim(),
      artist: artist.trim(),
      genre: typeof genre === "string" ? genre.trim() : undefined,
      features: features as ImportSongPayload["features"],
    };
  });
}

async function insertSong(entry: ImportSongPayload) {
  const [song] = await db
    .insert(songs)
    .values({
      title: entry.title,
      artist: entry.artist,
      genre: entry.genre,
      embedding: featuresToVector(entry.features),
    } as NewSong)
    .returning();

  return formatSong(song);
}

router.get("/", async (_req, res) => {
  const all = await db.select().from(songs).orderBy(asc(songs.createdAt));
  res.json(all.map(formatSong));
});

router.post("/", async (req, res) => {
  try {
    const { title, artist, genre, features } = req.body;
    const song = await insertSong({
      title,
      artist,
      genre,
      features,
    });
    res.status(201).json(song);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid song payload",
    });
  }
});

router.post("/import", async (req, res) => {
  try {
    const entries = minMaxNormalizeCorpus(parseImportPayload(req.body));
    const imported = [];

    for (const entry of entries) {
      imported.push(await insertSong(entry));
    }

    res.status(201).json({ imported: imported.length, songs: imported });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid import payload",
    });
  }
});

router.post("/renormalize", async (_req, res) => {
  try {
    const all = await db.select().from(songs).orderBy(asc(songs.createdAt));
    if (all.length === 0) {
      res.json({ updated: 0 });
      return;
    }

    const vectors = all.map((song) => parseEmbedding(song.embedding));
    const normalized = minMaxNormalizeVectors(vectors);

    for (let i = 0; i < all.length; i++) {
      await db.update(songs).set({ embedding: normalized[i] }).where(eq(songs.id, all[i].id));
    }

    res.json({ updated: all.length });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Renormalization failed",
    });
  }
});

router.post("/delete-all", async (_req, res) => {
  await db.delete(songs);
  res.json({ deleted: true });
});

router.delete("/:id", async (req, res) => {
  await db.delete(songs).where(eq(songs.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
