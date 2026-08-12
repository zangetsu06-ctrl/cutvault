import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// "Database" — in-memory array. Replace with a real DB (Postgres/Mongo) later
// by swapping out the functions in this section; the route handlers below
// don't need to change since they only talk to these helper functions.
// ---------------------------------------------------------------------------

const CATEGORIES = ['Raw Footage', 'B-Roll', 'Music', 'SFX', 'Graphics', 'Other'];

let assets = [
  {
    id: randomUUID(),
    title: 'Drone Sunset Over City',
    category: 'Raw Footage',
    duration: 184,
    fileSize: 2450,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: randomUUID(),
    title: 'Ambient Piano Loop',
    category: 'Music',
    duration: 96,
    fileSize: 8.2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: randomUUID(),
    title: 'Whoosh Transition Pack',
    category: 'SFX',
    duration: 3,
    fileSize: 1.1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

function findAsset(id) {
  return assets.find((a) => a.id === id);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateAssetPayload(body, { partial = false } = {}) {
  const errors = {};
  const clean = {};

  // title
  if (!partial || body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      errors.title = 'Title is required.';
    } else if (title.length < 2) {
      errors.title = 'Title must be at least 2 characters.';
    } else if (title.length > 120) {
      errors.title = 'Title must be under 120 characters.';
    } else {
      clean.title = title;
    }
  }

  // category
  if (!partial || body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) {
      errors.category = `Category must be one of: ${CATEGORIES.join(', ')}.`;
    } else {
      clean.category = body.category;
    }
  }

  // duration (seconds)
  if (!partial || body.duration !== undefined) {
    const duration = Number(body.duration);
    if (Number.isNaN(duration) || duration < 0) {
      errors.duration = 'Duration must be a number ≥ 0 (seconds).';
    } else {
      clean.duration = duration;
    }
  }

  // fileSize (MB)
  if (!partial || body.fileSize !== undefined) {
    const fileSize = Number(body.fileSize);
    if (Number.isNaN(fileSize) || fileSize < 0) {
      errors.fileSize = 'File size must be a number ≥ 0 (MB).';
    } else {
      clean.fileSize = fileSize;
    }
  }

  return { errors, clean, isValid: Object.keys(errors).length === 0 };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/assets?search=&category=
app.get('/api/assets', (req, res) => {
  const { search = '', category = '' } = req.query;

  let result = [...assets];

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((a) => a.title.toLowerCase().includes(q));
  }

  if (category.trim()) {
    result = result.filter((a) => a.category === category);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ data: result, meta: { total: result.length, categories: CATEGORIES } });
});

// GET /api/assets/:id
app.get('/api/assets/:id', (req, res) => {
  const asset = findAsset(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found.' });
  }
  res.json({ data: asset });
});

// POST /api/assets
app.post('/api/assets', (req, res) => {
  const { errors, clean, isValid } = validateAssetPayload(req.body);

  if (!isValid) {
    return res.status(400).json({ error: 'Validation failed.', fields: errors });
  }

  const newAsset = {
    id: randomUUID(),
    ...clean,
    createdAt: new Date().toISOString(),
  };

  assets.push(newAsset);
  res.status(201).json({ data: newAsset });
});

// PUT/PATCH /api/assets/:id
function updateHandler(req, res) {
  const asset = findAsset(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found.' });
  }

  const isPartial = req.method === 'PATCH';
  const { errors, clean, isValid } = validateAssetPayload(req.body, { partial: isPartial });

  if (!isValid) {
    return res.status(400).json({ error: 'Validation failed.', fields: errors });
  }

  Object.assign(asset, clean);
  res.json({ data: asset });
}

app.put('/api/assets/:id', updateHandler);
app.patch('/api/assets/:id', updateHandler);

// DELETE /api/assets/:id
app.delete('/api/assets/:id', (req, res) => {
  const index = assets.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Asset not found.' });
  }
  const [removed] = assets.splice(index, 1);
  res.json({ data: removed });
});

// 404 fallback for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.listen(PORT, () => {
  console.log(`Cut Vault API listening on http://localhost:${PORT}`);
});
