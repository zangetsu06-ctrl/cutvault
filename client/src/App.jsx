import { useCallback, useEffect, useState } from 'react';
import { ToastProvider } from './components/Toast';
import { useToast } from './components/useToast';
import AssetFormModal from './components/AssetFormModal';
import ConfirmDialog from './components/ConfirmDialog';
import EmptyState from './components/EmptyState';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import { checkMeApi, logoutApi } from './api/auth';
import {
  ApiError,
  ASSET_CATEGORIES,
  createAsset,
  deleteAsset,
  fetchAssets,
  updateAsset,
} from './api/assets';

function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSize(bytes) {
  const num = Number(bytes) || 0;
  if (num >= 1073741824) return `${(num / 1073741824).toFixed(2)} GB`;
  if (num >= 1048576) return `${(num / 1048576).toFixed(1)} MB`;
  if (num >= 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${num} B`;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function getFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('image/')) return '🖼️';
  return '📄';
}

function getCategoryColor(category) {
  const colors = {
    'Raw Footage': 'bg-blue-50 text-blue-700 border-blue-200',
    'B-Roll': 'bg-amber-50 text-amber-700 border-amber-200',
    'Music': 'bg-purple-50 text-purple-700 border-purple-200',
    'SFX': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Graphics': 'bg-rose-50 text-rose-700 border-rose-200',
    'Other': 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return colors[category] || colors['Other'];
}

function AppContent() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [activeAsset, setActiveAsset] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    checkMeApi()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  const loadAssets = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await fetchAssets({ search, category });
      setAssets(Array.isArray(data) ? data : []);
    } catch (err) {
      setAssets([]);
      if (err?.status === 401) {
        setCurrentUser(null);
        toast.error('Session expired. Please sign in again.');
      } else {
        const message = err instanceof ApiError ? err.message : 'Could not load assets.';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, [search, category, currentUser, toast]);

  useEffect(() => {
    if (currentUser) {
      const timeout = setTimeout(loadAssets, 250);
      return () => clearTimeout(timeout);
    }
  }, [loadAssets, currentUser]);

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
    setShowAuth(false);
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setActiveAsset(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    try {
      if (modalMode === 'edit' && activeAsset) {
        const updated = await updateAsset(activeAsset.id, payload);
        setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toast.success(`"${updated.title || updated.original_name}" updated.`);
      } else {
        const created = await createAsset(payload);
        setAssets((prev) => [created, ...prev]);
        toast.success(`"${created.title || created.original_name}" added.`);
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAsset(pendingDelete.id);
      setAssets((prev) =>
        prev.filter((asset) => String(asset.id) !== String(pendingDelete.id))
      );
      toast.success(`"${pendingDelete.title || pendingDelete.original_name}" deleted.`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete asset.');
    } finally {
      setDeleting(false);
    }
  };

  const safeAssets = Array.isArray(assets) ? assets : [];
  const isAdmin = currentUser?.role === 'admin';
  const activeCategory = category || 'All Assets';
  const assetCount = safeAssets.length;

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <p className="mt-4 text-sm text-slate-500">Loading CutVault...</p>
        </div>
      </div>
    );
  }

  if (!currentUser && !showAuth) {
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="h-6 w-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span className="text-lg font-semibold text-slate-900">CutVault</span>
            </div>
            {isAdmin && (
              <span className="hidden rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 sm:inline-block">
                Admin
              </span>
            )}
          </div>

          <div className="hidden flex-1 max-w-md mx-4 lg:block">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 active:scale-95 transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Asset
              </button>
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white lg:block">
          <nav className="sticky top-14 p-4">
            <div className="mb-4">
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Categories
              </h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => setCategory('')}
                  className={`w-full rounded-md px-2 py-1.5 text-sm text-left transition-colors ${
                    category === ''
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  All Assets
                  <span className="float-right text-xs text-slate-400 mt-0.5">{assetCount}</span>
                </button>
                {ASSET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`w-full rounded-md px-2 py-1.5 text-sm text-left transition-colors ${
                      category === cat
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="border-b border-slate-200 bg-white p-4 lg:hidden">
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setCategory('')}
                className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
                  category === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                All
              </button>
              {ASSET_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
                    category === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{activeCategory}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{assetCount} asset{assetCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-lg border border-slate-200 p-0.5 sm:flex">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-6">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video rounded-lg bg-slate-100" />
                    <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
                    <div className="mt-1 h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : safeAssets.length === 0 ? (
              <EmptyState
                hasFilters={Boolean(search || category)}
                onClearFilters={() => {
                  setSearch('');
                  setCategory('');
                }}
                onAdd={handleOpenCreateModal}
                isAdmin={isAdmin}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {safeAssets.map((asset) => {
                  const displayTitle = asset.title || asset.original_name || 'Untitled';
                  const displaySize = asset.fileSize ?? asset.file_size ?? 0;
                  const fileIcon = getFileIcon(asset.mime_type);
                  const catColor = getCategoryColor(asset.category);

                  return (
                    <div key={asset.id} className="group relative rounded-lg border border-slate-200 bg-white card-hover">
                      <div className="relative aspect-video overflow-hidden rounded-t-lg bg-slate-100">
                        <div className="flex h-full items-center justify-center text-4xl text-slate-300">
                          {fileIcon}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-all group-hover:bg-slate-900/10">
                          <button
                            onClick={() => {
                              toast.success(`Starting download for "${displayTitle}"`);
                              window.open(`http://localhost/cutvault/api/assets.php?action=download&id=${asset.id}`, '_blank');
                            }}
                            className="rounded-full bg-white/90 p-2.5 opacity-0 shadow-lg transition-all hover:bg-white hover:scale-110 group-hover:opacity-100"
                          >
                            <svg className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        </div>
                        <span className={`absolute left-2 top-2 rounded border px-1.5 py-0.5 text-[10px] font-medium ${catColor}`}>
                          {asset.category}
                        </span>
                        {asset.duration > 0 && (
                          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            {formatDuration(asset.duration)}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-medium text-slate-900 truncate" title={displayTitle}>
                          {displayTitle}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                          <span>{formatSize(displaySize)}</span>
                          {asset.uploaded_at && (
                            <>
                              <span>·</span>
                              <span>{formatDate(asset.uploaded_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setModalMode('edit');
                              setActiveAsset(asset);
                              setModalOpen(true);
                            }}
                            className="rounded bg-white/90 p-1 shadow hover:bg-white"
                            title="Edit"
                          >
                            <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setPendingDelete(asset)}
                            className="rounded bg-white/90 p-1 shadow hover:bg-white"
                            title="Delete"
                          >
                            <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {safeAssets.map((asset) => {
                      const displayTitle = asset.title || asset.original_name || 'Untitled';
                      const displaySize = asset.fileSize ?? asset.file_size ?? 0;
                      const catColor = getCategoryColor(asset.category);

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{getFileIcon(asset.mime_type)}</span>
                              <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{displayTitle}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${catColor}`}>{asset.category}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatSize(displaySize)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDuration(asset.duration)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(asset.uploaded_at)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  toast.success(`Starting download for "${displayTitle}"`);
                                  window.open(`http://localhost/cutvault/api/assets.php?action=download&id=${asset.id}`, '_blank');
                                }}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => {
                                      setModalMode('edit');
                                      setActiveAsset(asset);
                                      setModalOpen(true);
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setPendingDelete(asset)}
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      <AssetFormModal
        open={modalOpen}
        mode={modalMode}
        initialAsset={activeAsset}
        onClose={() => setModalOpen(false)}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete asset?"
        message={pendingDelete ? `Are you sure you want to delete "${pendingDelete.title || pendingDelete.original_name}"? This action cannot be undone.` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}