/* Tests for the site-wide Basic Auth gate (middleware.js).
   No framework: node test/middleware.test.js (also part of `npm test`). */
import assert from 'assert';
import { checkBasicAuth, timingSafeEqual } from '../middleware.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

console.log('\ntimingSafeEqual');
test('equal strings match', () => assert.strictEqual(timingSafeEqual('abc', 'abc'), true));
test('different strings fail', () => assert.strictEqual(timingSafeEqual('abc', 'abd'), false));
test('different lengths fail', () => assert.strictEqual(timingSafeEqual('abc', 'abcd'), false));
test('empty vs non-empty fails', () => assert.strictEqual(timingSafeEqual('', 'a'), false));

console.log('\ncheckBasicAuth');
test('accepts the right user and password', () =>
  assert.strictEqual(checkBasicAuth(basic('reborn', 'pw123'), 'reborn', 'pw123'), true));
test('rejects a wrong password', () =>
  assert.strictEqual(checkBasicAuth(basic('reborn', 'nope'), 'reborn', 'pw123'), false));
test('rejects a wrong username', () =>
  assert.strictEqual(checkBasicAuth(basic('intruder', 'pw123'), 'reborn', 'pw123'), false));
test('rejects a missing header', () =>
  assert.strictEqual(checkBasicAuth(null, 'reborn', 'pw123'), false));
test('rejects an empty header', () =>
  assert.strictEqual(checkBasicAuth('', 'reborn', 'pw123'), false));
test('rejects a non-Basic scheme', () =>
  assert.strictEqual(checkBasicAuth('Bearer abc123', 'reborn', 'pw123'), false));
test('rejects invalid base64 without throwing', () =>
  assert.strictEqual(checkBasicAuth('Basic $$$not-base64$$$', 'reborn', 'pw123'), false));
test('rejects base64 with no colon', () =>
  assert.strictEqual(checkBasicAuth('Basic ' + Buffer.from('nocolonhere').toString('base64'), 'reborn', 'pw123'), false));
test('password containing a colon works', () =>
  assert.strictEqual(checkBasicAuth(basic('reborn', 'pa:ss:word'), 'reborn', 'pa:ss:word'), true));
test('rejects a non-string header object', () =>
  assert.strictEqual(checkBasicAuth({}, 'reborn', 'pw123'), false));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
