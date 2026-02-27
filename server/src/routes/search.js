import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { getPublicUrl } from '../services/storageService.js'

const router = Router()

const MAX_SIMILAR = 20

/** Normalize hex color for comparison (e.g. #abc -> #AABBCC) */
function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return ''
  const s = hex.replace(/^#/, '').trim()
  if (s.length === 6) return s.toUpperCase()
  if (s.length === 3) return (s[0] + s[0] + s[1] + s[1] + s[2] + s[2]).toUpperCase()
  return s.toUpperCase()
}

/** Jaccard similarity between two arrays (treat as sets). Returns 0..1. */
function jaccard(a, b) {
  const setA = new Set((a || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean))
  const setB = new Set((b || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean))
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0
  let intersection = 0
  for (const x of setA) {
    if (setB.has(x)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/** Color overlap: fraction of ref colors that appear in other (0..1). */
function colorOverlap(refColors, otherColors) {
  const refSet = new Set((refColors || []).map(normalizeHex).filter(Boolean))
  const otherSet = new Set((otherColors || []).map(normalizeHex).filter(Boolean))
  if (refSet.size === 0 && otherSet.size === 0) return 1
  if (refSet.size === 0) return 0
  let match = 0
  for (const c of refSet) {
    if (otherSet.has(c)) match++
  }
  return match / refSet.size
}

router.get('/text', (req, res) => {
  // TODO: Query by tags or description, user-scoped, paginated
  res.json({ results: [] })
})

router.get('/similar/:imageId', async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const imageId = parseInt(req.params.imageId, 10)
    if (!Number.isInteger(imageId) || imageId <= 0) {
      return res.status(400).json({ error: 'Invalid image id' })
    }

    // Fetch reference image + metadata
    const { data: refRow, error: refError } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(description, tags, colors, ai_processing_status)',
      )
      .eq('id', imageId)
      .eq('user_id', userId)
      .single()

    if (refError || !refRow) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const refMeta = Array.isArray(refRow.image_metadata) ? refRow.image_metadata[0] : refRow.image_metadata
    const refTags = refMeta?.tags ?? []
    const refColors = (refMeta?.colors ?? []).map(normalizeHex).filter(Boolean)

    // If no tags and no colors, we can still return other images by upload order (no similarity score)
    const hasMetadata = refTags.length > 0 || refColors.length > 0

    // Fetch all other images for user with metadata
    const { data: allRows, error: listError } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(id, description, tags, colors, ai_processing_status)',
      )
      .eq('user_id', userId)
      .neq('id', imageId)
      .order('uploaded_at', { ascending: false })

    if (listError) {
      throw new Error(listError.message)
    }

    const candidates = (allRows || []).map((row) => {
      const meta = Array.isArray(row.image_metadata) ? row.image_metadata[0] : row.image_metadata
      const tags = meta?.tags ?? []
      const colors = meta?.colors ?? []
      let score = 0
      if (hasMetadata) {
        const tagSim = jaccard(refTags, tags)
        const colorSim = colorOverlap(refColors, colors)
        score = 0.6 * tagSim + 0.4 * colorSim
      }
      return {
        row,
        meta,
        score,
      }
    })

    // Sort by score descending, then by uploaded_at
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.row.uploaded_at) - new Date(a.row.uploaded_at)
    })

    const top = candidates.slice(0, MAX_SIMILAR)

    const images = top.map(({ row, meta }) => ({
      id: row.id,
      filename: row.filename,
      originalUrl: getPublicUrl(row.original_path),
      thumbnailUrl: getPublicUrl(row.thumbnail_path),
      uploadedAt: row.uploaded_at,
      description: meta?.description ?? null,
      tags: meta?.tags ?? [],
      colors: meta?.colors ?? [],
      aiStatus: meta?.ai_processing_status ?? 'pending',
    }))

    res.json({ images })
  } catch (err) {
    next(err)
  }
})

router.get('/color', (req, res) => {
  // TODO: Filter by color (hex), user-scoped
  res.json({ results: [] })
})

export default router
