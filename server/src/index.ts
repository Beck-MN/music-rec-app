import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db";
import songsRouter from "./routes/songs";
import recommendationsRouter from "./routes/recommendations";
import qdrantRouter from "./routes/qdrant";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/songs", songsRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/qdrant", qdrantRouter);

const PORT = process.env.PORT || 3001;

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
