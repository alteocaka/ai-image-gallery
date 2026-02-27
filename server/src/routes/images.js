import { Router } from 'express'
import multer from 'multer'
import { supabaseAdmin } from '../lib/supabase.js'
import { uploadOriginal, uploadThumbnail, getPublicUrl, deleteFromStorage } from '../services/storageService.js'
import { processImageJob } from '../jobs/processImage.js'

const router = Router()

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'))
    }
  },
})

router.post('/upload', upload.array('images', 10), async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const files = req.files || []
    if (!files.length) {
      return res.status(400).json({ error: 'No images uploaded' })
    }

    const created = []

    for (const file of files) {
      const { path: original_path } = await uploadOriginal(userId, file)
      const { path: thumbnail_path } = await uploadThumbnail(userId, file.buffer, file.originalname)

      const { data: imageInsert, error: imageError } = await supabaseAdmin
        .from('images')
        .insert({
          user_id: userId,
          filename: file.originalname,
          original_path,
          thumbnail_path,
        })
        .select('id, filename, original_path, thumbnail_path, uploaded_at')
        .single()

      if (imageError) {
        throw new Error(imageError.message)
      }

      const { data: metaInsert, error: metaError } = await supabaseAdmin
        .from('image_metadata')
        .insert({
          image_id: imageInsert.id,
          user_id: userId,
          ai_processing_status: 'pending',
        })
        .select('id, ai_processing_status')
        .single()

      if (metaError) {
        throw new Error(metaError.message)
      }

      const originalUrl = getPublicUrl(original_path)
      const thumbUrl = getPublicUrl(thumbnail_path)

      processImageJob(imageInsert.id, userId, original_path, file.mimetype).catch((err) => {
        console.error('processImageJob error', err)
      })

      created.push({
        id: imageInsert.id,
        filename: imageInsert.filename,
        originalUrl,
        thumbnailUrl: thumbUrl,
        uploadedAt: imageInsert.uploaded_at,
        aiStatus: metaInsert.ai_processing_status,
      })
    }

    res.status(201).json({ images: created })
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Only JPEG and PNG')) {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const perPage = Math.min(50, parseInt(req.query.per_page, 10) || 20)
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(id, description, tags, colors, ai_processing_status)',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(error.message)
    }

    const total = count ?? 0
    const totalPages = total > 0 ? Math.ceil(total / perPage) : 1

    const images = (data || []).map((row) => {
      const meta = Array.isArray(row.image_metadata) ? row.image_metadata[0] : row.image_metadata
      return {
        id: row.id,
        filename: row.filename,
        originalUrl: getPublicUrl(row.original_path),
        thumbnailUrl: getPublicUrl(row.thumbnail_path),
        uploadedAt: row.uploaded_at,
        description: meta?.description ?? null,
        tags: meta?.tags ?? [],
        colors: meta?.colors ?? [],
        aiStatus: meta?.ai_processing_status ?? 'pending',
      }
    })

    res.json({
      images,
      page,
      perPage,
      total,
      totalPages,
    })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid image id' })
    }

    const { data: row, error } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(id, description, tags, colors, ai_processing_status)',
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    if (!row) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const meta = Array.isArray(row.image_metadata) ? row.image_metadata[0] : row.image_metadata
    const image = {
      id: row.id,
      filename: row.filename,
      originalUrl: getPublicUrl(row.original_path),
      thumbnailUrl: getPublicUrl(row.thumbnail_path),
      uploadedAt: row.uploaded_at,
      description: meta?.description ?? null,
      tags: meta?.tags ?? [],
      colors: meta?.colors ?? [],
      aiStatus: meta?.ai_processing_status ?? 'pending',
    }

    res.json(image)
  } catch (err) {
    next(err)
  }
})

/** PATCH /:id — update description and/or tags (image_metadata), user-scoped */
router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid image id' })
    }

    const { description, tags } = req.body || {}
    const updates = {}
    if (typeof description === 'string') {
      updates.description = description.trim() || null
    }
    if (Array.isArray(tags)) {
      updates.tags = tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim())
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide description and/or tags to update' })
    }

    updates.updated_at = new Date().toISOString()

    const { data: meta, error } = await supabaseAdmin
      .from('image_metadata')
      .update(updates)
      .eq('image_id', id)
      .eq('user_id', userId)
      .select('description, tags, updated_at')
      .single()

    if (error) {
      throw new Error(error.message)
    }
    if (!meta) {
      return res.status(404).json({ error: 'Image not found' })
    }

    res.json({
      description: meta.description ?? null,
      tags: meta.tags ?? [],
      updatedAt: meta.updated_at,
    })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid image id' })
    }

    // Fetch image to get storage paths, ensure it belongs to the user
    const { data: image, error } = await supabaseAdmin
      .from('images')
      .select('id, user_id, original_path, thumbnail_path')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message)
    }
    if (!image) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Best-effort: delete storage objects first
    try {
      await deleteFromStorage([image.original_path, image.thumbnail_path])
    } catch (storageErr) {
      console.error('Storage delete failed for image', id, storageErr)
      // Continue to delete DB rows so user doesn't see a broken record
    }

    const { error: deleteError } = await supabaseAdmin
      .from('images')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    // image_metadata row is removed via ON DELETE CASCADE
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
