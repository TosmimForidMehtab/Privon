import { formatScanForPrompt } from '../scanner.js';

export function buildPrompt({ scan, project, country, theme, date }) {
  return `You are a careful legal-document drafting assistant and web content architect.

Create a privacy policy and terms of use for the software project described below. The documents must be tailored to the project's actual features and data practices, use plain language, and be localized for ${country}. Do not claim certifications, security controls, payment flows, data collection, or third-party services unless supported by the supplied project context. Where facts are unknown, phrase the text conservatively and tell users to contact the operator. Include the important topics normally expected for this project and jurisdiction. This is a draft for operator/legal review, not a claim of legal advice.

Project technology: ${project.framework}${project.router !== 'none' ? ` (${project.router})` : ''}
Page color theme: primary ${theme.primary}, background ${theme.background}, text ${theme.text}
Effective date: ${date}

Return ONLY valid JSON with exactly this shape (no Markdown fence):
{
  "projectName": "string",
  "summary": "one-sentence project description",
  "privacyPolicy": {
    "title": "Privacy Policy",
    "lastUpdated": "${date}",
    "intro": ["paragraph"],
    "sections": [{"heading": "string", "paragraphs": ["string"], "bullets": ["optional bullet"]}]
  },
  "termsOfUse": {
    "title": "Terms of Use",
    "lastUpdated": "${date}",
    "intro": ["paragraph"],
    "sections": [{"heading": "string", "paragraphs": ["string"], "bullets": ["optional bullet"]}]
  }
}

PROJECT CONTEXT:
${formatScanForPrompt(scan)}`;
}
