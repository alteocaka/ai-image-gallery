import { useState, useCallback } from 'react'
import { uploadWithProgress } from '../lib/api'

const ACCEPT_STR = 'image/jpeg,image/png'
const MAX_FILES = 10

export default function UploadZone({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // 0-100 or null (indeterminate)
  const [successMessage, setSuccessMessage] = useState('')

  const addFiles = useCallback((fileList) => {
    setError(null)
    setSuccessMessage('')
    const list = Array.from(fileList)
    const valid = list.filter((f) => f.type === 'image/jpeg' || f.type === 'image/png')
    const invalid = list.filter((f) => f.type !== 'image/jpeg' && f.type !== 'image/png')
    if (invalid.length) setError(`Skipped ${invalid.length} file(s): only JPEG and PNG are supported.`)
    if (valid.length) setFiles((prev) => [...prev, ...valid].slice(-MAX_FILES))
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleChange = (e) => {
    addFiles(e.target.files || [])
    e.target.value = ''
  }

  const removeFile = (index) => {
    if (uploading) return
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!files.length || uploading) return
    setError(null)
    setSuccessMessage('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('images', file)
      })
      const result = await uploadWithProgress(
        '/images/upload',
        formData,
        (percent) => setUploadProgress(percent),
      )
      setUploadProgress(100)
      const uploadedCount = Array.isArray(result?.images) ? result.images.length : files.length
      setSuccessMessage(`Uploaded ${uploadedCount} image${uploadedCount === 1 ? '' : 's'}. AI tags will appear after processing.`)
      setFiles([])
      if (typeof onUploaded === 'function') {
        onUploaded(result?.images || [])
      }
    } catch (err) {
      const msg = err?.body?.error || err.message || 'Upload failed.'
      setError(msg)
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="upload-zone">
      <div
        className={`upload-zone-drop ${dragging ? 'upload-zone-drop--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={ACCEPT_STR}
          multiple
          onChange={handleChange}
          className="upload-zone-input"
          aria-label="Upload images"
        />
        <p className="upload-zone-text">Drag & drop images here, or click to browse</p>
        <p className="upload-zone-hint">JPEG and PNG only, up to {MAX_FILES} files</p>
      </div>
      {error && (
        <div className="upload-zone-error" role="alert">
          {error}
        </div>
      )}
      {successMessage && !error && (
        <div className="upload-zone-success" role="status">
          {successMessage}
        </div>
      )}
      {uploading && !error && (
        <div className="upload-zone-progress-wrap" role="status" aria-valuenow={uploadProgress ?? undefined} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <div className="upload-zone-status">
            Uploading {files.length} image{files.length === 1 ? '' : 's'}
            {uploadProgress != null ? ` — ${uploadProgress}%` : '…'}
          </div>
          <div className="upload-zone-progress">
            <div
              className={`upload-zone-progress-fill${uploadProgress == null ? ' upload-zone-progress-fill--indeterminate' : ''}`}
              style={uploadProgress != null ? { width: `${uploadProgress}%` } : undefined}
            />
          </div>
        </div>
      )}
      {files.length > 0 && (
        <ul className="upload-zone-list">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="upload-zone-item">
              <span className="upload-zone-item-name">{file.name}</span>
              <span className="upload-zone-item-size">{(file.size / 1024).toFixed(1)} KB</span>
              <span className="upload-zone-item-status">
                {uploading
                  ? (uploadProgress != null ? `${uploadProgress}%` : 'Uploading…')
                  : 'Ready to upload'}
              </span>
              <button
                type="button"
                className="upload-zone-item-remove"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${file.name}`}
                disabled={uploading}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <button
          type="button"
          className="upload-zone-submit"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : `Upload ${files.length} image${files.length === 1 ? '' : 's'}`}
        </button>
      )}
    </div>
  )
}
