/**
 * OpenAI (GPT-4o vision) provider for image analysis.
 * Env: OPENAI_API_KEY, OPENAI_MODEL (optional, default gpt-4o)
 */

import OpenAI from 'openai';

const API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const openai = API_KEY ? new OpenAI({ apiKey: API_KEY }) : null;

const PROMPT = `You are an image analysis assistant.

Return ONLY valid JSON with this exact shape, no extra text or markdown:

{
  "tags": ["tag1", "tag2", ...],
  "description": "one concise sentence describing the image",
  "colors": ["#RRGGBB", "#RRGGBB", "#RRGGBB"]
}

Rules:
- tags: 5-10 short, lowercase, single-word or simple phrases (e.g. beach, sunset, ocean)
- description: one natural English sentence
- colors: exactly 3 dominant colors as 6-digit hex codes (e.g. #FF5733)`;

function parseResponse(textPart) {
  let parsed;
  try {
    const raw = textPart.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    parsed = JSON.parse(raw);
  } catch {
    return { tags: [], description: '', colors: [] };
  }
  const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [];
  const description = typeof parsed.description === 'string' ? parsed.description : '';
  const colors = Array.isArray(parsed.colors)
    ? parsed.colors
        .map((c) => (String(c).startsWith('#') ? String(c) : `#${String(c).replace(/^#/, '')}`))
        .slice(0, 3)
    : [];
  return { tags, description, colors };
}

export async function analyzeImage(imageBuffer, mimeType, options = {}) {
  if (!openai || !API_KEY) {
    return { tags: [], description: '', colors: [] };
  }

  const model = options.model || DEFAULT_MODEL;
  const base64 = imageBuffer.toString('base64');
  const mediaType = mimeType || 'image/jpeg';
  const imageUrl = `data:${mediaType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT.trim() },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 500,
  });

  const textPart = response.choices?.[0]?.message?.content?.trim() || '';
  return parseResponse(textPart);
}
