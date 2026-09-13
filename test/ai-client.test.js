import assert from 'node:assert/strict';
import test from 'node:test';
import { AIClient, extractResponseText, parseJsonResponse } from '../src/index.js';

test('extracts common provider response formats', () => {
  assert.equal(extractResponseText({ choices: [{ message: { content: '{"a":1}' } }] }), '{"a":1}');
  assert.equal(extractResponseText({ content: [{ type: 'text', text: '{"a":2}' }] }), '{"a":2}');
  assert.equal(extractResponseText({ candidates: [{ content: { parts: [{ text: '{"a":3}' }] } }] }), '{"a":3}');
  assert.equal(extractResponseText({ output: [{ content: [{ type: 'output_text', text: '{"a":4}' }] }] }), '{"a":4}');
});

test('parses plain and fenced JSON', () => {
  assert.deepEqual(parseJsonResponse('{"ok":true}'), { ok: true });
  assert.deepEqual(parseJsonResponse('```json\n{"ok":true}\n```'), { ok: true });
});

test('OpenAI-style client resolves a base URL and authorization', async () => {
  let request;
  const client = new AIClient({
    url: 'https://example.test/v1/', model: 'model', apiKey: 'token',
    fetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"value":42}' } }] }), { status: 200 });
    }
  });
  assert.deepEqual(await client.generate('hello'), { value: 42 });
  assert.equal(request.url, 'https://example.test/v1/chat/completions');
  assert.equal(request.init.headers.Authorization, undefined);
  assert.equal(request.init.headers.authorization, 'Bearer token');
});

test('client reports missing configuration before fetching', async () => {
  const client = new AIClient({ url: '', model: '', apiKey: '', fetch: async () => assert.fail('should not fetch') });
  await assert.rejects(client.generate('hello'), /PRI_AI_URL.*PRI_AI_MODEL.*PRI_AI_API_KEY/);
});

test('normalizes versioned Anthropic and Gemini base URLs', async () => {
  const seen = [];
  const response = () => new Response(JSON.stringify({ content: [{ text: '{"ok":true}' }] }), { status: 200 });
  const anthropic = new AIClient({
    url: 'https://api.anthropic.com/v1', model: 'model', apiKey: 'token',
    fetch: async (url) => { seen.push(url); return response(); }
  });
  await anthropic.generate('hello');

  const gemini = new AIClient({
    url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-test', apiKey: 'token',
    fetch: async (url) => {
      seen.push(url);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
    }
  });
  await gemini.generate('hello');
  assert.equal(seen[0], 'https://api.anthropic.com/v1/messages');
  assert.equal(seen[1], 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent?key=token');
});
