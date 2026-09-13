#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { generateLegalPages } from '../src/index.js';

const HELP = `privon - generate privacy and terms pages

Usage:
  privon [path] [options]

Options:
  -c, --country <country>   Target country (default: India)
      --full-scan           Include source files in AI context
      --mock                Use deterministic mock AI content
      --force               Overwrite existing generated pages
      --dry-run             Detect and generate without writing files
      --provider <name>     auto, openai, anthropic, or gemini
      --date <YYYY-MM-DD>   Effective date (default: today)
      --json                Print the result as JSON
  -h, --help                Show this help
  -v, --version             Show package version

Environment:
  PRI_AI_URL, PRI_AI_MODEL, PRI_AI_API_KEY
  PRI_AI_MOCK=1 can be used instead of --mock during development.
`;

function takeValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value.`);
  return value;
}

function parseArgs(args) {
  const options = {};
  let root;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '-v' || arg === '--version') options.version = true;
    else if (arg === '--mock') options.mock = true;
    else if (arg === '--full-scan') options.fullScan = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '-c' || arg === '--country') { options.country = takeValue(args, index, arg); index += 1; }
    else if (arg === '--provider') { options.provider = takeValue(args, index, arg); index += 1; }
    else if (arg === '--date') { options.date = takeValue(args, index, arg); index += 1; }
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (!root) root = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  options.root = root;
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(HELP); return; }
  if (options.version) {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(pkg.version);
    return;
  }
  const result = await generateLegalPages(options);
  if (options.json) { console.log(JSON.stringify(result, null, 2)); return; }
  const detected = `${result.project.framework}${result.project.router !== 'none' ? ` / ${result.project.router}` : ''}`;
  console.log(`Privon generated legal pages for ${result.content.projectName}.`);
  console.log(`Detected: ${detected} | Country: ${result.country} | AI: ${result.mock ? 'mock' : 'configured provider'}`);
  for (const file of result.output.files) console.log(`  created  ${file}`);
  for (const file of result.output.integrations) console.log(`  updated  ${file}`);
  for (const file of result.output.skipped) console.log(`  skipped  ${file} (already exists; use --force)`);
  for (const warning of result.output.warnings) console.warn(`  warning  ${warning}`);
  if (options.dryRun) console.log('Dry run: no files were written.');
}

main().catch((error) => {
  console.error(`privon: ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
});
