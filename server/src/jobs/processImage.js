/**
 * Background job: run AI analysis on an image and update image_metadata.
 * Triggered after upload. Uses storage path so it works with private buckets.
 * AI provider/model come from the upload request (client localStorage).
 */

import { analyzeImage } from '../services/aiService.js';
import { downloadFromStorage } from '../services/storageService.js';
import { supabaseAdmin } from '../lib/supabase.js';

/**
 * @param {number} imageId - id from images table
 * @param {string} userId - auth user uuid
 * @param {string} originalPath - storage path (e.g. userId/filename.jpg) for downloading
 * @param {string} [mimeType] - 'image/jpeg' or 'image/png'
 * @param {{ provider?: string; model?: string }} [aiOptions] - from upload request (localStorage)
 */
export async function processImageJob(imageId, userId, originalPath, mimeType, aiOptions = {}) {
  try {
    if (!originalPath) {
      console.warn('processImageJob: missing originalPath', { imageId });
      return;
    }

    const options = {
      provider: aiOptions.provider === 'openai' ? 'openai' : 'gemini',
      model: aiOptions.model || undefined,
    };

    console.log('processImageJob using AI', {
      imageId,
      provider: options.provider,
      model: options.model || '(default)',
    });

    const buffer = await downloadFromStorage(originalPath);
    const { tags, description, colors } = await analyzeImage(
      buffer,
      mimeType || 'image/jpeg',
      options
    );

    const { error } = await supabaseAdmin
      .from('image_metadata')
      .update({
        description: description || null,
        tags: Array.isArray(tags) && tags.length ? tags : null,
        colors: Array.isArray(colors) && colors.length ? colors : null,
        ai_processing_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('image_id', imageId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update image_metadata: ${error.message}`);
    }

    console.log('processImageJob completed', {
      imageId,
      tags: tags?.length,
      provider: options.provider,
    });
  } catch (err) {
    console.error('processImageJob failed', imageId, err.message || err);

    await supabaseAdmin
      .from('image_metadata')
      .update({
        ai_processing_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('image_id', imageId)
      .eq('user_id', userId);
  }
}
