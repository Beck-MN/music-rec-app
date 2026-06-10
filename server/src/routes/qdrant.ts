import { Router } from "express";
import {
  getQdrantStatus,
  searchQdrantByText,
  searchQdrantSimilarByPointId,
  searchQdrantSimilarBySongId,
  syncSongsToQdrant,
} from "../services/qdrantSearch";

const router = Router();

router.get("/status", async (_req, res) => {
  const status = await getQdrantStatus();
  res.json(status);
});

router.post("/sync", async (_req, res) => {
  try {
    const result = await syncSongsToQdrant();
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to sync songs to Qdrant",
    });
  }
});

router.get("/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

  if (!query) {
    res.status(400).json({ error: "Query parameter q is required" });
    return;
  }

  try {
    const results = await searchQdrantByText(query, limit);
    res.json(results);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Qdrant search failed",
    });
  }
});

router.get("/similar/:id", async (req, res) => {
  const idParam = req.params.id;
  const topK = Math.min(50, Math.max(1, Number(req.query.topK) || 5));

  if (!idParam) {
    res.status(400).json({ error: "Invalid point id" });
    return;
  }

  try {
    const isNumeric = /^\d+$/.test(idParam);
    let result = isNumeric ? await searchQdrantSimilarBySongId(Number(idParam), topK) : null;
    if (!result) {
      result = await searchQdrantSimilarByPointId(idParam, topK);
    }
    if (!result) {
      res.status(404).json({ error: "Song not found in Qdrant" });
      return;
    }
    res.json(result.results);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Qdrant similarity search failed",
    });
  }
});

export default router;
