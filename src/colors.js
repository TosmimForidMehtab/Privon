import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { SKIP_DIRECTORIES } from './utils.js';

const COLOR_PATTERN = /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)/gi;
const RELEVANT_PATTERN = /(?:home|index|header|footer|navbar|nav|layout|app|global|theme).*(?:css|scss|sass|less|jsx?|tsx?|html?)$/i;
const DEFAULT_THEME = { primary: '#2563eb', background: '#f8fafc', surface: '#ffffff', text: '#172033', muted: '#526072', border: '#dce3ec' };

async function collect(directory, depth = 0, output = []) {
  if (depth > 4 || output.length >= 25) return output;
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return output; }
  for (const entry of entries) {
    if (output.length >= 25) break;
    if (entry.isDirectory() && !SKIP_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
      await collect(path.join(directory, entry.name), depth + 1, output);
    } else if (entry.isFile() && RELEVANT_PATTERN.test(entry.name)) {
      output.push(path.join(directory, entry.name));
    }
  }
  return output;
}

function normalize(color) {
  return color.toLowerCase();
}

function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0.5;
  const values = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function expandHex(value) {
  if (!/^#[0-9a-f]{3}$/i.test(value)) return value;
  return `#${value.slice(1).split('').map((char) => char + char).join('')}`;
}

function isUsableHex(value) {
  return /^#[0-9a-f]{6}$/i.test(expandHex(value));
}

export async function detectTheme(root) {
  const files = await collect(root);
  const colors = [];
  for (const file of files) {
    try {
      const source = (await readFile(file, 'utf8')).slice(0, 80_000);
      for (const match of source.match(COLOR_PATTERN) || []) {
        const color = normalize(match);
        if (isUsableHex(color) && !colors.includes(expandHex(color))) colors.push(expandHex(color));
      }
    } catch { /* use the remaining files */ }
  }
  if (!colors.length) return { ...DEFAULT_THEME, detected: false, sourceFiles: [] };
  const ranked = colors.filter((color) => {
    const light = luminance(color);
    return light > 0.08 && light < 0.82;
  });
  return {
    ...DEFAULT_THEME,
    primary: ranked[0] || DEFAULT_THEME.primary,
    detected: true,
    sourceFiles: files.map((file) => path.relative(root, file))
  };
}

export { DEFAULT_THEME };
