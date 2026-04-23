# Hype Billboard

> A tech video billboard that cuts through the noise. The backend acts as a smart filter on raw YouTube data — calculating a **Hype Level** for each video and surfacing the **Crown Jewel** (highest hype) in the UI.

![Hype Billboard preview](.github/preview.png)

## Stack

| Layer | Tech |
|---|---|
| Backend | NestJS · TypeScript · class-validator · Swagger |
| Frontend | React · Vite · TypeScript · react-i18next |
| DevOps | Docker · Docker Compose |
| Testing | Jest (backend) · Vitest + RTL (frontend) |

---

## Quick start with Docker (recommended)

> Requires Docker and Docker Compose installed.

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:80 |
| Backend API | http://localhost:3000/api/videos |
| Swagger docs | http://localhost:3000/api/docs |
| Health check | http://localhost:3000/health |

---

## Manual setup

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

Backend runs on **http://localhost:3000**

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## API Reference

### `GET /api/videos`

Returns a cleaned, hype-scored video feed.

| Param | Type | Default | Description |
|---|---|---|---|
| `sort` | `hype` \| `date` | `hype` | Sort order |
| `limit` | `1–50` | — | Max results to return |
| `lang` | `es` \| `en` | `es` | Language for relative dates |

**Example response:**
```json
{
  "data": [
    {
      "id": "vid_003",
      "title": "TailwindCSS errores comunes - Tutorial",
      "author": "JuniorDev99",
      "thumbnail": "https://...",
      "publishedAt": "Hace 2 años",
      "hypeLevel": 0.3079,
      "isCrown": true
    }
  ],
  "meta": { "timestamp": "2026-04-22T...", "count": 50 },
  "status": "success"
}
```

### `GET /health`

```json
{ "data": { "status": "ok", "uptime": 42.3 }, "status": "success" }
```

---

## Running tests

### Backend (unit + e2e)

```bash
cd backend
npm run test          # unit tests
npm run test:e2e      # end-to-end tests
npm run test:cov      # coverage report
```

### Frontend

```bash
cd frontend
npm run test          # watch mode
npm run test:run      # single run
```

---

## Hype Level formula

```
hypeLevel = (likes + comments) / views
```

**Modifiers:**
- Title contains `tutorial` (case-insensitive) → `hypeLevel × 2`
- `commentCount` field absent → `hypeLevel = 0`
- `viewCount = 0` → `hypeLevel = 0` (avoids division by zero)
