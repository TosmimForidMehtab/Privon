import path from 'node:path';
import { readFile } from 'node:fs/promises';

export const SKIP_DIRECTORIES = new Set([
  '.git', '.next', '.nuxt', '.output', '.turbo', '.vercel',
  'node_modules', 'dist', 'build', 'coverage', 'vendor', 'target'
]);

export function toPosix(value) {
  return value.split(path.sep).join('/');
}

export async function readText(file, fallback) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (arguments.length > 1) return fallback;
    throw error;
  }
}

export function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
