import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { getPublicUrl } from '../services/storageService.js';

const router = Router();

const MAX_SIMILAR = 20;

/** Normalize hex color for comparison (e.g. #abc -> #AABBCC) */
function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return '';
  const s = hex.replace(/^#/, '').trim();
  if (s.length === 6) return s.toUpperCase();
  if (s.length === 3) return (s[0] + s[0] + s[1] + s[1] + s[2] + s[2]).toUpperCase();
  return s.toUpperCase();
}

/** Jaccard similarity between two arrays (treat as sets). Returns 0..1. */
function jaccard(a, b) {
  const setA = new Set((a || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean));
  const setB = new Set((b || []).map((x) => String(x).toLowerCase().trim()).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Color overlap: fraction of ref colors that appear in other (0..1). */
function colorOverlap(refColors, otherColors) {
  const refSet = new Set((refColors || []).map(normalizeHex).filter(Boolean));
  const otherSet = new Set((otherColors || []).map(normalizeHex).filter(Boolean));
  if (refSet.size === 0 && otherSet.size === 0) return 1;
  if (refSet.size === 0) return 0;
  let match = 0;
  for (const c of refSet) {
    if (otherSet.has(c)) match++;
  }
  return match / refSet.size;
}

const PER_PAGE_DEFAULT = 20;
const PER_PAGE_MAX = 50;

/** GET /search/text?q=...&page=1&per_page=20 — search by filename, tags, description (user-scoped, paginated) */
router.get('/text', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const q = (req.query.q || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(
      PER_PAGE_MAX,
      Math.max(1, parseInt(req.query.per_page, 10) || PER_PAGE_DEFAULT)
    );

    if (!q) {
      return res.json({
        images: [],
        page: 1,
        perPage,
        total: 0,
        totalPages: 1,
      });
    }

    // Fetch all user images with metadata so we can filter by filename, description, tags
    const { data: rows, error } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(id, description, tags, colors, ai_processing_status)'
      )
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) throw new Error(error.message);

    const matching = (rows || []).filter((row) => {
      const meta = Array.isArray(row.image_metadata) ? row.image_metadata[0] : row.image_metadata;
      const filename = (row.filename || '').toLowerCase();
      const description = (meta?.description || '').toLowerCase();
      const tags = (meta?.tags || []).map((t) => String(t).toLowerCase());
      return filename.includes(q) || description.includes(q) || tags.some((t) => t.includes(q));
    });

    const total = matching.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = (page - 1) * perPage;
    const pageRows = matching.slice(from, from + perPage);

    const images = pageRows.map((row) => {
      const meta = Array.isArray(row.image_metadata) ? row.image_metadata[0] : row.image_metadata;
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
      };
    });

    res.json({
      images,
      page,
      perPage,
      total,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/similar/:imageId', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const imageId = parseInt(req.params.imageId, 10);
    if (!Number.isInteger(imageId) || imageId <= 0) {
      return res.status(400).json({ error: 'Invalid image id' });
    }

    // Fetch reference image + metadata
    const { data: refRow, error: refError } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(description, tags, colors, ai_processing_status)'
      )
      .eq('id', imageId)
      .eq('user_id', userId)
      .single();

    if (refError || !refRow) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const refMeta = Array.isArray(refRow.image_metadata)
      ? refRow.image_metadata[0]
      : refRow.image_metadata;
    const refTags = refMeta?.tags ?? [];
    const refColors = (refMeta?.colors ?? []).map(normalizeHex).filter(Boolean);

    // If no tags and no colors, we can still return other images by upload order (no similarity score)
    const hasMetadata = refTags.length > 0 || refColors.length > 0;

    // Fetch all other images for user with metadata
    const { data: allRows, error: listError } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(id, description, tags, colors, ai_processing_status)'
      )
      .eq('user_id', userId)
      .neq('id', imageId)
      .order('uploaded_at', { ascending: false });

    if (listError) {
      throw new Error(listError.message);
    }

    const candidates = (allRows || []).map((row) => {
      const meta = Array.isArray(row.image_metadata) ? row.image_metadata[0] : row.image_metadata;
      const tags = meta?.tags ?? [];
      const colors = meta?.colors ?? [];
      let score = 0;
      if (hasMetadata) {
        const tagSim = jaccard(refTags, tags);
        const colorSim = colorOverlap(refColors, colors);
        score = 0.6 * tagSim + 0.4 * colorSim;
      }
      return {
        row,
        meta,
        score,
      };
    });

    // Sort by score descending, then by uploaded_at
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.row.uploaded_at) - new Date(a.row.uploaded_at);
    });

    const top = candidates.slice(0, MAX_SIMILAR);

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
    }));

    res.json({ images });
  } catch (err) {
    next(err);
  }
});

