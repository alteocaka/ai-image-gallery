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
    try {
      const data = await api(`/search/similar/${imageId}`);
      setSimilarImages(Array.isArray(data.images) ? data.images : []);
    } catch (err) {
      console.error('Find similar failed', err);
      setSimilarImages([]);
    } finally {
      setSimilarLoading(false);
    }
  }

  function handleClearSimilar() {
    setSimilarToImageId(null);
    setSimilarImages([]);
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
        />
        <UploadZone onUploaded={handleUploaded} />
        <ImageGrid
          searchQuery={searchQuery}
          selectedColor={selectedColor}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
          refreshKey={gridRefreshKey}
          onColorsChange={setAvailableColors}
          similarImages={similarImages}
          similarToImageId={similarToImageId}
          similarLoading={similarLoading}
          onFindSimilar={handleFindSimilar}
          onClearSimilar={handleClearSimilar}
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
