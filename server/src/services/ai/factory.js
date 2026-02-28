/**
 * AI provider factory. Selects provider based on AI_PROVIDER env or options.provider.
 * Default: gemini
 * Supported: gemini, openai
 */

import * as gemini from './providers/gemini.js';
import * as openai from './providers/openai.js';

const PROVIDERS = {
  gemini,
  openai,
};

const DEFAULT_PROVIDER =
  (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();

/**
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @param {{ provider?: string; model?: string }} [options] - Override provider/model (e.g. from user settings)
 */
export async function analyzeImage(imageBuffer, mimeType, options = {}) {
  const providerName = (options.provider || DEFAULT_PROVIDER).toLowerCase().trim();
  const provider = PROVIDERS[providerName] || gemini;

  if (!PROVIDERS[providerName]) {
    console.warn(
      `Unknown AI provider "${options.provider || DEFAULT_PROVIDER}", using gemini. Valid: gemini, openai`
    );
  }

  return provider.analyzeImage(imageBuffer, mimeType, {
    model: options.model,
  });
}
