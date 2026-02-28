/** Images per page in gallery grid */
export const PER_PAGE = 20;

/** Max files allowed in upload queue */
export const MAX_FILES = 10;

/** Accepted MIME types for image upload (input accept + validation) */
export const ACCEPT_IMAGE_TYPES = 'image/jpeg,image/png';

/** AI provider options for settings */
export const AI_PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
];

/** AI models per provider (value, label) */
export const AI_MODELS = {
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ],
};
