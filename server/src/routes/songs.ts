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
  parseSubgenres,
} from "../services/vectorSearch";
import { asc, eq } from "drizzle-orm";

const router = Router();

function formatSong(song: typeof songs.$inferSelect) {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    genre: song.genre ?? song.primaryGenre ?? "",
    primaryGenre: song.primaryGenre ?? song.genre ?? "",
    subgenres: parseSubgenres(song.subgenres),
    embedding: parseEmbedding(song.embedding),
    createdAt: song.createdAt != null ? String(song.createdAt) : "",
  };
}

function parseSubgenresField(value: unknown, index: number): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Item ${index}: subgenres must be an array of strings`);
  }
  return value.map((item, i) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(`Item ${index}: subgenres[${i}] must be a non-empty string`);
    }
    return item.trim();
  });
}

function parseImportPayload(body: unknown): ImportSongPayload[] {
  if (!Array.isArray(body)) {
    throw new Error("Expected a JSON array of songs");
  }

  return body.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Item ${index}: expected an object`);
    }

    const { title, artist, genre, primary_genre, primaryGenre, subgenres, features } =
      item as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      throw new Error(`Item ${index}: title is required`);
    }
    if (typeof artist !== "string" || !artist.trim()) {
      throw new Error(`Item ${index}: artist is required`);
    }
    if (genre !== undefined && typeof genre !== "string") {
      throw new Error(`Item ${index}: genre must be a string`);
    }
    const resolvedPrimary =
      typeof primary_genre === "string"
        ? primary_genre.trim()
        : typeof primaryGenre === "string"
          ? primaryGenre.trim()
          : typeof genre === "string"
            ? genre.trim()
            : undefined;

    if (primary_genre !== undefined && typeof primary_genre !== "string") {
      throw new Error(`Item ${index}: primary_genre must be a string`);
    }
    if (primaryGenre !== undefined && typeof primaryGenre !== "string") {
      throw new Error(`Item ${index}: primaryGenre must be a string`);
    }
    if (subgenres !== undefined && !Array.isArray(subgenres)) {
      throw new Error(`Item ${index}: subgenres must be an array`);
    }
    if (!features || typeof features !== "object") {
      throw new Error(`Item ${index}: features object is required`);
    }

    normalizeFeatures(features as ImportSongPayload["features"]);
    const parsedSubgenres = parseSubgenresField(subgenres, index) ?? [];

    return {
      title: title.trim(),
      artist: artist.trim(),
      genre: resolvedPrimary ?? (typeof genre === "string" ? genre.trim() : undefined),
      primaryGenre: resolvedPrimary,
      subgenres: parsedSubgenres,
      features: features as ImportSongPayload["features"],
    };
  });
}

async function insertSong(entry: ImportSongPayload) {
  const primaryGenre = entry.primaryGenre ?? entry.genre;
  const [song] = await db
    .insert(songs)
    .values({
      title: entry.title,
      artist: entry.artist,
      genre: primaryGenre,
      primaryGenre,
      subgenres: entry.subgenres ?? [],
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
    const { title, artist, genre, primaryGenre, subgenres, features } = req.body;
    const song = await insertSong({
      title,
      artist,
      genre,
      primaryGenre,
      subgenres,
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

router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, artist, genre, primaryGenre, subgenres } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (typeof artist !== "string" || !artist.trim()) {
      res.status(400).json({ error: "artist is required" });
      return;
    }
    if (genre !== undefined && typeof genre !== "string") {
      res.status(400).json({ error: "genre must be a string" });
      return;
    }
    if (primaryGenre !== undefined && typeof primaryGenre !== "string") {
      res.status(400).json({ error: "primaryGenre must be a string" });
      return;
    }
    if (subgenres !== undefined && !Array.isArray(subgenres)) {
      res.status(400).json({ error: "subgenres must be an array" });
      return;
    }

    const resolvedPrimary =
      typeof primaryGenre === "string"
        ? primaryGenre.trim()
        : typeof genre === "string"
          ? genre.trim()
          : undefined;

    const parsedSubgenres =
      subgenres === undefined
        ? undefined
        : subgenres.map((item, i) => {
            if (typeof item !== "string" || !item.trim()) {
              throw new Error(`subgenres[${i}] must be a non-empty string`);
            }
            return item.trim();
          });

    const [existing] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Song not found" });
      return;
    }

    const [song] = await db
      .update(songs)
      .set({
        title: title.trim(),
        artist: artist.trim(),
        genre: resolvedPrimary ?? existing.genre,
        primaryGenre: resolvedPrimary ?? existing.primaryGenre,
        subgenres: parsedSubgenres ?? existing.subgenres,
      })
      .where(eq(songs.id, id))
      .returning();

    res.json(formatSong(song));
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Invalid update payload",
    });
  }
});

router.delete("/:id", async (req, res) => {
  await db.delete(songs).where(eq(songs.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
