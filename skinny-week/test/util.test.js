/* Tests for the shared API helpers: the IP-spoofing fix and the access gate.
   No framework: node test/util.test.js (also part of `npm test`). */
import assert from 'assert';
import { clientIp, checkAccess } from '../api/_util.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

// A fake res that records what was sent, matching the subset of the Vercel
// Node response API these functions actually use.
function fakeRes() {
  const calls = { status: null, body: null };
  return {
    status(code) { calls.status = code; return this; },
    json(body) { calls.body = body; return this; },
    calls,
  };
}

console.log('\nclientIp');
test('a single IP is used as-is', () => {
  assert.strictEqual(clientIp({ headers: { 'x-forwarded-for': '203.0.113.9' } }), '203.0.113.9');
});
test('trusts the LAST entry, not the first', () => {
  // The chain is client -> ... -> Vercel's edge. Vercel appends the real
  // client address last; everything before it came from the client itself.
  const req = { headers: { 'x-forwarded-for': '203.0.113.9, 198.51.100.4' } };
  assert.strictEqual(clientIp(req), '198.51.100.4');
});
test('a spoofed first entry does not change the trusted address', () => {
  const real = clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 198.51.100.4' } });
  const spoofed = clientIp({ headers: { 'x-forwarded-for': '9.9.9.9, 198.51.100.4' } });
  // Different attacker-supplied first entries must not change who we think
  // the caller is -- if they did, the rate limiter resets on every request.
  assert.strictEqual(real, spoofed);
  assert.strictEqual(spoofed, '198.51.100.4');
});
test('tolerates extra whitespace in the chain', () => {
  assert.strictEqual(clientIp({ headers: { 'x-forwarded-for': ' 1.2.3.4 ,  5.6.7.8 ' } }), '5.6.7.8');
});
test('falls back to "unknown" with no header', () => {
  assert.strictEqual(clientIp({ headers: {} }), 'unknown');
});
test('falls back to "unknown" on an empty header', () => {
  assert.strictEqual(clientIp({ headers: { 'x-forwarded-for': '' } }), 'unknown');
});

console.log('\ncheckAccess');
const withEnv = (key, value, fn) => {
  const had = key in process.env;
  const prev = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try { fn(); } finally {
    if (had) process.env[key] = prev; else delete process.env[key];
  }
};

test('passes everything when APP_ACCESS_KEY is unset (the default)', () => {
  withEnv('APP_ACCESS_KEY', undefined, () => {
    const res = fakeRes();
    const ok = checkAccess({ headers: {} }, res);
    assert.strictEqual(ok, true);
    assert.strictEqual(res.calls.status, null, 'should not have written a response');
  });
});
test('rejects a request with no key once APP_ACCESS_KEY is set', () => {
  withEnv('APP_ACCESS_KEY', 'sesame', () => {
    const res = fakeRes();
    const ok = checkAccess({ headers: {} }, res);
    assert.strictEqual(ok, false);
    assert.strictEqual(res.calls.status, 401);
    assert.strictEqual(res.calls.body.error, 'access_key_required');
  });
});
test('rejects a wrong key', () => {
  withEnv('APP_ACCESS_KEY', 'sesame', () => {
    const res = fakeRes();
    const ok = checkAccess({ headers: { 'x-app-key': 'wrong' } }, res);
    assert.strictEqual(ok, false);
    assert.strictEqual(res.calls.status, 401);
  });
});
test('accepts the matching key', () => {
  withEnv('APP_ACCESS_KEY', 'sesame', () => {
    const res = fakeRes();
    const ok = checkAccess({ headers: { 'x-app-key': 'sesame' } }, res);
    assert.strictEqual(ok, true);
    assert.strictEqual(res.calls.status, null);
  });
});
test('an empty APP_ACCESS_KEY is treated as unset, not as an empty required key', () => {
  // Otherwise a misconfigured Vercel env var (set but blank) would silently
  // let ANY caller through by sending no header at all -- worse than either
  // fully open or fully gated.
  withEnv('APP_ACCESS_KEY', '', () => {
    const res = fakeRes();
    const ok = checkAccess({ headers: {} }, res);
    assert.strictEqual(ok, true);
  });
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
