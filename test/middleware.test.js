/* Tests for the site-wide auth gate (middleware.js): Basic Auth parsing,
   the master login, and the hourly rotating guest code.
   No framework: node test/middleware.test.js (also part of `npm test`). */
import assert from 'assert';
import {
  parseBasicAuth, timingSafeEqual, isMaster, hourlyCode, isAuthorized,
  makeSessionCookie, verifySessionCookie, cookieFromHeader,
  makeFailCookie, verifyFailCookie, isStaticAsset, isPublicPage, LOCKOUT_LIMIT, LOCKOUT_WINDOW_MS,
} from '../middleware.js';
import middleware, { clock, TEMP_OPEN_UNTIL } from '../middleware.js';
import discordPost from '../api/discord-post.js';

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

console.log('\nbrute-force lockout cookie');
await test('valid fail cookie round-trips', async () => {
  const v = await makeFailCookie('sec', 3, T);
  assert.deepStrictEqual(await verifyFailCookie('sec', v, T + 60000), { count: 3, firstMs: T });
});
await test('expired window -> null (clean slate)', async () => {
  const v = await makeFailCookie('sec', 5, T);
  assert.strictEqual(await verifyFailCookie('sec', v, T + LOCKOUT_WINDOW_MS), null);
});
await test('tampered count rejected', async () => {
  const v = await makeFailCookie('sec', 2, T);
  const parts = v.split('.'); parts[1] = '1';
  assert.strictEqual(await verifyFailCookie('sec', parts.join('.'), T), null);
});
await test('wrong secret rejected', async () => {
  const v = await makeFailCookie('other', 5, T);
  assert.strictEqual(await verifyFailCookie('sec', v, T), null);
});
await test('garbage rejected without throwing', async () => {
  for (const junk of [null, '', 'v1.x.y.z', 'v1.0.' + T + '.aa', {}]) {
    assert.strictEqual(await verifyFailCookie('sec', junk, T), null);
  }
});
await test('lockout limit is 5 strikes / 15 min window', () => {
  assert.strictEqual(LOCKOUT_LIMIT, 5);
  assert.strictEqual(LOCKOUT_WINDOW_MS, 15 * 60000);
});

console.log('\nisStaticAsset (perf bypass)');
await test('vite assets and file extensions bypass', () => {
  for (const p of ['/assets/index-abc.js', '/assets/index.css', '/icon-192.png', '/sw.js', '/manifest.json', '/font.woff2']) {
    assert.strictEqual(isStaticAsset(p), true, p);
  }
});
await test('pages do NOT bypass', () => {
  for (const p of ['/', '/code', '/anything']) {
    assert.strictEqual(isStaticAsset(p), false, p);
  }
});

console.log('\nisPublicPage (legal pages skip the gate)');
await test('privacy and terms are public', () => {
  for (const p of ['/privacy', '/privacy.html', '/terms', '/terms.html']) assert.strictEqual(isPublicPage(p), true, p);
});
await test('the app itself is not', () => {
  for (const p of ['/', '/code', '/privacy-ish']) assert.strictEqual(isPublicPage(p), false, p);
});

console.log('\nthe gate as a whole (no default passwords, fails closed)');
const req = (path, headers = {}) => new Request('https://reborn.test' + path, { headers });
async function withEnv(vars, fn) {
  const saved = {};
  for (const k of ['REBORN_USER', 'REBORN_PASS', 'REBORN_ROTATE_SECRET', 'REBORN_GATE', 'SITE_PASSWORD', 'ROTATING_CODE_SECRET']) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, vars);
  try { return await fn(); } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}
// Every check below pins the clock either before or after the temporary
// open window, so results never depend on today's date.
const BEFORE = TEMP_OPEN_UNTIL - 86400000, AFTER = TEMP_OPEN_UNTIL + 1;
async function at(t, fn) { const real = clock.now; clock.now = () => t; try { return await fn(); } finally { clock.now = real; } }

