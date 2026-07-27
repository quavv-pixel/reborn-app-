/* Tests for the site-wide auth gate (middleware.js): Basic Auth parsing,
   the master login, and the hourly rotating guest code.
   No framework: node test/middleware.test.js (also part of `npm test`). */
import assert from 'assert';
import {
  parseBasicAuth, timingSafeEqual, isMaster, hourlyCode, isAuthorized,
  makeSessionCookie, verifySessionCookie, cookieFromHeader,
} from '../middleware.js';

let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
const CREDS = { user: 'reborn', pass: 'pw123', rotateSecret: 'test-secret' };
// Fixed timestamp aligned to the START of an hour window, so offsets
// within the same hour genuinely stay in-window.
const T = Math.floor(1_750_000_000_000 / 3600000) * 3600000;

console.log('\ntimingSafeEqual');
await test('equal strings match', () => assert.strictEqual(timingSafeEqual('abc', 'abc'), true));
await test('different strings fail', () => assert.strictEqual(timingSafeEqual('abc', 'abd'), false));
await test('different lengths fail', () => assert.strictEqual(timingSafeEqual('abc', 'abcd'), false));
await test('empty vs non-empty fails', () => assert.strictEqual(timingSafeEqual('', 'a'), false));

console.log('\nparseBasicAuth');
await test('parses user and password', () =>
  assert.deepStrictEqual(parseBasicAuth(basic('me', 'pw')), { user: 'me', pass: 'pw' }));
await test('password containing a colon survives', () =>
  assert.deepStrictEqual(parseBasicAuth(basic('me', 'pa:ss')), { user: 'me', pass: 'pa:ss' }));
await test('null header -> null', () => assert.strictEqual(parseBasicAuth(null), null));
await test('non-Basic scheme -> null', () => assert.strictEqual(parseBasicAuth('Bearer x'), null));
await test('invalid base64 -> null, no throw', () => assert.strictEqual(parseBasicAuth('Basic $$$'), null));
await test('no colon -> null', () =>
  assert.strictEqual(parseBasicAuth('Basic ' + Buffer.from('nocolon').toString('base64')), null));
await test('object header -> null', () => assert.strictEqual(parseBasicAuth({}), null));

console.log('\nisMaster');
await test('right pair accepted', () =>
  assert.strictEqual(isMaster({ user: 'reborn', pass: 'pw123' }, 'reborn', 'pw123'), true));
await test('wrong password rejected', () =>
  assert.strictEqual(isMaster({ user: 'reborn', pass: 'nope' }, 'reborn', 'pw123'), false));
await test('wrong username rejected', () =>
  assert.strictEqual(isMaster({ user: 'intruder', pass: 'pw123' }, 'reborn', 'pw123'), false));
await test('null parse rejected', () => assert.strictEqual(isMaster(null, 'reborn', 'pw123'), false));

console.log('\nhourlyCode');
await test('deterministic: same secret + hour -> same code', async () =>
  assert.strictEqual(await hourlyCode('s', T), await hourlyCode('s', T)));
await test('same hour window -> same code regardless of minutes', async () =>
  assert.strictEqual(await hourlyCode('s', T), await hourlyCode('s', T + 59 * 60000)));
await test('next hour -> different code', async () =>
  assert.notStrictEqual(await hourlyCode('s', T), await hourlyCode('s', T + 3600000)));
await test('different secret -> different code', async () =>
  assert.notStrictEqual(await hourlyCode('a', T), await hourlyCode('b', T)));
await test('offset +1 equals next hour computed directly', async () =>
  assert.strictEqual(await hourlyCode('s', T, 1), await hourlyCode('s', T + 3600000)));
await test('8 chars from the unambiguous alphabet', async () => {
  const code = await hourlyCode('s', T);
  assert.match(code, /^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$/);
});

console.log('\nisAuthorized (the full door)');
await test('master login accepted', async () =>
  assert.strictEqual(await isAuthorized(basic('reborn', 'pw123'), CREDS, T), true));
