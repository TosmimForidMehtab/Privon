import path from 'node:path';
import { readFile } from 'node:fs/promises';

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export async function loadEnv(root, target = process.env) {
  const candidates = ['.env.local', '.env'];
  for (const name of candidates) {
    let source;
    try {
      source = await readFile(path.join(root, name), 'utf8');
    } catch {
      continue;
    }
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][\w]*)\s*=\s*(.*)\s*$/);
      if (!match || match[1] in target) continue;
      target[match[1]] = unquote(match[2].replace(/\s+#.*$/, ''));
    }
  }
  return target;
}
