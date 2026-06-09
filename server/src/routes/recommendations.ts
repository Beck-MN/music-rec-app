import { Router } from "express";
import { findSimilarSongs, findSimilarSongsById, featuresToVector } from "../services/vectorSearch";

const router = Router();

router.post("/", async (req, res) => {
  const { features, topK = 5, excludeId } = req.body;
  const vector = featuresToVector(features);
  const results = await findSimilarSongs(vector, topK, excludeId);
  res.json(results);
});

router.get("/:id", async (req, res) => {
  const topK = Number(req.query.topK ?? 5);
  const id = Number(req.params.id);

  const result = await findSimilarSongsById(id, topK);
  if (!result) {
    res.status(404).json({ error: "Song not found" });
    return;
  }

  res.json(result.results);
});

export default router;
