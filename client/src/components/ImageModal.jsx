import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function ImageModal({ image, onClose, onFindSimilar, onDeleted }) {
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const [current, setCurrent] = useState(image || null)

  useEffect(() => {
    setCurrent(image || null)
  }, [image])

  if (!current) return null

  // Support both old mock-data shape (original_url) and new API shape (originalUrl)
  const {
    originalUrl,
    original_url,
    filename,
    description,
    tags = [],
    colors = [],
    aiStatus = 'pending',
  } = current

  const fullUrl = originalUrl || original_url
  const isDone = aiStatus === 'completed'

  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Poll for AI status while pending so the modal updates live
  useEffect(() => {
    if (!current?.id || current.aiStatus === 'completed') return
    let cancelled = false
    const interval = setInterval(async () => {
      try {
        const updated = await api(`/images/${current.id}`)
        if (cancelled || !updated) return
        setCurrent((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : updated))
        if (updated.aiStatus === 'completed' || updated.aiStatus === 'failed') {
          clearInterval(interval)
        }
      } catch {
        // ignore polling errors
      }
    }, 2500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [current?.id, current?.aiStatus])

  async function performDelete() {
    if (!current?.id || deleting) return
    try {
      setDeleting(true)
      await api(`/images/${current.id}`, { method: 'DELETE' })
      if (typeof onDeleted === 'function') {
        onDeleted(current.id)
      } else {
        onClose()
      }
    } catch (err) {
      console.error('Failed to delete image', err)
      setDeleting(false)
    }
  }

  return (
    <div
      className="image-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
    >
      <div className="image-modal">
        <div className="image-modal-header">
          <h2 id="image-modal-title" className="image-modal-title">
            {filename}
          </h2>
          <button
            type="button"
            className="image-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="image-modal-body">
          <div className="image-modal-preview">
            {fullUrl ? (
              <img src={fullUrl} alt={description || filename} />
            ) : (
              <div className="image-grid-empty">
                <p>Image URL missing.</p>
              </div>
            )}
          </div>
          <div className="image-modal-meta">
            {isDone ? (
              description && (
                <p className="image-modal-description">{description}</p>
              )
            ) : (
              <div className="image-modal-description-skeleton">
                <div className="skeleton-line skeleton-line--long" />
                <div className="skeleton-line skeleton-line--medium" />
              </div>
            )}
            {isDone ? (
              tags.length > 0 && (
                <div className="image-modal-tags">
                  <span className="image-modal-label">Tags</span>
                  <ul className="image-modal-tag-list" role="list">
                    {tags.map((tag) => (
                      <li key={tag}>
                        <span className="image-modal-tag">{tag}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : (
              <div className="image-modal-tags">
                <span className="image-modal-label">Tags</span>
                <div className="image-modal-tag-skeleton-row">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className="skeleton-pill" />
                  ))}
                </div>
              </div>
            )}
            {isDone ? (
              colors.length > 0 && (
                <div className="image-modal-colors">
                  <span className="image-modal-label">Colors</span>
                  <div className="image-modal-color-swatches">
                    {colors.map((hex) => (
                      <span
                        key={hex}
                        className="image-modal-swatch"
                        style={{ backgroundColor: hex }}
                        title={hex}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="image-modal-colors">
                <span className="image-modal-label">Colors</span>
                <div className="image-modal-color-swatches">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className="image-modal-swatch skeleton-swatch" />
                  ))}
                </div>
              </div>
            )}
            <div className="image-modal-actions">
              {onFindSimilar && (
                <button
                  type="button"
                  className="image-modal-similar"
                  onClick={onFindSimilar}
                  disabled={deleting}
                >
                  Find similar images
                </button>
              )}
              <button
                type="button"
                className="image-modal-delete"
                onClick={() => setConfirming(true)}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete image'}
              </button>
            </div>
            {confirming && !deleting && (
              <div
                className="image-modal-confirm-backdrop"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setConfirming(false)
                }}
              >
                <div className="image-modal-confirm">
                  <p className="image-modal-confirm-text">
                    Delete this image? This action cannot be undone.
                  </p>
                  <div className="image-modal-confirm-actions">
                    <button
                      type="button"
                      className="image-modal-confirm-cancel"
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="image-modal-confirm-delete"
                      onClick={performDelete}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
