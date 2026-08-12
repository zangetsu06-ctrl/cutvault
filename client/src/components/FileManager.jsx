import { useState, useEffect } from 'react';
import { 
  fetchAssets, 
  createAsset, 
  deleteAsset, 
  downloadAsset, 
  ASSET_CATEGORIES 
} from '../api/assets';

export default function FileManager() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(ASSET_CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch assets whenever search or category filters change
  const loadAssets = async () => {
    try {
      setError('');
      const data = await fetchAssets({ search, category });
      setAssets(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  // Handle File Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);

      await createAsset(formData);
      setFile(null);
      e.target.reset();
      await loadAssets();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await deleteAsset(id);
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Download
  const handleDownload = async (id, name) => {
    try {
      await downloadAsset(id, name);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">CutVault Assets</h1>

      {error && <div className="p-3 mb-4 text-red-700 bg-red-100 rounded">{error}</div>}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="p-4 mb-6 border rounded bg-gray-50 flex flex-wrap gap-4 items-center">
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files[0])} 
          required 
          className="border p-2 rounded flex-1"
        />
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border p-2 rounded"
        >
          {ASSET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button 
          type="submit" 
          disabled={loading || !file} 
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload Asset'}
        </button>
      </form>

      {/* Search & Filter Controls */}
      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search assets..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="border p-2 rounded flex-1"
        />
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)} 
          className="border p-2 rounded"
        >
          <option value="">All Categories</option>
          {ASSET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Assets Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="border p-4 rounded shadow-sm bg-white flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded">{asset.category || 'Other'}</span>
              <h3 className="font-bold text-lg mt-2 truncate" title={asset.original_name}>
                {asset.original_name}
              </h3>
              <p className="text-sm text-gray-500">{(asset.file_size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <div className="flex justify-between items-center mt-4 pt-2 border-t">
              <button 
                onClick={() => handleDownload(asset.id, asset.original_name)} 
                className="text-blue-600 hover:underline font-medium text-sm"
              >
                Download
              </button>
              <button 
                onClick={() => handleDelete(asset.id)} 
                className="text-red-600 hover:underline font-medium text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {assets.length === 0 && (
          <p className="col-span-full text-center text-gray-500 py-8">No assets found.</p>
        )}
      </div>
    </div>
  );
}