import path from 'node:path';
import { access, readdir } from 'node:fs/promises';
import { readText, toPosix } from './utils.js';

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function hasPageFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.some((entry) => entry.isDirectory() || /\.(jsx?|tsx?)$/.test(entry.name));
  } catch {
    return false;
  }
}

export async function detectProject(root) {
  let pkg = {};
  try { pkg = JSON.parse(await readText(path.join(root, 'package.json'), '{}')); } catch { /* invalid package */ }
  const dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const has = (name) => Boolean(dependencies[name]);
  const typescript = await exists(path.join(root, 'tsconfig.json'));

  if (has('next')) {
    const appCandidates = ['app', 'src/app'];
    const pagesCandidates = ['pages', 'src/pages'];
    for (const candidate of appCandidates) {
      if (await hasPageFiles(path.join(root, candidate))) {
        return { framework: 'next', router: 'app', sourceDirectory: candidate, typescript, packageName: pkg.name };
      }
    }
    for (const candidate of pagesCandidates) {
      if (await hasPageFiles(path.join(root, candidate))) {
        return { framework: 'next', router: 'pages', sourceDirectory: candidate, typescript, packageName: pkg.name };
      }
    }
    return { framework: 'next', router: 'app', sourceDirectory: 'app', typescript, packageName: pkg.name };
  }

  if (has('@angular/core') || await exists(path.join(root, 'angular.json'))) {
    return { framework: 'angular', router: 'angular', sourceDirectory: 'src/app', typescript: true, packageName: pkg.name };
  }

  if (has('react') || has('react-dom')) {
    return {
      framework: 'react',
      router: has('react-router-dom') ? 'react-router' : 'none',
      sourceDirectory: 'src',
      typescript,
      packageName: pkg.name
    };
  }

  const htmlFiles = [];
  try {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isFile() && /\.html?$/i.test(entry.name)) htmlFiles.push(toPosix(entry.name));
    }
  } catch { /* inaccessible root is handled by caller */ }
  return { framework: htmlFiles.length ? 'html' : 'generic', router: 'none', sourceDirectory: '.', typescript: false, packageName: pkg.name, htmlFiles };
}

export { exists };
