import path from 'node:path';
import os from 'node:os';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';

export async function fixture(files = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'privon-test-'));
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');
  }
  return root;
}

export function packageJson(dependencies, extra = {}) {
  return JSON.stringify({ name: 'fixture-app', dependencies, ...extra });
}
