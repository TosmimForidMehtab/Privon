import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { exists } from './detector.js';
import { renderAngularPage, renderHtmlPage, renderReactPage } from './templates.js';
import { isInside, toPosix } from './utils.js';

async function writeGenerated(root, relative, content, options, manifest) {
  const absolute = path.resolve(root, relative);
  if (!isInside(root, absolute)) throw new Error(`Refusing to write outside the project: ${relative}`);
  const alreadyExists = await exists(absolute);
  if (alreadyExists && !options.force) {
    manifest.skipped.push(toPosix(relative));
    return false;
  }
  if (!options.dryRun) {
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');
  }
  manifest.files.push(toPosix(relative));
  return true;
}

function relativeImport(fromFile, targetWithoutExtension) {
  let value = toPosix(path.relative(path.dirname(fromFile), targetWithoutExtension));
  if (!value.startsWith('.')) value = `./${value}`;
  return value;
}

async function findFirst(root, candidates) {
  for (const relative of candidates) if (await exists(path.join(root, relative))) return relative;
  return undefined;
}

async function integrateReactRouter(root, pages, options, manifest) {
  const routeFile = await findFirst(root, [
    'src/App.tsx', 'src/App.jsx', 'src/App.ts', 'src/App.js',
    'src/routes.tsx', 'src/routes.jsx', 'src/router.tsx', 'src/router.jsx'
  ]);
  if (!routeFile) {
    manifest.warnings.push('React Router was detected, but no conventional route file was found. Import the generated components and add /privacy-policy and /terms-of-use routes manually.');
    return;
  }
  const absolute = path.join(root, routeFile);
  let source = await readFile(absolute, 'utf8');
  if (!/<Routes(?:\s|>)/.test(source)) {
    manifest.warnings.push(`${toPosix(routeFile)} does not contain a <Routes> element; routes were not modified.`);
    return;
  }
  const privacyImport = `import PrivacyPolicy from '${relativeImport(routeFile, pages.privacy)}';`;
  const termsImport = `import TermsOfUse from '${relativeImport(routeFile, pages.terms)}';`;
  const routeImport = "import { Route as PrivonRoute } from 'react-router-dom';";
  const addPrivacy = !/path=["']\/privacy-policy["']/.test(source);
  const addTerms = !/path=["']\/terms-of-use["']/.test(source);
  if (!addPrivacy && !addTerms) return;
  if (addPrivacy && !source.includes(privacyImport)) source = `${privacyImport}\n${source}`;
  if (addTerms && !source.includes(termsImport)) source = `${termsImport}\n${source}`;
  if (!source.includes(routeImport)) source = `${routeImport}\n${source}`;
  if (addPrivacy) {
    source = source.replace(/<Routes([^>]*)>/, `<Routes$1>\n        <PrivonRoute path="/privacy-policy" element={<PrivacyPolicy />} />`);
  }
  if (addTerms) {
    source = source.replace(/<Routes([^>]*)>/, `<Routes$1>\n        <PrivonRoute path="/terms-of-use" element={<TermsOfUse />} />`);
  }
  if (!options.dryRun) await writeFile(absolute, source, 'utf8');
  manifest.integrations.push(toPosix(routeFile));
}

async function integrateAngularRouter(root, pages, options, manifest) {
  const routeFile = await findFirst(root, ['src/app/app.routes.ts', 'src/app/app-routing.module.ts']);
  if (!routeFile) {
    manifest.warnings.push('Angular was detected, but no app.routes.ts or app-routing.module.ts was found. Add the generated standalone components to your router manually.');
    return;
  }
  const absolute = path.join(root, routeFile);
  let source = await readFile(absolute, 'utf8');
  if (!/(?:const|export\s+const)\s+routes\s*(?::\s*Routes)?\s*=\s*\[/.test(source)) {
    manifest.warnings.push(`${toPosix(routeFile)} has no conventional routes array; routes were not modified.`);
    return;
  }
  const privacyImport = `import { PrivacyPolicyComponent } from '${relativeImport(routeFile, pages.privacy)}';`;
  const termsImport = `import { TermsOfUseComponent } from '${relativeImport(routeFile, pages.terms)}';`;
  const addPrivacy = !/path:\s*["']privacy-policy["']/.test(source);
  const addTerms = !/path:\s*["']terms-of-use["']/.test(source);
  if (!addPrivacy && !addTerms) return;
  if (addPrivacy && !source.includes(privacyImport)) source = `${privacyImport}\n${source}`;
  if (addTerms && !source.includes(termsImport)) source = `${termsImport}\n${source}`;
  const routeArray = /((?:const|export\s+const)\s+routes\s*(?::\s*Routes)?\s*=\s*\[)/;
  if (addPrivacy) {
    source = source.replace(routeArray, `$1\n  { path: 'privacy-policy', component: PrivacyPolicyComponent },`);
  }
  if (addTerms) {
    source = source.replace(routeArray, `$1\n  { path: 'terms-of-use', component: TermsOfUseComponent },`);
  }
  if (!options.dryRun) await writeFile(absolute, source, 'utf8');
  manifest.integrations.push(toPosix(routeFile));
}

export async function writePages({ root, project, content, theme, force = false, dryRun = false }) {
  const options = { force, dryRun };
  const manifest = { files: [], skipped: [], integrations: [], warnings: [] };
  const common = { projectName: content.projectName, theme };

  if (project.framework === 'next') {
    const extension = project.typescript ? 'tsx' : 'jsx';
    if (project.router === 'app') {
      await writeGenerated(root, path.join(project.sourceDirectory, 'privacy-policy', `page.${extension}`), renderReactPage({ ...common, document: content.privacyPolicy, componentName: 'PrivacyPolicyPage', nextApp: true, typescript: project.typescript }), options, manifest);
      await writeGenerated(root, path.join(project.sourceDirectory, 'terms-of-use', `page.${extension}`), renderReactPage({ ...common, document: content.termsOfUse, componentName: 'TermsOfUsePage', nextApp: true, typescript: project.typescript }), options, manifest);
    } else {
      await writeGenerated(root, path.join(project.sourceDirectory, `privacy-policy.${extension}`), renderReactPage({ ...common, document: content.privacyPolicy, componentName: 'PrivacyPolicyPage', typescript: project.typescript }), options, manifest);
      await writeGenerated(root, path.join(project.sourceDirectory, `terms-of-use.${extension}`), renderReactPage({ ...common, document: content.termsOfUse, componentName: 'TermsOfUsePage', typescript: project.typescript }), options, manifest);
    }
    return manifest;
  }

  if (project.framework === 'react') {
    const extension = project.typescript ? 'tsx' : 'jsx';
    const privacy = path.join(project.sourceDirectory, 'pages', 'PrivacyPolicy');
    const terms = path.join(project.sourceDirectory, 'pages', 'TermsOfUse');
    await writeGenerated(root, `${privacy}.${extension}`, renderReactPage({ ...common, document: content.privacyPolicy, componentName: 'PrivacyPolicy', typescript: project.typescript }), options, manifest);
    await writeGenerated(root, `${terms}.${extension}`, renderReactPage({ ...common, document: content.termsOfUse, componentName: 'TermsOfUse', typescript: project.typescript }), options, manifest);
    if (project.router === 'react-router') await integrateReactRouter(root, { privacy, terms }, options, manifest);
    else manifest.warnings.push('React Router was not detected. Components were generated without modifying application navigation.');
    return manifest;
  }

  if (project.framework === 'angular') {
    const privacy = path.join(project.sourceDirectory, 'privacy-policy', 'privacy-policy.component');
    const terms = path.join(project.sourceDirectory, 'terms-of-use', 'terms-of-use.component');
    await writeGenerated(root, `${privacy}.ts`, renderAngularPage({ ...common, document: content.privacyPolicy, componentName: 'PrivacyPolicyComponent', selector: 'app-privacy-policy' }), options, manifest);
    await writeGenerated(root, `${terms}.ts`, renderAngularPage({ ...common, document: content.termsOfUse, componentName: 'TermsOfUseComponent', selector: 'app-terms-of-use' }), options, manifest);
    await integrateAngularRouter(root, { privacy, terms }, options, manifest);
    return manifest;
  }

  await writeGenerated(root, 'privacy-policy.html', renderHtmlPage({ ...common, document: content.privacyPolicy }), options, manifest);
  await writeGenerated(root, 'terms-of-use.html', renderHtmlPage({ ...common, document: content.termsOfUse }), options, manifest);
  return manifest;
}
