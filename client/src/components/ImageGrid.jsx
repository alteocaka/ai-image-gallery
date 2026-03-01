import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ImageModal from '@/components/ImageModal';
import { PER_PAGE } from '@/constants';

export default function ImageGrid({
  searchQuery = '',
  selectedColor = null,
  onClearFilters,
  hasActiveFilters = false,
  refreshKey = 0,
  onColorsChange,
  onLoadingChange,
  similarImages = [],
  similarToImageId = null,
  similarLoading = false,
  similarError = null,
  onFindSimilar,
  onClearSimilar,
  onRetrySimilar,
  onDeletedFromSimilar,
  onSimilarImageUpdated,
}) {
  function handleModalUpdated(id, payload) {
    setAllImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...payload } : img)));
    onSimilarImageUpdated?.(id, payload);
  }
  const [allImages, setAllImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPagesFromServer, setTotalPagesFromServer] = useState(1);

  const isSimilarMode = similarToImageId != null;

  const searchQ = searchQuery.trim();

  useEffect(() => {
    if (isSimilarMode) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let url;
        if (selectedColor) {
          url = `/search/color?color=${encodeURIComponent(selectedColor)}&page=${currentPage}&per_page=${PER_PAGE}`;
          console.log(
            '[ImageGrid] color filter: selectedColor (sent):',
            JSON.stringify(selectedColor),
            'url:',
            url
          );
        } else if (searchQ) {
          url = `/search/text?q=${encodeURIComponent(searchQ)}&page=${currentPage}&per_page=${PER_PAGE}`;
        } else {
          url = `/images?page=${currentPage}&per_page=${PER_PAGE}`;
        }
        const data = await api(url);
        if (cancelled) return;
        const images = Array.isArray(data.images) ? data.images : [];
        if (selectedColor) {
          console.log(
            '[ImageGrid] color response: images.length:',
            images.length,
            'totalPages:',
            data.totalPages
          );
          images.forEach((img, i) => {
            console.log(
              '[ImageGrid] color image',
              i + 1,
              'id:',
              img.id,
              'filename:',
              img.filename,
              'colors:',
              JSON.stringify(img.colors ?? [])
            );
          });
        } else {
          console.log('[ImageGrid] list/text response: images.length:', images.length);
          images.forEach((img, i) => {
            console.log(
              '[ImageGrid] image',
              i + 1,
              'id:',
              img.id,
              'filename:',
              img.filename,
              'colors:',
              JSON.stringify(img.colors ?? [])
            );
          });
        }
        setAllImages(images);
        setTotalPagesFromServer(data.totalPages || 1);
      } catch (err) {
        if (cancelled) return;
        const msg = err?.body?.error || err.message || 'Failed to load images.';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentPage, refreshKey, isSimilarMode, searchQ, selectedColor]);

  // Report loading state so parent can show color filter skeleton
  useEffect(() => {
    if (typeof onLoadingChange === 'function' && !isSimilarMode) {
      onLoadingChange(loading);
    }
  }, [loading, isSimilarMode, onLoadingChange]);

  // Derive available colors from gallery (only when no color filter — keep palette stable)
  useEffect(() => {
    if (typeof onColorsChange !== 'function' || selectedColor) return;
    const allColors = allImages
      .flatMap((img) => (Array.isArray(img.colors) ? img.colors : []))
      .filter(Boolean);
    const unique = Array.from(new Set(allColors.map((c) => c.toUpperCase())));
    onColorsChange(unique.slice(0, 24));
  }, [allImages, onColorsChange, selectedColor]);

  const hasColorFilter = !!selectedColor;
  const totalPages = totalPagesFromServer;
  const pageImages = allImages;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedColor]);

  // In similar mode: show similar list or loading/empty
  if (isSimilarMode) {
    if (similarLoading) {
      return (
        <div className="image-grid-wrap">
          <div className="image-grid image-grid--skeleton" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="image-grid-skeleton" />
            ))}
          </div>
        </div>
      );
    }
    return (
      <>
        <div className="similar-bar">
          <span className="similar-bar-label">Similar images</span>
          <button type="button" className="similar-bar-back" onClick={onClearSimilar}>
            Back to gallery
          </button>
        </div>
        <div className="image-grid-wrap">
          {similarError ? (
            <div className="image-grid-empty">
              <p>{similarError}</p>
              <div className="image-grid-empty-actions">
                {typeof onRetrySimilar === 'function' && (
                  <button type="button" className="image-grid-empty-clear" onClick={onRetrySimilar}>
                    Try again
                  </button>
                )}
                <button type="button" className="image-grid-empty-clear" onClick={onClearSimilar}>
                  Back to gallery
                </button>
              </div>
            </div>
          ) : similarImages.length === 0 ? (
            <div className="image-grid-empty">
              <p>No similar images found.</p>
              <button type="button" className="image-grid-empty-clear" onClick={onClearSimilar}>
                Back to gallery
              </button>
            </div>
          ) : (
            <ul className="image-grid" role="list">
              {similarImages.map((img) => (
                <li key={img.id} className="image-grid-item">
                  <button
                    type="button"
                    className="image-grid-thumb"
                    onClick={() => setSelected(img)}
                    aria-label={`View ${img.filename}`}
                  >
                    <img src={img.thumbnailUrl} alt="" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selected && (
          <ImageModal
            image={selected}
            onClose={() => setSelected(null)}
            onFindSimilar={
              onFindSimilar
                ? () => {
                    setSelected(null);
                    onFindSimilar(selected.id);
                  }
                : undefined
            }
            onUpdated={handleModalUpdated}
            onDeleted={(deletedId) => {
              setSelected(null);
              setAllImages((prev) => prev.filter((img) => img.id !== deletedId));
              onDeletedFromSimilar?.(deletedId);
            }}
          />
        )}
      </>
    );
  }

  if (loading && allImages.length === 0) {
    return (
      <div className="image-grid-wrap">
        <div className="image-grid image-grid--skeleton" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="image-grid-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="image-grid-wrap">
        <div className="image-grid-empty">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (pageImages.length === 0) {
    return (
      <div className="image-grid-wrap">
        <div className="image-grid-empty">
          {hasActiveFilters ? (
            <>
              <p>No images match your search or filters.</p>
              {typeof onClearFilters === 'function' && (
                <button type="button" className="image-grid-empty-clear" onClick={onClearFilters}>
                  Clear filters
                </button>
              )}
            </>
          ) : (
            <p>No images yet. Upload some to get started.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {hasActiveFilters && typeof onClearFilters === 'function' && (
        <div className="similar-bar">
          <span className="similar-bar-label">Filters active</span>
          <button type="button" className="similar-bar-back" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      )}
      <div className="image-grid-wrap">
        <ul className="image-grid" role="list">
          {pageImages.map((img) => (
            <li key={img.id} className="image-grid-item">
              <button
                type="button"
                className="image-grid-thumb"
                onClick={() => setSelected(img)}
                aria-label={`View ${img.filename}`}
              >
                <img src={img.thumbnailUrl} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Image grid pagination">
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        )}
      </div>
      {selected && (
        <ImageModal
          image={selected}
          onClose={() => setSelected(null)}
          onFindSimilar={
            onFindSimilar
              ? () => {
                  setSelected(null);
                  onFindSimilar(selected.id);
                }
              : undefined
          }
          onUpdated={handleModalUpdated}
          onDeleted={(deletedId) => {
            setSelected(null);
            setAllImages((prev) => prev.filter((img) => img.id !== deletedId));
            onDeletedFromSimilar?.(deletedId);
          }}
        />
      )}
    </>
  );
}
