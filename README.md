# Music Recommender

Full-stack music recommendation app that stores songs as 5-dimensional audio feature vectors in PostgreSQL (pgvector) and finds similar tracks using cosine similarity.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (22 recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL + pgvector)
- npm

## Project structure

```
music-rec-app/
├── client/          # React + Vite frontend (port 5173)
├── server/          # Express API (port 3001)
├── docker-compose.yml
└── package.json     # monorepo scripts
```

## Local setup

### 1. Clone and install dependencies

```bash
cd music-rec-app
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. Configure environment variables

Copy the example env file for the server:

```bash
cp .env.example server/.env
```

Default values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/music_recommender
PORT=3001
```

### 3. Start the database

```bash
npm run db:up
```

This starts PostgreSQL with the pgvector extension in Docker on port `5432`.

Verify the container is running and port mapping looks correct:

```bash
docker ps
```

You should see `0.0.0.0:5432->5432/tcp` on the db container.

### 4. Run migrations

```bash
npm run db:migrate
```

If migration fails because the vector extension is missing, enable it once:

```bash
docker exec music-rec-app-db-1 psql -U postgres -d music_recommender -c "CREATE EXTENSION IF NOT EXISTS vector;"
npm run db:migrate
```

### 5. Start the app

**Option A — start everything at once:**

```bash
npm run dev
```

**Option B — start in separate terminals:**

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

Open the app at **http://localhost:5173**

The API runs at **http://localhost:3001**

## Load your music library

### Import a JSON file (recommended)

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

Features are min-max normalized across the batch on import. Extra fields like `bpm_raw` are ignored for vector search.

### Add songs manually

Use the **Add Song** form to set title, artist, genre, and five audio feature sliders.

## Using the app

1. Add or import songs into the library.
2. Click **Find similar** on any song card.
3. Adjust **Results (top K)** and **Sort by match** in the recommendations panel.

## Useful scripts

| Command                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `npm run dev`            | Start DB, migrate, server, and client         |
| `npm run dev:server`     | Start API only                                |
| `npm run dev:client`     | Start frontend only                           |
| `npm run db:up`          | Start PostgreSQL container                    |
| `npm run db:migrate`     | Apply Drizzle migrations                      |
| `npm run db:generate`    | Generate a new migration after schema changes |
| `npm run db:renormalize` | Re-normalize all stored embeddings in the DB  |
| `npm run format`         | Format source files with Prettier             |

## API endpoints

| Method   | Path                              | Description                     |
| -------- | --------------------------------- | ------------------------------- |
| `GET`    | `/api/songs`                      | List all songs                  |
| `POST`   | `/api/songs`                      | Add a song                      |
| `POST`   | `/api/songs/import`               | Bulk import JSON array          |
| `POST`   | `/api/songs/delete-all`           | Delete all songs                |
| `DELETE` | `/api/songs/:id`                  | Delete one song                 |
| `POST`   | `/api/songs/renormalize`          | Re-normalize embeddings         |
| `GET`    | `/api/recommendations/:id?topK=5` | Similar songs by song ID        |
| `POST`   | `/api/recommendations`            | Similar songs by feature vector |

## Troubleshooting

### `ECONNREFUSED` on port 5432

- Make sure Docker Desktop is running.
- Run `npm run db:up` and confirm port `5432` is published (`docker ps`).

### API returns 404 for new routes

An old server process may still be bound to port 3001. Stop it and restart:

```powershell
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
npm run dev:server
```

### Songs look too similar

Re-import your JSON (features are normalized per batch) or run:

```bash
npm run db:renormalize
```

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL + pgvector (Docker)
- **ORM:** Drizzle
