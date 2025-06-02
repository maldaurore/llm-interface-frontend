// No specific import from types.js needed if they are JSDoc,
// but ensure AVAILABLE_MODELS structure matches ModelOption JSDoc.

/** @type {import('./types.js').ModelOption[]} */
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash' },
  // Per instructions, only 'gemini-2.5-flash-preview-04-17' for general text tasks.
  // Add 'imagen-3.0-generate-002' if image generation features are added.
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;

export const GEMINI_API_KEY_ENV_VAR_NAME = 'API_KEY'; // For reference, use process.env.API_KEY
