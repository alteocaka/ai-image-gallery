/**
 * Supabase Storage helpers: upload original + thumbnail, organized by user_id.
 */

import path from 'node:path';
import sharp from 'sharp';
import { supabaseAdmin } from '../lib/supabase.js';

const BUCKET = 'images';

/** Generate a unique suffix so same filename can be uploaded multiple times. */
export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildOriginalPath(userId, filename, unique) {
  const ext = path.extname(filename) || '.jpg';
  const base = path.basename(filename, ext);
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_');
  const suffix = unique || uniqueSuffix();
  const finalName = `${safeBase || 'image'}-${suffix}${ext.toLowerCase()}`;
  return `${userId}/${finalName}`;
}

function buildThumbPath(userId, filename, unique) {
  const base = path.basename(filename, path.extname(filename));
  const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_');
  const suffix = unique || uniqueSuffix();
  const finalName = `thumb_${safeBase || 'image'}-${suffix}.jpg`;
  return `${userId}/${finalName}`;
}

export async function uploadOriginal(userId, file, unique) {
  const suffix = unique ?? uniqueSuffix();
  const storagePath = buildOriginalPath(userId, file.originalname || 'image', suffix);

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload original image: ${error.message}`);
  }

  return { path: storagePath };
}

export async function uploadThumbnail(userId, buffer, filename, unique) {
  const suffix = unique ?? uniqueSuffix();
  const thumbBuffer = await sharp(buffer)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();

  const thumbPath = buildThumbPath(userId, filename || 'image', suffix);

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(thumbPath, thumbBuffer, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload thumbnail: ${error.message}`);
  }

  return { path: thumbPath };
}

export function getPublicUrl(pathname) {
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(pathname);
  return data.publicUrl;
}

/** Download file from storage (works for private buckets with service role). */
export async function downloadFromStorage(storagePath) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Delete one or more objects from storage (ignores empty paths). */
export async function deleteFromStorage(paths) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  if (!list.length) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(list);
  if (error) throw new Error(`Failed to delete from storage: ${error.message}`);
}
