# Cut Vault — Video Asset Library (Full CRUD)

A production-ready CRUD app for managing video assets.

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express (in-memory data store)
- **Entity:** `Asset` — `{ id, title, category, duration, fileSize, createdAt }`

```
cutvault/
├── server/     Express REST API (port 4000)
└── client/     React + Vite + Tailwind app (port 5173)
```

## 1. Run the backend

```bash
cd server
npm install
npm run dev        # or: npm start
```

The API starts on **http://localhost:4000** and seeds itself with 3 sample assets.

## 2. Run the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies any `/api/*` request
to `http://localhost:4000`, so no extra config is needed.

## 3. Test the CRUD flow

1. Click **+ Add Asset**, submit the empty form → inline validation errors appear
   for Title, Category, Duration, and File Size.
2. Fill it out correctly and submit → a success toast appears and the card shows
   up instantly at the top of the list (no page reload).
3. Click **Edit** on a card, change a field, save → the card updates in place.
4. Click **Delete** → a confirmation dialog appears; confirming removes the card
   and shows a toast.
5. Use the **search box** and **category dropdown** to filter; clearing all
   assets (or filtering to zero results) shows the empty-state placeholder.
6. Stop the backend server and refresh the page → a friendly error state with a
   **Retry** button is shown instead of a blank screen or console-only error.

## API Reference

| Method | Endpoint            | Description                                  |
|--------|----------------------|-----------------------------------------------|
| GET    | `/api/assets`         | List assets. Query params: `search`, `category` |
| GET    | `/api/assets/:id`     | Get a single asset                            |
| POST   | `/api/assets`         | Create an asset                               |
| PATCH  | `/api/assets/:id`     | Partially update an asset                     |
| PUT    | `/api/assets/:id`     | Update an asset (same handler as PATCH)       |
| DELETE | `/api/assets/:id`     | Delete an asset                               |

### Asset schema

```ts
{
  id: string;          // UUID, server-generated
  title: string;        // required, 2–120 chars
  category: "Raw Footage" | "B-Roll" | "Music" | "SFX" | "Graphics" | "Other";
  duration: number;     // seconds, >= 0
  fileSize: number;     // MB, >= 0
  createdAt: string;    // ISO timestamp, server-generated
}
```

### Error response shape (400)

```json
{
  "error": "Validation failed.",
  "fields": {
    "title": "Title is required.",
    "duration": "Duration must be a number ≥ 0 (seconds)."
  }
}
```

## Swapping in a real database

The in-memory array lives entirely inside `server/index.js` behind three small
touchpoints: the `assets` array, `findAsset()`, and the route handlers. To move
to Postgres/Mongo/etc., replace those three pieces with real queries — the
route/validation/response logic doesn't need to change.
