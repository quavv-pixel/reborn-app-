// A local stand-in for Vercel's runtime, used only for testing. It serves the
// built dist/ files and mounts the two real api/*.js handlers exactly as
// Vercel would call them — same (req, res) shape — with global.fetch mocked
// so no real network call ever reaches Anthropic or Instacart. This exists to
// verify OUR code's logic (request shaping, response parsing, error paths,
// the access gate) end-to-end through a real browser, without needing real
// API keys or spending real money. It does not and cannot prove the live
// Anthropic/Instacart APIs themselves behave as documented — only that this
// app calls them correctly and handles every response shape they can return.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.argv[2] || 4180);

process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.INSTACART_API_KEY = 'test-instacart-key';
// APP_ACCESS_KEY starts unset; a test scenario can flip it on mid-run.

let dealsScenario = 'success';
let instacartScenario = 'success';

const dealsPayload = {
  success: () => textResult(200, 'end_turn',
    '[{"item":"Bananas","price":"$0.49","note":"per lb"},{"item":"Eggs (dozen)","price":"$1.99","note":""}]'),
  empty: () => textResult(200, 'end_turn', '[]'),
  refusal: () => ({ status: 200, body: { content: [], stop_reason: 'refusal' } }),
  truncated: () => textResult(200, 'max_tokens', '[{"item":"Milk","price":"$2'), // deliberately unparseable/cut off
  pause_then_success: (messages) => {
    if (messages.length <= 1) {
      // First call: simulate the server-side search loop hitting its
      // iteration cap mid-search. deals.js must resend with this content
      // appended as an assistant turn to get the real answer.
      return { status: 200, body: { content: [{ type: 'text', text: 'still searching…' }], stop_reason: 'pause_turn' } };
    }
    return textResult(200, 'end_turn', '[{"item":"Bread","price":"$1.29","note":""}]');
  },
};
function textResult(status, stop_reason, text) {
  return { status, body: { content: [{ type: 'text', text }], stop_reason } };
}

const instacartPayload = {
  // Points at this same harness rather than the real instacart.com — a real
  // external domain isn't reachable/navigable in this test environment, so
  // the browser test couldn't tell "the tab loaded" from "the tab errored."
  // The important thing being tested is that OUR code opens the tab and
  // navigates it to whatever URL Instacart's API returned, which this proves
  // just as well as a real domain would.
  success: () => ({ status: 200, body: { products_link_url: `http://localhost:${PORT}/__test__/fake-cart?id=abc123` } }),
  error: () => ({ status: 401, body: { message: 'Invalid API key.' } }),
};

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.anthropic.com')) {
    const body = opts.body ? JSON.parse(opts.body) : {};
    const gen = dealsPayload[dealsScenario] || dealsPayload.success;
    const { status, body: respBody } = gen(body.messages || []);
    return new Response(JSON.stringify(respBody), { status, headers: { 'content-type': 'application/json' } });
  }
  if (u.includes('instacart.tools') || u.includes('instacart.com')) {
    const { status, body } = (instacartPayload[instacartScenario] || instacartPayload.success)();
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, opts);
};

const { default: dealsHandler } = await import('../api/deals.js');
const { default: instacartHandler } = await import('../api/instacart.js');

function vercelRes(res) {
  let statusCode = 200;
  return {
    status(code) { statusCode = code; return this; },
    json(obj) {
      const text = JSON.stringify(obj);
      res.writeHead(statusCode, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
      res.end(text);
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Test-only control surface — not part of the real app, only this harness.
  if (url.pathname === '/__test__/scenario' && req.method === 'POST') {
    const body = await readBody(req);
    if (body.deals) dealsScenario = body.deals;
    if (body.instacart) instacartScenario = body.instacart;
    if ('accessKey' in body) {
      if (body.accessKey) process.env.APP_ACCESS_KEY = body.accessKey;
      else delete process.env.APP_ACCESS_KEY;
    }
    res.writeHead(200).end('ok');
    return;
  }

  if (url.pathname === '/api/deals' || url.pathname === '/api/instacart') {
    req.body = await readBody(req);
    const handler = url.pathname === '/api/deals' ? dealsHandler : instacartHandler;
    await handler(req, vercelRes(res));
    return;
  }

  let filePath = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(DIST, 'index.html');
  const ext = path.extname(filePath);
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => console.log(`devserver on http://localhost:${PORT}`));
