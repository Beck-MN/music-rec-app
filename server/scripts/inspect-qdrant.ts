import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = process.env.QDRANT_COLLECTION_NAME || "songs";

async function main() {
  const cloudUrl = process.env.QDRANT_CLUSTER_ENDPOINT;
  const apiKey = process.env.QDRANT_API_KEY;
  const localUrl = process.env.QDRANT_URL || "http://localhost:6333";

  console.log("Collection:", COLLECTION);
  console.log("Using:", cloudUrl && apiKey ? cloudUrl : localUrl);

  const client =
    cloudUrl && apiKey
      ? new QdrantClient({ url: cloudUrl, apiKey })
      : new QdrantClient({ url: localUrl });

  const collections = await client.getCollections();
  console.log(
    "Collections:",
    collections.collections.map((c) => c.name)
  );

  const exists = collections.collections.some((c) => c.name === COLLECTION);
  if (!exists) {
    console.log("Collection not found!");
    return;
  }

  const info = await client.getCollection(COLLECTION);
  console.log("Points count:", info.points_count);
  console.log("Vector config:", JSON.stringify(info.config?.params?.vectors, null, 2));
  console.log("Payload indexes:", info.payload_schema);

  const { points } = await client.scroll(COLLECTION, {
    limit: 3,
    with_payload: true,
    with_vector: true,
  });

  console.log("\nSample points:");
  for (const p of points) {
    console.log(JSON.stringify({ id: p.id, payload: p.payload, vectorLen: Array.isArray(p.vector) ? p.vector.length : p.vector }, null, 2));
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
