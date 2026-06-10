# Music Recommender

Full-stack music recommendation app with two vector search backends:

- **Library (pgvector)** — songs stored in PostgreSQL as 5-dimensional audio feature vectors; similar tracks found via cosine distance in SQL.
- **Qdrant Search** — optional test page for searching a Qdrant collection (local Docker or Qdrant Cloud), including 512D audio embedding collections from external pipelines.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (22 recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (PostgreSQL + pgvector; optional local Qdrant)
- npm

## Project structure

```
music-rec-app/
├── client/                 # React + Vite + Tailwind (port 5173)
│   └── src/
│       ├── pages/          # HomePage (library), QdrantSearchPage
│       └── components/     # SongLibrary, RecommendPanel, SongCard, etc.
├── server/                 # Express API (port 3001)
│   └── src/
│       ├── routes/         # songs, recommendations, qdrant
│       ├── services/       # vectorSearch (pgvector), qdrantSearch
│       └── db/             # Drizzle schema + migrations
├── docker-compose.yml      # PostgreSQL (pgvector) + Qdrant
├── .env.example
└── package.json            # monorepo scripts
```

## Local setup

### 1. Install dependencies

```bash
cd music-rec-app
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. Configure environment

Copy the example env file into the server directory:

```bash
# macOS / Linux
cp .env.example server/.env

# Windows (PowerShell)
Copy-Item .env.example server/.env
```

Minimum required variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/music_recommender
PORT=3001
```

If your Postgres container uses a different password (see `POSTGRES_PASSWORD` in `docker-compose.yml`), update `DATABASE_URL` to match.

Optional Qdrant variables (for the **Qdrant Search** page):

```env
# Local Qdrant from docker-compose
QDRANT_URL=http://localhost:6333

# Qdrant Cloud — takes precedence over QDRANT_URL when both endpoint and API key are set
QDRANT_CLUSTER_ENDPOINT=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-api-key
QDRANT_COLLECTION_NAME=song_embeddings
```

### 3. Start Docker services

```bash
npm run db:up
```

This starts:

| Service   | Port(s)   | Purpose                          |
| --------- | --------- | -------------------------------- |
| `db`      | `5432`    | PostgreSQL with pgvector         |
| `qdrant`  | `6333`    | Local Qdrant (optional)          |

Verify containers are running:

```bash
docker ps
```

You should see port mappings like `0.0.0.0:5432->5432/tcp` and `0.0.0.0:6333->6333/tcp`.

### 4. Run migrations

```bash
npm run db:migrate
```

If migration fails because the vector extension is missing:

```bash
docker exec music-rec-app-db-1 psql -U postgres -d music_recommender -c "CREATE EXTENSION IF NOT EXISTS vector;"
npm run db:migrate
```

### 5. Start the app

**All-in-one (recommended):**

```bash
npm run dev
```

This starts Docker (if needed), runs migrations, then launches the API and frontend together.

**Separate terminals:**

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

Open **http://localhost:5173**

The API runs at **http://localhost:3001** (the frontend calls it directly).

## Load your music library

### Import JSON (recommended)

Use the **Import JSON** panel in the UI, or POST directly:

```bash
curl -X POST http://localhost:3001/api/songs/import \
  -H "Content-Type: application/json" \
  -d @path/to/songs.json
```

Expected format:

```json
[
  {
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "genre": "Pop",
    "primary_genre": "Pop",
    "subgenres": ["Synth-pop", "New wave"],
    "features": {
      "tempo": 0.1867,
      "energy": 1.0,
      "danceability": 0.3249,
      "valence": 0.268,
      "acousticness": 0.5479,
      "bpm_raw": 86.1
    }
  }
]
```

- **Features** map to a 5D vector: `[tempo, energy, danceability, valence, acousticness]`.
- Features are **min-max normalized across each import batch** before storage.
- `bpm_raw` and other extra feature fields are ignored for search.
- `genre`, `primary_genre` / `primaryGenre`, and `subgenres` are optional metadata fields.

### Add songs manually

Use the collapsible **Add Song** form to set title, artist, genre, subgenres, and five feature sliders.

## Using the app

### Library page (`/`)

1. Add or import songs into the library.
2. **Search** the library by title, artist, genre, or subgenre.
3. Click **Find similar** on a song card, or **drag a card** onto the recommendations panel.
4. Use the **edit** button (three-line icon) to update metadata (title, artist, genre, subgenres). Audio features are not editable.
5. Adjust **Results (top K)** and **Sort by match** in the recommendations panel.

### Qdrant Search page (`/qdrant`)

Separate page for testing Qdrant vector search:

1. Check connection status and indexed point count at the top.
2. **Search** by title or artist (matches against Qdrant payload fields such as `song_id`, `filename`, `genre`).
3. Click **Find similar** on a result to run cosine similarity in Qdrant.
4. **Sync from database** copies Postgres songs into Qdrant — only works when the target collection uses **5D** vectors (same as pgvector). It is disabled automatically for collections with other dimensions (e.g. 512D audio embeddings from an external scraper).

When using **Qdrant Cloud**, set `QDRANT_CLUSTER_ENDPOINT`, `QDRANT_API_KEY`, and `QDRANT_COLLECTION_NAME` in `server/.env`. Cloud config takes precedence over local `QDRANT_URL`.

## npm scripts

| Command                  | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `npm run dev`            | Start DB, migrate, server, and client              |
| `npm run dev:server`     | Start API only                                     |
| `npm run dev:client`     | Start frontend only                                |
| `npm run db:up`          | Start Docker containers (Postgres + Qdrant)        |
| `npm run db:migrate`     | Apply Drizzle migrations                           |
| `npm run db:generate`    | Generate a new migration after schema changes      |
| `npm run db:renormalize` | Re-normalize all stored pgvector embeddings in DB  |
| `npm run format`         | Format source files with Prettier                  |

Client-only (from `client/`):

| Command            | Description              |
| ------------------ | ------------------------ |
| `npm run build`    | Typecheck + production build |
| `npm run preview`  | Preview production build |

## API endpoints

### Songs

| Method   | Path                      | Description                              |
| -------- | ------------------------- | ---------------------------------------- |
| `GET`    | `/api/songs`              | List all songs                           |
| `POST`   | `/api/songs`              | Add a song                               |
| `PATCH`  | `/api/songs/:id`          | Update song metadata                     |
| `DELETE` | `/api/songs/:id`          | Delete one song                          |
| `POST`   | `/api/songs/import`       | Bulk import JSON array                   |
| `POST`   | `/api/songs/delete-all`   | Delete all songs                         |
| `POST`   | `/api/songs/renormalize`  | Re-normalize all pgvector embeddings     |

### Recommendations (pgvector)

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| `GET`  | `/api/recommendations/:id?topK=5` | Similar songs by Postgres song ID    |
| `POST` | `/api/recommendations`            | Similar songs by feature vector body |

### Qdrant

| Method | Path                              | Description                                      |
| ------ | --------------------------------- | ------------------------------------------------ |
| `GET`  | `/api/qdrant/status`              | Connection info, collection name, point count    |
| `POST` | `/api/qdrant/sync`                | Upsert Postgres songs into Qdrant (5D only)      |
| `GET`  | `/api/qdrant/search?q=...&limit=10` | Text search over Qdrant payloads               |
| `GET`  | `/api/qdrant/similar/:id?topK=5`  | Vector similarity by Postgres ID or Qdrant point ID |

## Troubleshooting

### `ECONNREFUSED` on port 5432

- Ensure Docker Desktop is running.
- Run `npm run db:up` and confirm port `5432` is published (`docker ps`).

### API returns 404 for new routes

A stale server process may still be bound to port 3001. Stop it and restart:

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }
npm run dev:server
```

Restart the server after any backend route or env changes.

### Songs look too similar (pgvector)

Re-import your JSON (features are normalized per batch) or run:

```bash
npm run db:renormalize
```

### Qdrant Search returns no results

- Confirm **Qdrant Search** shows “connected” and a non-zero point count.
- Check `QDRANT_COLLECTION_NAME` matches your collection.
- Payload field names must be searchable (`song_id`, `title`, `artist`, etc.). Collections from external tools may use formats like `"Artist - Title"` in a `song_id` field rather than separate title/artist columns.
- **Sync from database** only applies to 5D collections; do not use it to overwrite 512D embedding collections.

### Sharing the app temporarily

The frontend calls `http://localhost:3001` directly. To share with someone outside your machine you need a tunnel (e.g. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) or ngrok) and either tunnel both ports or proxy `/api` through Vite so a single public URL serves frontend and API together.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express 5, TypeScript
- **Database:** PostgreSQL 16 + pgvector (Docker)
- **Vector search:** pgvector (5D feature cosine similarity), Qdrant (optional, local or cloud)
- **ORM:** Drizzle
