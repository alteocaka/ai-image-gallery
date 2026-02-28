/**
 * AI service for image analysis.
 * Uses factory to select provider (gemini default, openai supported).
 * Accepts optional { provider, model } for user preferences.
 * Required outputs: tags (5-10), description (one sentence), colors (3 hex).
 */

export { analyzeImage } from './ai/factory.js';