await test('temporary open mode: no secrets yet -> app opens', () => withEnv({}, () => at(BEFORE, async () => {
  assert.strictEqual(await middleware(req('/')), undefined);
})));
await test('temporary open mode: /code (guest codes) still never opens', () => withEnv({}, () => at(BEFORE, async () => {
  assert.strictEqual((await middleware(req('/code'))).status, 503);
})));
await test('after the deadline, no secrets -> "finish setup" page (503)', () => withEnv({}, () => at(AFTER, async () => {
  assert.strictEqual((await middleware(req('/'))).status, 503);
})));
await test('the old default password never signs anyone in', () => withEnv({}, () => at(AFTER, async () => {
  const res = await middleware(req('/', { authorization: basic('reborn', 'reborn123') }));
  assert.strictEqual(res.status, 503);
})));
await test('only the password set (no rotate secret) -> fails closed after deadline', () => withEnv({ REBORN_PASS: 'p' }, () => at(AFTER, async () => {
  assert.strictEqual((await middleware(req('/'))).status, 503);
})));
await test('setup page names exactly which setting is missing, never a value', () => withEnv({ REBORN_PASS: 'hunter2-secret' }, () => at(AFTER, async () => {
  const html = await (await middleware(req('/'))).text();
  assert.ok(html.includes('<b>REBORN_ROTATE_SECRET (or ROTATING_CODE_SECRET)</b>'));
  assert.ok(!html.includes('<b>REBORN_PASS'), 'REBORN_PASS is set, so it must not be listed');
  assert.ok(!html.includes('hunter2-secret'), 'a value must never be shown');
})));
await test('older names SITE_PASSWORD + ROTATING_CODE_SECRET work too', () => withEnv({ SITE_PASSWORD: 'old-pw', ROTATING_CODE_SECRET: 'old-s' }, () => at(BEFORE, async () => {
  assert.strictEqual((await middleware(req('/'))).status, 401, 'gate is on (not temporary open mode)');
  const res = await middleware(req('/', { authorization: basic('reborn', 'old-pw') }));
  assert.strictEqual(res.status, 302, 'SITE_PASSWORD signs in');
})));
await test('the new names win when both are set', () => withEnv({ REBORN_PASS: 'new', SITE_PASSWORD: 'old', REBORN_ROTATE_SECRET: 's' }, () => at(BEFORE, async () => {
  assert.strictEqual((await middleware(req('/', { authorization: basic('reborn', 'new') }))).status, 302);
  assert.notStrictEqual((await middleware(req('/', { authorization: basic('reborn', 'old') }))).status, 302);
})));
await test('once both secrets are set, the gate is back on even inside the window', () => withEnv({ REBORN_PASS: 'p', REBORN_ROTATE_SECRET: 's' }, () => at(BEFORE, async () => {
  assert.strictEqual((await middleware(req('/'))).status, 401);
})));
await test('secrets set -> sign-in box (401)', () => withEnv({ REBORN_PASS: 'p', REBORN_ROTATE_SECRET: 's' }, async () => {
  assert.strictEqual((await middleware(req('/'))).status, 401);
}));
await test('secrets set + right password -> signed in (302 with cookie)', () => withEnv({ REBORN_PASS: 'p', REBORN_ROTATE_SECRET: 's' }, async () => {
  const res = await middleware(req('/', { authorization: basic('reborn', 'p') }));
  assert.strictEqual(res.status, 302);
  assert.match(res.headers.get('set-cookie'), /reborn_session=/);
}));
await test('REBORN_GATE=off -> site is open (accounts protect data instead)', () => withEnv({ REBORN_GATE: 'off' }, async () => {
  assert.strictEqual(await middleware(req('/')), undefined);
}));
await test('legal pages open even when the gate is on', () => withEnv({ REBORN_PASS: 'p', REBORN_ROTATE_SECRET: 's' }, async () => {
  assert.strictEqual(await middleware(req('/privacy.html')), undefined);
}));
await test('Discord poster refuses to post a code made without a secret', () => withEnv({}, async () => {
  process.env.DISCORD_WEBHOOK_URL = 'https://discord.test/hook'; process.env.CRON_KEY = 'k';
  try {
    const res = await discordPost(req('/api/discord-post?key=k'));
    assert.strictEqual(res.status, 500);
  } finally { delete process.env.DISCORD_WEBHOOK_URL; delete process.env.CRON_KEY; }
}));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
