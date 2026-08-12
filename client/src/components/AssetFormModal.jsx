/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { ASSET_CATEGORIES } from '../api/assets';

export default function AssetFormModal({
  open,
  mode = 'create',
  initialAsset = null,
  onClose,
  onSubmit,
  submitting,
}) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('B-Roll');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    if (initialAsset && mode === 'edit') {
      setTitle(initialAsset.title || initialAsset.original_name || '');
      setCategory(initialAsset.category || 'B-Roll');
      setDuration(initialAsset.duration || '');
      setFile(null);
    } else {
      setTitle('');
      setCategory('B-Roll');
      setDuration('');
      setFile(null);
    }
  }, [initialAsset, mode, open]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }

      // Auto-detect audio/video duration if supported
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration) {
          setDuration(Math.round(video.duration));
        }
      };
      video.src = URL.createObjectURL(selectedFile);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'create' && !file) {
      alert('Please select a file to upload.');
      return;
    }

    onSubmit({
      file,
      title,
      category,
      duration: duration ? parseInt(duration, 10) : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white">
            {mode === 'edit' ? 'Edit Asset' : 'Upload New Asset'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {mode === 'create' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Select Asset File (.mp4, .mp3, .mov, .png, etc.)
              </label>
              <input
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={handleFileChange}
                required={mode === 'create'}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300">
              Title / Asset Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Drone Sunset Shot"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Duration (sec)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Auto-detected or sec"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
            >
              {submitting
                ? 'Uploading...'
                : mode === 'edit'
                ? 'Save Changes'
                : 'Upload Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}