await test('this hour\'s guest code accepted with any username', async () => {
  const code = await hourlyCode(CREDS.rotateSecret, T);
  assert.strictEqual(await isAuthorized(basic('mom', code), CREDS, T), true);
});
await test('guest code accepted lowercase too', async () => {
  const code = await hourlyCode(CREDS.rotateSecret, T);
  assert.strictEqual(await isAuthorized(basic('mom', code.toLowerCase()), CREDS, T), true);
});
await test('last hour\'s code still accepted (grace window)', async () => {
  const prev = await hourlyCode(CREDS.rotateSecret, T, -1);
  assert.strictEqual(await isAuthorized(basic('mom', prev), CREDS, T), true);
});
await test('a code from 2 hours ago is rejected', async () => {
  const old = await hourlyCode(CREDS.rotateSecret, T, -2);
  assert.strictEqual(await isAuthorized(basic('mom', old), CREDS, T), false);
});
await test('next hour\'s code is rejected (no future codes)', async () => {
  const next = await hourlyCode(CREDS.rotateSecret, T, 1);
  assert.strictEqual(await isAuthorized(basic('mom', next), CREDS, T), false);
});
await test('random password rejected', async () =>
  assert.strictEqual(await isAuthorized(basic('mom', 'guessing123'), CREDS, T), false));
await test('missing header rejected', async () =>
  assert.strictEqual(await isAuthorized(null, CREDS, T), false));
await test('no rotateSecret -> only master works', async () => {
  const code = await hourlyCode('test-secret', T);
  const noRotate = { user: 'reborn', pass: 'pw123', rotateSecret: '' };
  assert.strictEqual(await isAuthorized(basic('mom', code), noRotate, T), false);
  assert.strictEqual(await isAuthorized(basic('reborn', 'pw123'), noRotate, T), true);
});

console.log('\nsession cookie (remember-me)');
await test('valid master cookie verifies with role m', async () => {
  const v = await makeSessionCookie('sec', 'm', T + 86400000);
  assert.deepStrictEqual(await verifySessionCookie('sec', v, T), { role: 'm' });
});
await test('valid guest cookie verifies with role g', async () => {
  const v = await makeSessionCookie('sec', 'g', T + 86400000);
  assert.deepStrictEqual(await verifySessionCookie('sec', v, T), { role: 'g' });
});
await test('expired cookie rejected', async () => {
  const v = await makeSessionCookie('sec', 'm', T - 1);
  assert.strictEqual(await verifySessionCookie('sec', v, T), null);
});
await test('tampered role rejected (g promoted to m)', async () => {
  const v = await makeSessionCookie('sec', 'g', T + 86400000);
  assert.strictEqual(await verifySessionCookie('sec', v.replace('.g.', '.m.'), T), null);
});
await test('tampered expiry rejected', async () => {
  const v = await makeSessionCookie('sec', 'm', T + 86400000);
  const parts = v.split('.');
  parts[2] = String(T + 999999999999);
  assert.strictEqual(await verifySessionCookie('sec', parts.join('.'), T), null);
});
await test('cookie signed with a different secret rejected', async () => {
  const v = await makeSessionCookie('other', 'm', T + 86400000);
  assert.strictEqual(await verifySessionCookie('sec', v, T), null);
});
await test('garbage values rejected without throwing', async () => {
  for (const junk of [null, undefined, '', 'v1', 'v1.m.123', 'v2.m.123.abc', {}, 'v1.x.' + (T + 1) + '.00']) {
    assert.strictEqual(await verifySessionCookie('sec', junk, T), null);
  }
});

console.log('\ncookieFromHeader');
await test('finds the session cookie among others', () =>
  assert.strictEqual(cookieFromHeader('a=1; reborn_session=v1.m.2.abc; b=2'), 'v1.m.2.abc'));
await test('missing cookie -> null', () => assert.strictEqual(cookieFromHeader('a=1; b=2'), null));
await test('null header -> null', () => assert.strictEqual(cookieFromHeader(null), null));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
