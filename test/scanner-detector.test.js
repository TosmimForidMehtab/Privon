import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { detectProject, scanProject } from '../src/index.js';
import { fixture, packageJson } from './helpers.js';

test('default scan reads product Markdown but excludes source code', async () => {
  const root = await fixture({
    'README.md': '# Sample',
    'docs/architecture.md': '# Architecture',
    'src/secret.js': 'const secret = true;',
    'notes/random.md': '# Not conventional'
  });
  const scan = await scanProject(root);
  assert.deepEqual(scan.documents.map((item) => item.path), ['docs/architecture.md', 'README.md']);
  assert.equal(scan.fullScan, false);
});

test('full scan includes source but skips node_modules', async () => {
  const root = await fixture({
    'src/app.ts': 'export const app = true;',
    'node_modules/pkg/index.js': 'doNotRead()',
    'README.md': '# Sample'
  });
  const scan = await scanProject(root, { fullScan: true });
  assert(scan.documents.some((item) => item.path === 'src/app.ts'));
  assert(!scan.documents.some((item) => item.path.includes('node_modules')));
});

test('detects Next.js app and pages routers', async () => {
  const appRoot = await fixture({
    'package.json': packageJson({ next: '^15.0.0', react: '^19.0.0' }),
    'src/app/page.tsx': 'export default function Page() {}',
    'tsconfig.json': '{}'
  });
  assert.deepEqual(await detectProject(appRoot), {
    framework: 'next', router: 'app', sourceDirectory: 'src/app', typescript: true, packageName: 'fixture-app'
  });

  const pagesRoot = await fixture({
    'package.json': packageJson({ next: '^14.0.0' }),
    'pages/index.jsx': 'export default function Page() {}'
  });
  assert.equal((await detectProject(pagesRoot)).router, 'pages');
});

test('detects React Router and Angular', async () => {
  const reactRoot = await fixture({ 'package.json': packageJson({ react: '^18.0.0', 'react-router-dom': '^6.0.0' }) });
  assert.equal((await detectProject(reactRoot)).router, 'react-router');

  const angularRoot = await fixture({ 'angular.json': '{}', 'tsconfig.json': '{}' });
  assert.equal((await detectProject(angularRoot)).framework, 'angular');
});
