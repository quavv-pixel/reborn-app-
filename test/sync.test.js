/* Tests for the sync engine (src/sync/engine.js): two simulated phones talk
   to one in-memory fake "cloud". No network, no Supabase — just the rules
   for what gets uploaded, downloaded, merged and deleted.
   Run: node test/sync.test.js (also part of `npm test`). */
import assert from 'assert';
import { createSyncEngine, mergeProfileLists, LEGACY_T } from '../src/sync/engine.js';

let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

function fakeCloud({ refuse = false } = {}) {
  const rows = new Map();
  return {
    rows,
    refuse,
    async pull() { return [...rows.values()].map(r => ({ ...r })); },
    async push(batch) {
      if (this.refuse) throw Object.assign(new Error('rls'), { code: '42501' });
      // Same rule as the real database (push_kv in supabase/schema.sql):
      // only accept a row that's newer than what's stored.
      for (const r of batch) {
        const cur = rows.get(r.key);
        if (!cur || cur.t < r.t) rows.set(r.key, { ...r });
      }
    },
  };
}

// A "phone": its own storage + meta + clock, wired to a shared cloud.
function phone(cloud, clock) {
  let all = {}, meta = {};
  const local = {
    readAll: () => ({ ...all }), writeAll: o => { all = { ...o }; },
    readMeta: () => JSON.parse(JSON.stringify(meta)), writeMeta: m => { meta = JSON.parse(JSON.stringify(m)); },
  };
  const engine = createSyncEngine({
    local, remote: cloud, now: () => clock.t, merge: { 'profiles-list': mergeProfileLists },
  });
  return {
    engine,
    get all() { return all; },
    get meta() { return meta; },
    set(k, v) { all[k] = v; engine.markChanged(k); },
    del(k) { delete all[k]; engine.markChanged(k); },
    seed(k, v) { all[k] = v; }, // data that existed before sync was turned on
  };
}

console.log('\nsync engine');
await test('a change on phone A shows up on phone B', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock), B = phone(cloud, clock);
  A.set('p:Me:gym-data', '{"w":1}');
  await A.engine.sync();
  const { changed } = await B.engine.sync();
  assert.deepStrictEqual(changed, ['p:Me:gym-data']);
  assert.strictEqual(B.all['p:Me:gym-data'], '{"w":1}');
});

await test('device: keys never leave the phone', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock);
  A.set('device:theme', '"ivory"');
  A.set('device:last-profile', '"Me"');
  await A.engine.sync();
  assert.strictEqual(cloud.rows.size, 0);
});

await test('newer edit wins (last write wins)', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock), B = phone(cloud, clock);
  A.set('k', 'old'); await A.engine.sync(); await B.engine.sync();
  clock.t = 2000; B.set('k', 'newer');
  clock.t = 1500; A.set('k', 'older-but-uploaded-later');
  await B.engine.sync();
  await A.engine.sync();
  assert.strictEqual(A.all.k, 'newer', 'A should take B\'s newer value');
  await B.engine.sync();
  assert.strictEqual(B.all.k, 'newer');
});

await test('a delete travels to the other phone', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock), B = phone(cloud, clock);
  A.set('p:Old:notes', 'x'); await A.engine.sync(); await B.engine.sync();
  assert.strictEqual(B.all['p:Old:notes'], 'x');
  clock.t = 2000; A.del('p:Old:notes'); await A.engine.sync();
  await B.engine.sync();
  assert.ok(!('p:Old:notes' in B.all));
  assert.strictEqual(cloud.rows.get('p:Old:notes').value, null, 'cloud keeps a tombstone');
});

await test('existing data is uploaded on first sign-in', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock);
  A.seed('p:Me:budget-data', '{"b":1}');
  A.engine.adoptExistingData();
  await A.engine.sync();
  assert.strictEqual(cloud.rows.get('p:Me:budget-data').value, '{"b":1}');
});