/** GET /search/color?color=...&page=1&per_page=20 — images that have this dominant color (user-scoped, paginated) */
router.get('/color', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const colorParam = (req.query.color || '').trim();
    console.log('[search/color] query.color (raw):', JSON.stringify(colorParam));

    if (!colorParam) {
      return res.json({
        images: [],
        page: 1,
        perPage: PER_PAGE_DEFAULT,
        total: 0,
        totalPages: 1,
      });
    }

    const requestedHex = normalizeHex(colorParam);
    if (!requestedHex) {
      return res.status(400).json({ error: 'Invalid color (use hex e.g. #FF0000 or FF0000)' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(
      PER_PAGE_MAX,
      Math.max(1, parseInt(req.query.per_page, 10) || PER_PAGE_DEFAULT)
    );

    // AI stores colors as #RRGGBB; DB array contains is case-sensitive, so try both cases
    const hexWithHashUpper = `#${requestedHex}`;
    const hexWithHashLower = `#${requestedHex.toLowerCase()}`;
    console.log(
      '[search/color] normalized requestedHex:',
      requestedHex,
      'hexWithHash (upper/lower):',
      hexWithHashUpper,
      hexWithHashLower,
      'page:',
      page,
      'perPage:',
      perPage
    );

    const [resUpper, resLower] = await Promise.all([
      supabaseAdmin
        .from('image_metadata')
        .select('image_id')
        .eq('user_id', userId)
        .contains('colors', [hexWithHashUpper]),
      requestedHex !== requestedHex.toLowerCase()
        ? supabaseAdmin
            .from('image_metadata')
            .select('image_id')
            .eq('user_id', userId)
            .contains('colors', [hexWithHashLower])
        : { data: [], error: null },
    ]);

    if (resUpper.error) throw new Error(resUpper.error.message);
    if (resLower.error) throw new Error(resLower.error.message);

    const seen = new Set();
    const matchingIds = [];
    for (const row of resUpper.data || []) {
      if (!seen.has(row.image_id)) {
        seen.add(row.image_id);
        matchingIds.push(row.image_id);
      }
    }
    for (const row of resLower.data || []) {
      if (!seen.has(row.image_id)) {
        seen.add(row.image_id);
        matchingIds.push(row.image_id);
      }
    }

    console.log(
      '[search/color] metaRows (upper/lower) count:',
      (resUpper.data || []).length,
      (resLower.data || []).length,
      'matchingIds:',
      matchingIds
    );

    const total = matchingIds.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = (page - 1) * perPage;
    const pageIds = matchingIds.slice(from, from + perPage);
    console.log('[search/color] total:', total, 'pageIds (this page):', pageIds);

    if (pageIds.length === 0) {
      return res.json({
        images: [],
        page,
        perPage,
        total,
        totalPages,
      });
    }

    // Use .or() so multiple IDs are reliable (some clients choke on .in() with 2+ values)
    const idFilter = pageIds.map((id) => `id.eq.${id}`).join(',');
    console.log('[search/color] idFilter (or):', idFilter);

    const { data: rows, error: listError } = await supabaseAdmin
      .from('images')
      .select(
        'id, user_id, filename, original_path, thumbnail_path, uploaded_at, image_metadata(id, description, tags, colors, ai_processing_status)'
      )
      .eq('user_id', userId)
      .or(idFilter);

    console.log(
      '[search/color] listError:',
      listError?.message ?? null,
      'rows count:',
      rows?.length ?? 0
    );
    if (rows?.length) {
      rows.forEach((r) => {
        const meta = Array.isArray(r.image_metadata) ? r.image_metadata[0] : r.image_metadata;
        console.log(
          '[search/color] row id:',
          r.id,
          'filename:',
          r.filename,
          'colors:',
          JSON.stringify(meta?.colors ?? [])
        );
      });
    }

    if (listError) throw new Error(listError.message);

    const orderById = new Map(pageIds.map((id, i) => [id, i]));
    const sorted = (rows || []).sort((a, b) => orderById.get(a.id) - orderById.get(b.id));

    const images = sorted.map((row) => {
      const meta = Array.isArray(row.image_metadata) ? row.image_metadata[0] : row.image_metadata;
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
      };
    });

    console.log('[search/color] responding with images.length:', images.length);
    res.json({
      images,
      page,
      perPage,
      total,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
