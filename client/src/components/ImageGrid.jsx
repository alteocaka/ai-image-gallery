import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import ImageModal from './ImageModal'

const PER_PAGE = 20

export default function ImageGrid({
  searchQuery = '',
  selectedColor = null,
  onClearFilters,
  hasActiveFilters = false,
  refreshKey = 0,
  onColorsChange,
  similarImages = [],
  similarToImageId = null,
  similarLoading = false,
  onFindSimilar,
  onClearSimilar,
  onDeletedFromSimilar,
}) {
  const [allImages, setAllImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPagesFromServer, setTotalPagesFromServer] = useState(1)

  const isSimilarMode = similarToImageId != null

  const searchQ = searchQuery.trim()

  useEffect(() => {
    if (isSimilarMode) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const url = searchQ
          ? `/search/text?q=${encodeURIComponent(searchQ)}&page=${currentPage}&per_page=${PER_PAGE}`
          : `/images?page=${currentPage}&per_page=${PER_PAGE}`
        const data = await api(url)
        if (cancelled) return
        setAllImages(Array.isArray(data.images) ? data.images : [])
        setTotalPagesFromServer(data.totalPages || 1)
      } catch (err) {
        if (cancelled) return
        const msg = err?.body?.error || err.message || 'Failed to load images.'
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentPage, refreshKey, isSimilarMode, searchQ])

  // Server does text search when searchQ is set; we only filter by color client-side
  const filtered = useMemo(() => {
    let list = allImages
    if (selectedColor) {
      list = list.filter((img) => Array.isArray(img.colors) && img.colors.includes(selectedColor))
    }
    return list
  }, [allImages, selectedColor])

  // Derive available colors from current images and inform parent (Gallery)
  useEffect(() => {
    if (typeof onColorsChange !== 'function') return
    const allColors = allImages.flatMap((img) => Array.isArray(img.colors) ? img.colors : []).filter(Boolean)
    const unique = Array.from(new Set(allColors.map((c) => c.toUpperCase())))
    onColorsChange(unique.slice(0, 24))
  }, [allImages, onColorsChange])

  const hasColorFilter = !!selectedColor
  const totalPages = hasColorFilter ? Math.max(1, Math.ceil(filtered.length / PER_PAGE)) : totalPagesFromServer
  const pageImages = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedColor])

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
      )
    }
    return (
      <>
        <div className="similar-bar">
          <span className="similar-bar-label">Similar images</span>
          <button
            type="button"
            className="similar-bar-back"
            onClick={onClearSimilar}
          >
            Back to gallery
          </button>
        </div>
        <div className="image-grid-wrap">
          {similarImages.length === 0 ? (
            <div className="image-grid-empty">
              <p>No similar images found.</p>
              <button
                type="button"
                className="image-grid-empty-clear"
                onClick={onClearSimilar}
              >
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
                    setSelected(null)
                    onFindSimilar(selected.id)
                  }
                : undefined
            }
            onDeleted={(deletedId) => {
              setSelected(null)
              setAllImages((prev) => prev.filter((img) => img.id !== deletedId))
              onDeletedFromSimilar?.(deletedId)
            }}
          />
        )}
      </>
    )
  }

  if (loading) {
    return (
      <div className="image-grid-wrap">
        <div className="image-grid image-grid--skeleton" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="image-grid-skeleton" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="image-grid-wrap">
        <div className="image-grid-empty">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (pageImages.length === 0) {
    return (
      <div className="image-grid-wrap">
        <div className="image-grid-empty">
          {hasActiveFilters || searchQ ? (
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
    )
  }

  return (
    <>
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
                  setSelected(null)
                  onFindSimilar(selected.id)
                }
              : undefined
          }
          onDeleted={(deletedId) => {
            setSelected(null)
            setAllImages((prev) => prev.filter((img) => img.id !== deletedId))
            onDeletedFromSimilar?.(deletedId)
          }}
        />
      )}
    </>
  )
}
