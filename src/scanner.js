import path from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import { SKIP_DIRECTORIES, toPosix } from './utils.js';

const DOCUMENT_NAMES = new Set([
  'readme.md', 'requirements.md', 'requirement.md', 'prd.md', 'plan.md',
  'spec.md', 'specification.md', 'architecture.md', 'design.md', 'features.md',
  'product.md', 'overview.md', 'docs.md', 'contributing.md', 'changelog.md'
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.html', '.htm', '.css',
  '.scss', '.sass', '.less', '.vue', '.svelte', '.json', '.yaml', '.yml',
  '.py', '.rb', '.php', '.java', '.kt', '.go', '.rs', '.cs', '.swift',
  '.md', '.mdx', '.txt'
]);

async function walk(root, current, files, options, depth = 0) {
  if (files.length >= options.maxFiles || depth > options.maxDepth) return;
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (files.length >= options.maxFiles) break;
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
        await walk(root, absolute, files, options, depth + 1);
      }
      continue;
    }
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    const relative = toPosix(path.relative(root, absolute));
    const extension = path.extname(lower);
    const inDocsFolder = relative.toLowerCase().startsWith('docs/');
    const include = options.fullScan
      ? CODE_EXTENSIONS.has(extension)
      : DOCUMENT_NAMES.has(lower) || (inDocsFolder && ['.md', '.mdx'].includes(extension));
    if (include) files.push(absolute);
  }
}

export async function scanProject(root, options = {}) {
  const settings = {
    fullScan: Boolean(options.fullScan),
    maxFiles: options.maxFiles ?? (options.fullScan ? 200 : 40),
    maxBytes: options.maxBytes ?? 350_000,
    maxFileBytes: options.maxFileBytes ?? 40_000,
    maxDepth: options.maxDepth ?? (options.fullScan ? 12 : 4)
  };
  const candidates = [];
  await walk(root, root, candidates, settings);
  const documents = [];
  let totalBytes = 0;
  let truncated = false;
  for (const file of candidates) {
    let fileStat;
    try {
      fileStat = await stat(file);
    } catch {
      continue;
    }
    if (totalBytes >= settings.maxBytes) {
      truncated = true;
      continue;
    }
    const remaining = settings.maxBytes - totalBytes;
    let content;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    if (content.includes('\u0000')) continue;
    const allowed = Math.min(settings.maxFileBytes, remaining);
    if (Buffer.byteLength(content) > allowed) {
      content = Buffer.from(content).subarray(0, allowed).toString('utf8');
      truncated = true;
    }
    totalBytes += Buffer.byteLength(content);
    documents.push({ path: toPosix(path.relative(root, file)), content });
  }
  return { documents, totalBytes, truncated, fullScan: settings.fullScan };
}

export function formatScanForPrompt(scan) {
  if (!scan.documents.length) return 'No project documentation was found.';
  return scan.documents.map(({ path: file, content }) =>
    `\n--- FILE: ${file} ---\n${content}`
  ).join('\n');
}
