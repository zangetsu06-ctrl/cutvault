const API_URL = 'http://localhost/cutvault/api/assets.php';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const ASSET_CATEGORIES = [
  'Raw Footage',
  'B-Roll',
  'Music',
  'SFX',
  'Graphics',
  'Other',
];

export async function fetchAssets({ search = '', category = '' } = {}) {
  const params = new URLSearchParams();
  params.append('action', 'list');
  
  if (search) {
    params.append('search', search);
  }
  
  if (category && category !== 'All Assets') {
    params.append('category', category);
  }

  const response = await fetch(`${API_URL}?${params.toString()}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(errorData.error || 'Failed to fetch assets', response.status);
  }

  return response.json();
}

export async function createAsset(payload) {
  // Real File Upload using FormData
  if (payload.file) {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('category', payload.category || 'Other');
    if (payload.title) formData.append('title', payload.title);
    if (payload.duration) formData.append('duration', payload.duration);

    const res = await fetch(`${API_URL}?action=upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'Upload failed', res.status);
    return data.data;
  }

  // Fallback Metadata Create
  const res = await fetch(`${API_URL}?action=create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || 'Create failed', res.status);
  return data.data;
}

export async function updateAsset(id, payload) {
  const res = await fetch(`${API_URL}?action=update&id=${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || 'Update failed', res.status);
  return data.data;
}

export async function deleteAsset(id) {
  const res = await fetch(`${API_URL}?action=delete&id=${id}`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || 'Delete failed', res.status);
  return data.data;
}