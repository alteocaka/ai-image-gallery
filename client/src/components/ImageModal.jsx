import { useEffect, useState } from 'react';
import { api, apiBlob } from '@/lib/api';

export default function ImageModal({ image, onClose, onFindSimilar, onDeleted, onUpdated }) {
  const [current, setCurrent] = useState(image || null);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') {
        if (editing) setEditing(false);
        else onClose();
      }
    }
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose, editing]);

  useEffect(() => {
    setCurrent(image || null);
  }, [image]);

  // Sync edit form when opening edit popup or when switching to another image
  useEffect(() => {
    if (!current || !editing) return;
    setEditDescription(current.description ?? '');
    setEditTags(
      Array.isArray(current.tags)
        ? [...current.tags].map((t) => String(t).trim()).filter(Boolean)
        : []
    );
  }, [current?.id, editing]);

  if (!current) return null;

  // Support both old mock-data shape (original_url) and new API shape (originalUrl)
  const {
    originalUrl,
    original_url,
    filename,
    description,
    tags = [],
    colors = [],
    aiStatus = 'pending',
  } = current;

  const fullUrl = originalUrl || original_url;
  const isDone = aiStatus === 'completed';
  const isFailed = aiStatus === 'failed';
  const isPending = aiStatus === 'pending';

  function removeTag(index) {
    setEditTags((prev) => prev.filter((_, i) => i !== index));
  }

  function addTag() {
    const t = newTagInput.trim().toLowerCase();
    if (!t || editTags.includes(t)) {
      setNewTagInput('');
      return;
    }
    setEditTags((prev) => [...prev, t]);
    setNewTagInput('');
  }

  function handleNewTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSave() {
    if (!current?.id || saving) return;
    setSaveError(null);
    setSaving(true);
    try {
      const description = editDescription.trim() || null;
      const tags = [...editTags].map((t) => String(t).trim()).filter(Boolean);
      const updated = await api(`/images/${current.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description, tags }),
      });
      const nextDescription = updated?.description ?? description;
      const nextTags = Array.isArray(updated?.tags) ? updated.tags : tags;
      setCurrent((prev) =>
        prev ? { ...prev, description: nextDescription, tags: nextTags } : prev
      );
      setEditing(false);
      if (typeof onUpdated === 'function')
        onUpdated(current.id, { description: nextDescription, tags: nextTags });
    } catch (err) {
      setSaveError(err?.body?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // Poll for AI status while pending so the modal updates live
  useEffect(() => {
    if (!current?.id || current.aiStatus === 'completed') return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const updated = await api(`/images/${current.id}`);
        if (cancelled || !updated) return;
        setCurrent((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : updated));
        if (updated.aiStatus === 'completed' || updated.aiStatus === 'failed') {
          clearInterval(interval);
        }
      } catch {
        // ignore polling errors
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [current?.id, current?.aiStatus]);

  async function performDelete() {
    if (!current?.id || deleting) return;
    setDeleteError(null);
    try {
      setDeleting(true);
      await api(`/images/${current.id}`, { method: 'DELETE' });
      if (typeof onDeleted === 'function') {
        onDeleted(current.id);
      } else {
        onClose();
      }
    } catch (err) {
      setDeleteError(err?.body?.error || err.message || 'Failed to delete image');
      setDeleting(false);
    }
  }

  async function handleDownload() {
    if (!current?.id || downloading) return;
    setDownloadError(null);
    try {
      setDownloading(true);
      const blob = await apiBlob(`/images/${current.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'image';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err?.body?.error || err.message || 'Download failed');
    } finally {
      setDownloading(false);
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
          <button type="button" className="image-modal-close" onClick={onClose} aria-label="Close">
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
            {isFailed && (
              <div className="image-modal-ai-failed" role="alert">
                <span className="image-modal-ai-failed-icon" aria-hidden>
                  ⚠
                </span>
                <p className="image-modal-ai-failed-text">
                  AI analysis couldn&apos;t be completed (e.g. service limit). Add a description and
                  tags below so you can search and find similar images.
                </p>
              </div>
            )}
            {isDone || isFailed ? (
              <>
                {description && <p className="image-modal-description">{description}</p>}
                {isFailed && !description && (
                  <p className="image-modal-description image-modal-description--muted">
                    No description yet.
                  </p>
                )}
                <div className="image-modal-tags">
                  <span className="image-modal-label">Tags</span>
                  {tags.length > 0 ? (
                    <ul className="image-modal-tag-list" role="list">
                      {tags.map((tag) => (
                        <li key={tag}>
                          <span className="image-modal-tag">{tag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="image-modal-tags-empty">
                      {isFailed ? 'No tags yet — add some below.' : 'No tags yet.'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="image-modal-description-skeleton">
                  <div className="skeleton-line skeleton-line--long" />
                  <div className="skeleton-line skeleton-line--medium" />
                </div>
                <div className="image-modal-tags">
                  <span className="image-modal-label">Tags</span>
                  <div className="image-modal-tag-skeleton-row">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i} className="skeleton-pill" />
                    ))}
                  </div>
                </div>
              </>
            )}
            {isDone || isFailed ? (
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
            ) : isPending ? (
              <div className="image-modal-colors">
                <span className="image-modal-label">Colors</span>
                <div className="image-modal-color-swatches">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} className="image-modal-swatch skeleton-swatch" />
                  ))}
                </div>
              </div>
            ) : null}
            {downloadError && (
              <p className="image-modal-save-error" role="alert">
                {downloadError}
              </p>
            )}
            <div className="image-modal-actions">
              {onFindSimilar && (
                <button
                  type="button"
                  className="image-modal-action-btn image-modal-action-similar"
                  onClick={onFindSimilar}
                  disabled={deleting}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <span>Find similar images</span>
                </button>
              )}
              {(isDone || isFailed) && (
                <button
                  type="button"
                  className="image-modal-action-btn image-modal-action-edit"
                  onClick={() => setEditing(true)}
                  disabled={deleting}
                  aria-label="Edit description and tags"
                  title={isFailed ? 'Add description and tags' : 'Edit description and tags'}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="image-modal-action-btn image-modal-action-download"
                onClick={handleDownload}
                disabled={downloading}
                aria-label="Download image"
                title="Download image"
              >
                {downloading ? (
                  <span className="image-modal-action-spinner" aria-hidden />
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="image-modal-action-btn image-modal-action-delete"
                onClick={() => setConfirming(true)}
                disabled={deleting}
                aria-label="Delete image"
                title="Delete image"
              >
                {deleting ? (
                  <span className="image-modal-action-spinner" aria-hidden />
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {editing && (
            <div
              className="image-modal-confirm-backdrop image-modal-edit-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget && !saving) setEditing(false);
              }}
            >
              <div className="image-modal-edit-popup" onClick={(e) => e.stopPropagation()}>
                <h3 className="image-modal-edit-title">Edit description &amp; tags</h3>
                <div className="image-modal-edit-field">
                  <label htmlFor="image-modal-edit-desc" className="image-modal-label">
                    Description
                  </label>
                  <textarea
                    id="image-modal-edit-desc"
                    className="image-modal-description-input"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the image…"
                  />
                </div>
                <div className="image-modal-edit-field">
                  <span className="image-modal-label">Tags</span>
                  <ul className="image-modal-tag-list image-modal-tag-list--editable" role="list">
                    {editTags.map((tag, i) => (
                      <li key={`${tag}-${i}`} className="image-modal-tag-wrap">
                        <span className="image-modal-tag">{tag}</span>
                        <button
                          type="button"
                          className="image-modal-tag-remove"
                          onClick={() => removeTag(i)}
                          aria-label={`Remove tag ${tag}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="image-modal-tag-add">
                    <input
                      type="text"
                      className="image-modal-tag-input"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleNewTagKeyDown}
                      placeholder="Add tag (Enter or comma)"
                      maxLength={50}
                    />
                  </div>
                </div>
                {saveError && (
                  <p className="image-modal-save-error" role="alert">
                    {saveError}
                  </p>
                )}
                <div className="image-modal-edit-actions">
                  <button
                    type="button"
                    className="image-modal-edit-cancel"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="image-modal-edit-save"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {confirming && (
            <div
              className="image-modal-confirm-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget && !deleting) {
                  setConfirming(false);
                  setDeleteError(null);
                }
              }}
            >
              <div className="image-modal-confirm">
                <p className="image-modal-confirm-text">
                  Delete this image? This action cannot be undone.
                </p>
                {deleteError && (
                  <p className="image-modal-save-error" role="alert">
                    {deleteError}
                  </p>
                )}
                <div className="image-modal-confirm-actions">
                  <button
                    type="button"
                    className="image-modal-confirm-cancel"
                    onClick={() => {
                      setConfirming(false);
                      setDeleteError(null);
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="image-modal-confirm-delete"
                    onClick={performDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
