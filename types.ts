/**
 * Enum for message sender.
 * @readonly
 * @enum {string}
 */
export const Sender = {
  USER: 'user',
  AI: 'ai',
};

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} text
 * @property {Sender[keyof Sender]} sender - user or ai
 * @property {number} timestamp
 * @property {boolean} [isError] - Optional flag for error messages
 * @property {Array<object>} [groundingChunks] - Optional for search grounding results
 */

/**
 * @typedef {Object} ModelOption
 * @property {string} id
 * @property {string} name
 */

// No actual code needed here beyond exports if types are primarily for JSDoc.
// The Sender object is exported for runtime use.
