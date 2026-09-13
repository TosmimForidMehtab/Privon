import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { generateLegalPages } from '../src/index.js';
import { fixture, packageJson } from './helpers.js';

test('generates standalone HTML with mock content for a generic project', async () => {
  const root = await fixture({ 'README.md': '# Inventory API\nA backend inventory service.' });
  const result = await generateLegalPages({ root, mock: true, date: '2026-01-02' });
  assert.equal(result.country, 'India');
  assert.deepEqual(result.output.files, ['privacy-policy.html', 'terms-of-use.html']);
  const privacy = await readFile(path.join(root, 'privacy-policy.html'), 'utf8');
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /Inventory API/);
  assert.match(privacy, /2026-01-02/);
});

test('generates Next App Router pages under the detected source directory', async () => {
  const root = await fixture({
    'package.json': packageJson({ next: '^15.0.0', react: '^19.0.0' }),
    'tsconfig.json': '{}',
    'src/app/page.tsx': 'export default function Home() { return null; }'
  });
  const result = await generateLegalPages({ root, mock: true });
  assert.deepEqual(result.output.files, ['src/app/privacy-policy/page.tsx', 'src/app/terms-of-use/page.tsx']);
  const page = await readFile(path.join(root, 'src/app/privacy-policy/page.tsx'), 'utf8');
  assert.match(page, /export const metadata/);
  assert.match(page, /style=\{styles\.page\}/);
});

test('creates React components and integrates conventional React Router routes', async () => {
  const root = await fixture({
    'package.json': packageJson({ react: '^18.0.0', 'react-router-dom': '^6.0.0' }),
    'src/App.jsx': "import { Routes, Route } from 'react-router-dom';\nexport default function App() { return <Routes><Route path=\"/\" element={<div />} /></Routes>; }"
  });
  const result = await generateLegalPages({ root, mock: true });
  assert.deepEqual(result.output.files, ['src/pages/PrivacyPolicy.jsx', 'src/pages/TermsOfUse.jsx']);
  assert.deepEqual(result.output.integrations, ['src/App.jsx']);
  const app = await readFile(path.join(root, 'src/App.jsx'), 'utf8');
  assert.match(app, /path="\/privacy-policy"/);
  assert.match(app, /path="\/terms-of-use"/);
  assert.match(app, /import PrivacyPolicy from '\.\/pages\/PrivacyPolicy';/);
  assert.match(app, /Route as PrivonRoute/);
});

test('creates Angular standalone components and adds routes', async () => {
  const root = await fixture({
    'angular.json': '{}',
    'src/app/app.routes.ts': "import { Routes } from '@angular/router';\nexport const routes: Routes = [];"
  });
  const result = await generateLegalPages({ root, mock: true });
  assert.deepEqual(result.output.files, [
    'src/app/privacy-policy/privacy-policy.component.ts',
    'src/app/terms-of-use/terms-of-use.component.ts'
  ]);
  const routes = await readFile(path.join(root, 'src/app/app.routes.ts'), 'utf8');
  assert.match(routes, /PrivacyPolicyComponent/);
  assert.match(routes, /path: 'terms-of-use'/);
});

test('preserves existing pages unless force is enabled', async () => {
  const root = await fixture({ 'privacy-policy.html': 'keep me' });
  const first = await generateLegalPages({ root, mock: true });
  assert.deepEqual(first.output.skipped, ['privacy-policy.html']);
  assert.equal(await readFile(path.join(root, 'privacy-policy.html'), 'utf8'), 'keep me');
  await generateLegalPages({ root, mock: true, force: true });
  assert.match(await readFile(path.join(root, 'privacy-policy.html'), 'utf8'), /Privacy Policy/);
});

test('dry run does not write files', async () => {
  const root = await fixture();
  const result = await generateLegalPages({ root, mock: true, dryRun: true });
  assert.equal(result.output.files.length, 2);
  await assert.rejects(readFile(path.join(root, 'privacy-policy.html'), 'utf8'), /ENOENT/);
});

test('accepts a custom AI client without provider environment variables', async () => {
  const root = await fixture({ 'package.json': packageJson({}) });
  let prompt = '';
  const document = (title) => ({
    title,
    lastUpdated: '2026-02-03',
    intro: ['Intro'],
    sections: [{ heading: 'Details', paragraphs: ['Tailored content'], bullets: [] }]
  });
  const result = await generateLegalPages({
    root,
    date: '2026-02-03',
    dryRun: true,
    client: { generate: async (value) => {
      prompt = value;
      return { projectName: 'Custom AI App', privacyPolicy: document('Privacy Policy'), termsOfUse: document('Terms of Use') };
    } }
  });
  assert.equal(result.mock, false);
  assert.equal(result.content.projectName, 'Custom AI App');
  assert.match(prompt, /localized for India/);
});
