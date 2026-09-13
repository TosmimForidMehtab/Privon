import { AIResponseError } from './errors.js';

function strings(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function normalizeDocument(value, fallbackTitle, fallbackDate) {
  if (!value || typeof value !== 'object') throw new AIResponseError(`AI response is missing ${fallbackTitle}.`);
  const sections = Array.isArray(value.sections) ? value.sections.map((item) => ({
    heading: typeof item?.heading === 'string' ? item.heading.trim() : '',
    paragraphs: strings(item?.paragraphs),
    bullets: strings(item?.bullets)
  })).filter((item) => item.heading && (item.paragraphs.length || item.bullets.length)) : [];
  if (!sections.length) throw new AIResponseError(`${fallbackTitle} did not contain any usable sections.`);
  return {
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : fallbackTitle,
    lastUpdated: typeof value.lastUpdated === 'string' && value.lastUpdated.trim() ? value.lastUpdated.trim() : fallbackDate,
    intro: strings(value.intro),
    sections
  };
}

export function normalizeGeneratedContent(value, fallbackName, date) {
  if (!value || typeof value !== 'object') throw new AIResponseError('AI response was not an object.');
  return {
    projectName: typeof value.projectName === 'string' && value.projectName.trim() ? value.projectName.trim() : fallbackName,
    summary: typeof value.summary === 'string' ? value.summary.trim() : '',
    privacyPolicy: normalizeDocument(value.privacyPolicy, 'Privacy Policy', date),
    termsOfUse: normalizeDocument(value.termsOfUse, 'Terms of Use', date)
  };
}
