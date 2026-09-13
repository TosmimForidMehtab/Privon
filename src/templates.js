function safeJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function reactStyles(theme, typescript) {
  return `const styles = {
  page: { minHeight: '100vh', background: '${theme.background}', color: '${theme.text}', padding: '48px 20px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: 1.7 },
  article: { maxWidth: 840, margin: '0 auto', background: '${theme.surface}', border: '1px solid ${theme.border}', borderRadius: 18, padding: 'clamp(24px, 5vw, 56px)', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)' },
  eyebrow: { color: '${theme.primary}', fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 },
  title: { fontSize: 'clamp(2rem, 5vw, 3.25rem)', letterSpacing: '-0.035em', lineHeight: 1.1, margin: '8px 0 12px' },
  updated: { color: '${theme.muted}', fontSize: 14, marginBottom: 32 },
  section: { marginTop: 32 },
  heading: { fontSize: 22, lineHeight: 1.3, marginBottom: 10 },
  paragraph: { margin: '10px 0' },
  list: { paddingLeft: 24, margin: '10px 0' },
  notice: { borderLeft: '4px solid ${theme.primary}', background: '${theme.background}', padding: '12px 16px', borderRadius: 6, marginBottom: 28 }
}${typescript ? ' as const' : ''};`;
}

function reactBody() {
  return `  return (
    <main style={styles.page}>
      <article style={styles.article}>
        <p style={styles.eyebrow}>{projectName}</p>
        <h1 style={styles.title}>{document.title}</h1>
        <p style={styles.updated}>Effective date: {document.lastUpdated}</p>
        <div style={styles.notice}>Please review this generated draft and add your legal identity and contact details before publishing.</div>
        {document.intro.map((paragraph, index) => <p style={styles.paragraph} key={\`intro-\${index}\`}>{paragraph}</p>)}
        {document.sections.map((section, index) => (
          <section style={styles.section} key={\`section-\${index}\`}>
            <h2 style={styles.heading}>{section.heading}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => <p style={styles.paragraph} key={\`p-\${paragraphIndex}\`}>{paragraph}</p>)}
            {section.bullets.length > 0 && <ul style={styles.list}>{section.bullets.map((bullet, bulletIndex) => <li key={\`b-\${bulletIndex}\`}>{bullet}</li>)}</ul>}
          </section>
        ))}
      </article>
    </main>
  );`;
}

export function renderReactPage({ document, projectName, theme, componentName, nextApp = false, typescript = false }) {
  return `${nextApp ? `export const metadata = { title: ${safeJson(document.title)} };\n\n` : ''}const projectName = ${safeJson(projectName)};
const document = ${safeJson(document)};

${reactStyles(theme, typescript)}

export default function ${componentName}() {
${reactBody()}
}
`;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function renderHtmlPage({ document, projectName, theme }) {
  const intro = document.intro.map((item) => `<p>${escapeHtml(item)}</p>`).join('\n');
  const sections = document.sections.map((section) => `<section>
<h2>${escapeHtml(section.heading)}</h2>
${section.paragraphs.map((item) => `<p>${escapeHtml(item)}</p>`).join('\n')}
${section.bullets.length ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
</section>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(document.title)} | ${escapeHtml(projectName)}</title>
</head>
<body style="margin:0;background:${theme.background};color:${theme.text};font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7">
  <main style="min-height:100vh;padding:48px 20px;box-sizing:border-box">
    <article style="max-width:840px;margin:0 auto;background:${theme.surface};border:1px solid ${theme.border};border-radius:18px;padding:clamp(24px,5vw,56px);box-sizing:border-box;box-shadow:0 18px 50px rgba(15,23,42,.08)">
      <p style="color:${theme.primary};font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0">${escapeHtml(projectName)}</p>
      <h1 style="font-size:clamp(2rem,5vw,3.25rem);letter-spacing:-.035em;line-height:1.1;margin:8px 0 12px">${escapeHtml(document.title)}</h1>
      <p style="color:${theme.muted};font-size:14px;margin-bottom:32px">Effective date: ${escapeHtml(document.lastUpdated)}</p>
      <aside style="border-left:4px solid ${theme.primary};background:${theme.background};padding:12px 16px;border-radius:6px;margin-bottom:28px">Please review this generated draft and add your legal identity and contact details before publishing.</aside>
      ${intro}
      ${sections}
    </article>
  </main>
</body>
</html>
`;
}

export function renderAngularPage({ document, projectName, theme, componentName, selector }) {
  const json = safeJson(document);
  return `import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: '${selector}',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <main [ngStyle]="styles.page">
      <article [ngStyle]="styles.article">
        <p [ngStyle]="styles.eyebrow">{{ projectName }}</p>
        <h1 [ngStyle]="styles.title">{{ document.title }}</h1>
        <p [ngStyle]="styles.updated">Effective date: {{ document.lastUpdated }}</p>
        <aside [ngStyle]="styles.notice">Please review this generated draft and add your legal identity and contact details before publishing.</aside>
        <p *ngFor="let paragraph of document.intro">{{ paragraph }}</p>
        <section *ngFor="let section of document.sections" [ngStyle]="styles.section">
          <h2 [ngStyle]="styles.heading">{{ section.heading }}</h2>
          <p *ngFor="let paragraph of section.paragraphs">{{ paragraph }}</p>
          <ul *ngIf="section.bullets.length"><li *ngFor="let bullet of section.bullets">{{ bullet }}</li></ul>
        </section>
      </article>
    </main>
  \`
})
export class ${componentName} {
  readonly projectName = ${safeJson(projectName)};
  readonly document = ${json};
  readonly styles = {
    page: { minHeight: '100vh', background: '${theme.background}', color: '${theme.text}', padding: '48px 20px', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: '1.7' },
    article: { maxWidth: '840px', margin: '0 auto', background: '${theme.surface}', border: '1px solid ${theme.border}', borderRadius: '18px', padding: 'clamp(24px, 5vw, 56px)', boxShadow: '0 18px 50px rgba(15,23,42,.08)' },
    eyebrow: { color: '${theme.primary}', fontSize: '14px', fontWeight: '700', letterSpacing: '.08em', textTransform: 'uppercase' },
    title: { fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: '1.1' },
    updated: { color: '${theme.muted}', fontSize: '14px', marginBottom: '32px' },
    notice: { borderLeft: '4px solid ${theme.primary}', background: '${theme.background}', padding: '12px 16px', borderRadius: '6px' },
    section: { marginTop: '32px' },
    heading: { fontSize: '22px' }
  };
}
`;
}