await test('existing data reaches a brand-new phone', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock), B = phone(cloud, clock);
  A.seed('p:Me:budget-data', '{"b":1}');
  A.engine.adoptExistingData(); await A.engine.sync();
  await B.engine.sync();
  assert.strictEqual(B.all['p:Me:budget-data'], '{"b":1}');
});

await test('on first sign-in, the cloud beats old local data for the same key', async () => {
  const clock = { t: 5000 }, cloud = fakeCloud();
  const A = phone(cloud, clock), B = phone(cloud, clock);
  A.set('p:Me:gym-data', 'cloud-version'); await A.engine.sync();
  B.seed('p:Me:gym-data', 'stale-local-version');
  B.engine.adoptExistingData();
  await B.engine.sync();
  assert.strictEqual(B.all['p:Me:gym-data'], 'cloud-version');
  assert.strictEqual(cloud.rows.get('p:Me:gym-data').value, 'cloud-version');
  assert.ok(LEGACY_T < 5000);
});

await test('profile lists from two phones are combined, not overwritten', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock), B = phone(cloud, clock);
  A.set('profiles-list', JSON.stringify([{ name: 'Me', passHash: 'h1', salt: 's1' }]));
  await A.engine.sync();
  B.seed('profiles-list', JSON.stringify([{ name: 'Kid', passHash: 'h2', salt: 's2' }]));
  B.engine.adoptExistingData();
  await B.engine.sync();
  const names = JSON.parse(B.all['profiles-list']).map(p => p.name).sort();
  assert.deepStrictEqual(names, ['Kid', 'Me']);
  await A.engine.sync();
  assert.deepStrictEqual(JSON.parse(A.all['profiles-list']).map(p => p.name).sort(), ['Kid', 'Me']);
});

await test('a change made during an upload is not lost', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  const A = phone(cloud, clock);
  A.set('k', 'v1');
  const realPush = cloud.push.bind(cloud);
  cloud.push = async rows => { clock.t = 1001; A.set('k', 'v2'); return realPush(rows); };
  await A.engine.push();
  cloud.push = realPush;
  assert.strictEqual(A.engine.pendingCount(), 1, 'v2 must still be waiting to upload');
  await A.engine.push();
  assert.strictEqual(cloud.rows.get('k').value, 'v2');
});

await test('a refused upload keeps changes queued', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud({ refuse: true });
  const A = phone(cloud, clock);
  A.set('k', 'v');
  await assert.rejects(() => A.engine.push());
  assert.strictEqual(A.engine.pendingCount(), 1);
});

await test('the cloud refuses an older upload', async () => {
  const cloud = fakeCloud();
  await cloud.push([{ key: 'k', value: 'new', t: 2000 }]);
  await cloud.push([{ key: 'k', value: 'old', t: 1000 }]);
  assert.strictEqual(cloud.rows.get('k').value, 'new');
});

await test('nothing to do = no upload call', async () => {
  const clock = { t: 1000 }, cloud = fakeCloud();
  let calls = 0; const orig = cloud.push; cloud.push = async r => { calls++; return orig.call(cloud, r); };
  const A = phone(cloud, clock);
  await A.engine.sync();
  assert.strictEqual(calls, 0);
});

console.log('\nmergeProfileLists');
await test('union by name, cloud wins a clash', () => {
  const out = JSON.parse(mergeProfileLists(
    JSON.stringify([{ name: 'Me', passHash: 'local' }, { name: 'A' }]),
    JSON.stringify([{ name: 'Me', passHash: 'cloud' }, { name: 'B' }])));
  assert.deepStrictEqual(out.map(p => p.name).sort(), ['A', 'B', 'Me']);
  assert.strictEqual(out.find(p => p.name === 'Me').passHash, 'cloud');
});
await test('old plain-string entries are kept', () => {
  const out = JSON.parse(mergeProfileLists(JSON.stringify(['Legacy']), JSON.stringify([{ name: 'New' }])));
  assert.strictEqual(out.length, 2);
});
await test('garbage input never throws', () => {
  assert.strictEqual(mergeProfileLists('not json', '{}'), '[]');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
