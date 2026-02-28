/**
 * Gemini (Google AI Studio) provider for image analysis.
 * Env: AI_API_KEY or GEMINI_API_KEY, GEMINI_MODEL (optional, default gemini-2.5-flash)
 */

const API_KEY = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
  if (!API_KEY) {
    return { tags: [], description: '', colors: [] };
  }

  const modelName = options.model || DEFAULT_MODEL;
  const base64 = imageBuffer.toString('base64');
  const model = `models/${modelName}`;

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT.trim() },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: base64,
            },
          },
        ],
      },
    ],
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const textPart =
    json.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string')?.text?.trim() ||
    '';

  return parseResponse(textPart);
}
