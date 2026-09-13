export { generateLegalPages } from './generator.js';
export { detectProject } from './detector.js';
export { detectTheme } from './colors.js';
export { scanProject } from './scanner.js';
export { AIClient, extractResponseText, parseJsonResponse } from './ai/client.js';
export { PrivonError, ConfigurationError, AIResponseError } from './errors.js';

export { generateLegalPages as default } from './generator.js';
