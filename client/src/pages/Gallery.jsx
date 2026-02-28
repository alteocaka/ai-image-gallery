import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import UserMenu from '@/components/UserMenu';
import SearchBar from '@/components/SearchBar';
import ColorFilter from '@/components/ColorFilter';
import UploadZone from '@/components/UploadZone';
import ImageGrid from '@/components/ImageGrid';
import { api } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Gallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [gridRefreshKey, setGridRefreshKey] = useState(0);
  const [availableColors, setAvailableColors] = useState([]);
  const [similarImages, setSimilarImages] = useState([]);
  const [similarToImageId, setSimilarToImageId] = useState(null);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState(null);
  const [gridLoading, setGridLoading] = useState(true);

  // Verify backend session (JWT round-trip) when logged in
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    api('/auth/session')
      .then((data) => console.log('Backend session OK:', data))
      .catch((err) => console.warn('Backend session failed:', err?.body ?? err.message));
  }, []);

  function handleClearFilters() {
    setSearchQuery('');
    setSelectedColor(null);
  }

  const hasActiveFilters = searchQuery.trim() !== '' || selectedColor !== null;

  function handleUploaded() {
    setGridRefreshKey((k) => k + 1);
  }

  async function handleFindSimilar(imageId) {
    setSimilarLoading(true);
    setSimilarToImageId(imageId);
    setSimilarImages([]);
    setSimilarError(null);
    try {
      const data = await api(`/search/similar/${imageId}`);
      setSimilarImages(Array.isArray(data.images) ? data.images : []);
    } catch (err) {
      setSimilarError(err?.body?.error || err.message || 'Failed to load similar images');
      setSimilarImages([]);
    } finally {
      setSimilarLoading(false);
    }
  }

  function handleClearSimilar() {
    setSimilarToImageId(null);
    setSimilarImages([]);
    setSimilarError(null);
  }

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <h1 className="gallery-title">🖼️ AI Image Gallery</h1>
        <div className="gallery-header-actions">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="gallery-main">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <ColorFilter
          selectedColor={selectedColor}
          colors={availableColors}
          onSelectColor={setSelectedColor}
          loading={gridLoading && !similarToImageId}
        />
        <UploadZone onUploaded={handleUploaded} />
        <ImageGrid
          searchQuery={searchQuery}
          selectedColor={selectedColor}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
          refreshKey={gridRefreshKey}
          onColorsChange={setAvailableColors}
          onLoadingChange={setGridLoading}
          similarImages={similarImages}
          similarToImageId={similarToImageId}
          similarLoading={similarLoading}
          similarError={similarError}
          onFindSimilar={handleFindSimilar}
          onClearSimilar={handleClearSimilar}
          onRetrySimilar={() => similarToImageId && handleFindSimilar(similarToImageId)}
          onDeletedFromSimilar={(id) =>
            setSimilarImages((prev) => prev.filter((img) => img.id !== id))
          }
          onSimilarImageUpdated={(id, payload) =>
            setSimilarImages((prev) =>
              prev.map((img) => (img.id === id ? { ...img, ...payload } : img))
            )
          }
        />
      </main>
    </div>
  );
}
