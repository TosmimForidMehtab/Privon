import path from 'node:path';
import { stat } from 'node:fs/promises';
import { AIClient } from './ai/client.js';
import { createMockResponse } from './ai/mock.js';
import { buildPrompt } from './ai/prompt.js';
import { detectTheme } from './colors.js';
import { detectProject } from './detector.js';
import { loadEnv } from './env.js';
import { ConfigurationError } from './errors.js';
import { normalizeGeneratedContent } from './model.js';
import { scanProject } from './scanner.js';
import { writePages } from './writer.js';

function isoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new ConfigurationError('The effective date is invalid. Use a date accepted by JavaScript, such as 2026-09-13.');
  return date.toISOString().slice(0, 10);
}

function mockEnabled(value) {
  if (typeof value === 'boolean') return value;
  return /^(?:1|true|yes)$/i.test(process.env.PRI_AI_MOCK || '');
}

export async function generateLegalPages(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('not a directory');
  } catch {
    throw new ConfigurationError(`Project root does not exist or is not a directory: ${root}`);
  }

  if (options.loadEnv !== false) await loadEnv(root);
  const country = String(options.country || 'India').trim() || 'India';
  const date = isoDate(options.date);
  const [project, scan, theme] = await Promise.all([
    detectProject(root),
    scanProject(root, {
      fullScan: options.fullScan,
      maxFiles: options.maxFiles,
      maxBytes: options.maxBytes,
      maxFileBytes: options.maxFileBytes
    }),
    detectTheme(root)
  ]);

  const mock = mockEnabled(options.mock);
  const rawContent = mock
    ? createMockResponse({ project, scan, country, date })
    : await (options.client || new AIClient({
      url: options.aiUrl,
      model: options.aiModel,
      apiKey: options.aiApiKey,
      provider: options.provider,
      fetch: options.fetch,
      maxTokens: options.maxTokens,
      headers: options.headers
    })).generate(buildPrompt({ scan, project, country, theme, date }));

  const fallbackName = project.packageName || path.basename(root);
  const content = normalizeGeneratedContent(rawContent, fallbackName, date);
  const output = await writePages({
    root, project, content, theme,
    force: Boolean(options.force),
    dryRun: Boolean(options.dryRun)
  });

  return { root, country, date, mock, project, scan: { files: scan.documents.map((item) => item.path), totalBytes: scan.totalBytes, truncated: scan.truncated, fullScan: scan.fullScan }, theme, content, output };
}
