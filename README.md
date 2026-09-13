# Privon

Privon is a dependency-free Node.js SDK and CLI that drafts a privacy policy and terms of use from a project's documentation, then creates pages appropriate for the detected frontend stack.

> Generated legal text is a draft, not legal advice. Before publishing, review it for your real data practices and add the operator's legal name, address, contact email, and any product-specific disclosures.

## What it supports

| Project | Output | Integration |
| --- | --- | --- |
| Next.js App Router | `app/privacy-policy/page.*` and `app/terms-of-use/page.*` (also supports `src/app`) | File-system routing |
| Next.js Pages Router | `pages/privacy-policy.*` and `pages/terms-of-use.*` (also supports `src/pages`) | File-system routing |
| React + React Router | Two components under `src/pages` | Adds routes to a conventional `src/App.*`, `routes.*`, or `router.*` containing `<Routes>` |
| React without React Router | Two components under `src/pages` | Components only, with a warning |
| Angular | Two standalone components under `src/app` | Adds routes to `app.routes.ts` or `app-routing.module.ts` when conventional routing is found |
| HTML, backend, or generic project | `privacy-policy.html` and `terms-of-use.html` | Standalone HTML |

Pages use inline styling. Privon looks for colors in conventional home, header, footer, layout, global, and theme files and otherwise uses a neutral default palette.

## Requirements

- Node.js 18 or newer
- An AI endpoint compatible with OpenAI chat completions, Anthropic Messages, or Google Gemini generateContent

Set these variables in the shell or a `.env` file in the target project. Existing process environment values take precedence over `.env` values.

```dotenv
PRI_AI_URL=https://api.openai.com/v1
PRI_AI_MODEL=gpt-4.1-mini
PRI_AI_API_KEY=your-key
```

Anthropic example:

```dotenv
PRI_AI_URL=https://api.anthropic.com
PRI_AI_MODEL=claude-sonnet-4-5
PRI_AI_API_KEY=your-key
```

Gemini example:

```dotenv
PRI_AI_URL=https://generativelanguage.googleapis.com
PRI_AI_MODEL=gemini-2.5-flash
PRI_AI_API_KEY=your-key
```

The URL can be either the provider base URL or the complete generation endpoint. Provider selection is automatic from the URL and can be overridden with `--provider` or the SDK's `provider` option.

## CLI

Run against the current project:

```bash
npx privon --country India
```

Run against another directory and include source code in the AI context:

```bash
npx privon ../my-app --country "United Kingdom" --full-scan
```

Use deterministic mock content while developing—no credentials or network request is required:

```bash
npx privon ./example --mock
```

Preview detection and planned writes:

```bash
npx privon --mock --dry-run --json
```

Existing policy pages are never overwritten unless `--force` is supplied.

```text
Usage: privon [path] [options]

  -c, --country <country>   Target country (default: India)
      --full-scan           Include source files in AI context
      --mock                Use deterministic mock AI content
      --force               Overwrite existing generated pages
      --dry-run             Detect and generate without writing files
      --provider <name>     auto, openai, anthropic, or gemini
      --date <YYYY-MM-DD>   Override the effective date
      --json                Print a machine-readable result
```

`PRI_AI_MOCK=1` is equivalent to `--mock`.

## SDK

```js
import { generateLegalPages } from 'privon';

const result = await generateLegalPages({
  root: process.cwd(),
  country: 'India',
  fullScan: false
});

console.log(result.project);
console.log(result.output.files);
```

Development/mock usage:

```js
const result = await generateLegalPages({
  root: './fixtures/react-app',
  country: 'India',
  mock: true,
  dryRun: false
});
```

Custom credentials and transport can be passed without changing global environment variables:

```js
await generateLegalPages({
  aiUrl: 'https://provider.example/v1',
  aiModel: 'model-name',
  aiApiKey: process.env.MY_PROVIDER_KEY,
  provider: 'openai',
  headers: { 'X-Organization': 'example' },
  fetch: customFetch
});
```

Important options:

- `root`: target project; defaults to `process.cwd()`.
- `country`: drafting jurisdiction; defaults to `India`.
- `fullScan`: scans bounded text/source files instead of product Markdown only.
- `force`: overwrites existing generated pages. Off by default.
- `dryRun`: returns detection, content, and intended writes without changing files.
- `mock`: uses a deterministic local response.
- `maxFiles`, `maxBytes`, `maxFileBytes`: cap AI context size.
- `client`: provide an object with an async `generate(prompt)` method for a completely custom provider.
- `loadEnv`: set to `false` to disable reading the target project's `.env`.

The resolved result includes framework detection, scanned filenames, selected theme, normalized policy content, created/skipped files, route integrations, and warnings.

## Scanning and privacy

By default Privon reads common product Markdown such as `README.md`, `PRD.md`, `REQUIREMENTS.md`, `PLAN.md`, architecture/specification files, and Markdown under `docs/`. It does not scan the complete codebase unless `fullScan`/`--full-scan` is enabled.

Even in full-scan mode, generated/build/vendor directories, hidden directories, binary files, and oversized inputs are excluded. The scanned text is sent to the configured AI provider, so review your provider's data terms before using full scan on sensitive repositories.

## Safe generation behavior

- Generated paths are constrained to the target project.
- Existing legal pages are preserved unless force mode is explicit.
- AI output is normalized into a strict document schema; the provider cannot choose arbitrary filesystem paths.
- Router files are changed only when a conventional, recognizable route container is found. Otherwise Privon creates the pages and reports a manual integration warning.
- The project is never executed by Privon.

## Publishing

The included GitHub Actions workflow publishes when a GitHub Release is published or when manually dispatched. Before using it:

1. Update the `repository.url` in `package.json`.
2. Add an npm automation token as the `NPM_TOKEN` repository secret (unless your npm trusted-publishing setup removes that requirement).
3. Commit the lockfile, run `npm test`, create a release, and let the workflow publish with npm provenance.

## License

MIT
