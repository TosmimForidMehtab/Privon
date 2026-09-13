import { AIResponseError, ConfigurationError } from '../errors.js';

function providerFromUrl(url, explicit = 'auto') {
  if (explicit && explicit !== 'auto') return explicit;
  if (/anthropic\.com/i.test(url)) return 'anthropic';
  if (/generativelanguage\.googleapis\.com/i.test(url)) return 'gemini';
  return 'openai';
}

function endpointFor(url, provider, model, key) {
  const trimmed = url.replace(/\/$/, '');
  if (provider === 'anthropic' && !/\/messages(?:\?|$)/.test(trimmed)) {
    return /\/v1$/.test(trimmed) ? `${trimmed}/messages` : `${trimmed}/v1/messages`;
  }
  if (provider === 'gemini') {
    const base = /:generateContent(?:\?|$)/.test(trimmed)
      ? trimmed
      : /\/v1(?:beta)?$/.test(trimmed)
        ? `${trimmed}/models/${encodeURIComponent(model)}:generateContent`
        : `${trimmed}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const join = base.includes('?') ? '&' : '?';
    return `${base}${join}key=${encodeURIComponent(key)}`;
  }
  if (!/(?:chat\/completions|responses|completions)(?:\?|$)/.test(trimmed)) return `${trimmed}/chat/completions`;
  return trimmed;
}

function requestFor(provider, model, prompt, maxTokens, endpoint) {
  if (provider === 'anthropic') {
    return { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] };
  }
  if (provider === 'gemini') {
    return { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens, responseMimeType: 'application/json' } };
  }
  if (/\/responses(?:\?|$)/.test(endpoint)) {
    return { model, input: prompt, max_output_tokens: maxTokens };
  }
  if (/\/completions(?:\?|$)/.test(endpoint) && !/\/chat\/completions(?:\?|$)/.test(endpoint)) {
    return { model, prompt, temperature: 0.2, max_tokens: maxTokens };
  }
  return { model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: maxTokens };
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) =>
    typeof part === 'string' ? part : part?.text ?? part?.content ?? part?.value ?? ''
  ).join('');
  if (content && typeof content === 'object') return content.text ?? content.value ?? '';
  return '';
}

export function extractResponseText(payload) {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return '';
  if (typeof payload.output_text === 'string') return payload.output_text;
  const choice = payload.choices?.[0];
  if (choice) return contentToText(choice.message?.content ?? choice.text);
  if (Array.isArray(payload.content)) return contentToText(payload.content);
  const candidateParts = payload.candidates?.[0]?.content?.parts;
  if (candidateParts) return contentToText(candidateParts);
  if (Array.isArray(payload.output)) {
    return payload.output.flatMap((item) => item.content || item).map(contentToText).join('');
  }
  if (payload.data) return extractResponseText(payload.data);
  return '';
}

export function parseJsonResponse(text) {
  const clean = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(clean); } catch (firstError) {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(clean.slice(start, end + 1)); } catch { /* report original below */ }
    }
    throw new AIResponseError('The AI provider returned text that was not valid JSON.', firstError);
  }
}

export class AIClient {
  constructor(options = {}) {
    this.url = options.url ?? process.env.PRI_AI_URL;
    this.model = options.model ?? process.env.PRI_AI_MODEL;
    this.apiKey = options.apiKey ?? process.env.PRI_AI_API_KEY;
    this.provider = providerFromUrl(this.url || '', options.provider);
    this.fetch = options.fetch ?? globalThis.fetch;
    this.timeout = options.timeout ?? 120_000;
    this.maxTokens = options.maxTokens ?? 8_000;
    this.headers = options.headers ?? {};
  }

  validate() {
    const missing = [!this.url && 'PRI_AI_URL', !this.model && 'PRI_AI_MODEL', !this.apiKey && 'PRI_AI_API_KEY'].filter(Boolean);
    if (missing.length) throw new ConfigurationError(`Missing required AI configuration: ${missing.join(', ')}. Set the environment variables or use mock: true.`);
    if (typeof this.fetch !== 'function') throw new ConfigurationError('No Fetch implementation is available. Privon requires Node.js 18 or newer.');
  }

  async generate(prompt) {
    this.validate();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const headers = { 'content-type': 'application/json', ...this.headers };
    if (this.provider === 'anthropic') {
      headers['x-api-key'] ??= this.apiKey;
      headers['anthropic-version'] ??= '2023-06-01';
    } else if (this.provider !== 'gemini') {
      headers.authorization ??= `Bearer ${this.apiKey}`;
    }
    let response;
    const endpoint = endpointFor(this.url, this.provider, this.model, this.apiKey);
    try {
      response = await this.fetch(endpoint, {
        method: 'POST', headers, body: JSON.stringify(requestFor(this.provider, this.model, prompt, this.maxTokens, endpoint)), signal: controller.signal
      });
    } catch (error) {
      const message = error?.name === 'AbortError' ? `AI request timed out after ${this.timeout}ms.` : `Could not reach the AI provider: ${error.message}`;
      throw new AIResponseError(message, error);
    } finally {
      clearTimeout(timer);
    }
    const raw = await response.text();
    if (!response.ok) throw new AIResponseError(`AI provider returned HTTP ${response.status}: ${raw.slice(0, 500)}`);
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = raw; }
    const text = extractResponseText(payload);
    if (!text) throw new AIResponseError('The AI provider response did not contain recognizable generated content.');
    return parseJsonResponse(text);
  }
}
