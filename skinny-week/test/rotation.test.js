/* Tests for the week rotation and list building.
   No framework: node test/rotation.test.js (also `npm test`). */
import assert from 'assert';
import { BOOK } from '../src/book.js';
import {
  weekIndex,
  weekLabel,
  pickOptions,
  buildList,
  claudeMessage,
  hasWrapped,
} from '../src/rotation.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

console.log('\nbook data');
test('every recipe has a title, page, tag and items', () => {
  for (const r of BOOK) {
    assert.ok(r.t && typeof r.t === 'string', 'bad title');
    assert.ok(Number.isInteger(r.p) && r.p > 0, r.t + ': bad page');
    assert.ok(r.tag && typeof r.tag === 'string', r.t + ': bad tag');
    assert.ok(Array.isArray(r.items) && r.items.length > 0, r.t + ': no items');
  }
});
test('page numbers are unique — they are the identity used everywhere', () => {
  const pages = BOOK.map(r => r.p);
  assert.strictEqual(new Set(pages).size, pages.length);
});
test('no recipe lists the same ingredient twice', () => {
  for (const r of BOOK) {
    assert.strictEqual(new Set(r.items).size, r.items.length, r.t + ' has a duplicate item');
  }
});

console.log('\nweekIndex');
test('is stable across every day of one Mon-Sun week', () => {
  // 2026-03-02 is a Monday.
  const monday = new Date(2026, 2, 2);
  const base = weekIndex(monday);
  for (let d = 0; d < 7; d++) {
    const day = new Date(2026, 2, 2 + d);
    assert.strictEqual(weekIndex(day), base, day.toDateString() + ' fell in a different week');
  }
});
test('rolls over on the next Monday', () => {
  assert.strictEqual(weekIndex(new Date(2026, 2, 9)), weekIndex(new Date(2026, 2, 2)) + 1);
});
test('advances by exactly one per week across a year', () => {
  for (let w = 0; w < 52; w++) {
    const a = new Date(2026, 0, 5 + w * 7);       // 2026-01-05 is a Monday
    const b = new Date(2026, 0, 5 + (w + 1) * 7);
    assert.strictEqual(weekIndex(b) - weekIndex(a), 1, 'week ' + w);
  }
});

console.log('\nweekLabel');
test('names the Monday that starts the week', () => {
  assert.strictEqual(weekLabel(new Date(2026, 2, 2)), 'March 2');
  assert.strictEqual(weekLabel(new Date(2026, 2, 8)), 'March 2'); // Sunday still says Monday
});

console.log('\npickOptions');
test('offers three recipes', () => {
  assert.strictEqual(pickOptions(BOOK, 5, []).length, 3);
});
test('offers three distinct recipes', () => {
  for (let wi = 0; wi < 200; wi++) {
    const opts = pickOptions(BOOK, wi, []);
    assert.strictEqual(new Set(opts.map(r => r.p)).size, opts.length, 'week ' + wi);
  }
});
test('is deterministic for a given week', () => {
  const a = pickOptions(BOOK, 42, [118, 44]);
  const b = pickOptions(BOOK, 42, [118, 44]);
  assert.deepStrictEqual(a.map(r => r.p), b.map(r => r.p));
});
test('different weeks offer different sets', () => {
  const a = pickOptions(BOOK, 7, []).map(r => r.p);
  const b = pickOptions(BOOK, 8, []).map(r => r.p);
  assert.notDeepStrictEqual(a, b);
});
test('skips what you already cooked', () => {
  const cooked = pickOptions(BOOK, 3, []).map(r => r.p);
  for (const r of pickOptions(BOOK, 3, cooked)) {
    assert.ok(!cooked.includes(r.p), r.t + ' was already cooked');
  }
});
test('only ever offers recipes that exist in the book', () => {
  const pages = new Set(BOOK.map(r => r.p));
  for (let wi = 0; wi < 100; wi++) {
    for (const r of pickOptions(BOOK, wi, [])) assert.ok(pages.has(r.p));
  }
});
test('still offers three once everything has been cooked', () => {
  const all = BOOK.map(r => r.p);
  const opts = pickOptions(BOOK, 11, all);
  assert.strictEqual(opts.length, 3);
  assert.strictEqual(new Set(opts.map(r => r.p)).size, 3);
});
test('stays distinct when only a few uncooked recipes remain', () => {
  // Leave exactly 3 uncooked: the pool is used verbatim and must not repeat.
  const cooked = BOOK.slice(0, BOOK.length - 3).map(r => r.p);
  for (let wi = 0; wi < 50; wi++) {
    const opts = pickOptions(BOOK, wi, cooked);
    assert.strictEqual(new Set(opts.map(r => r.p)).size, opts.length, 'week ' + wi);
  }
});
test('an empty book yields nothing rather than throwing', () => {
  assert.deepStrictEqual(pickOptions([], 1, []), []);
});

console.log('\nhasWrapped');
test('false on a fresh book', () => assert.strictEqual(hasWrapped(BOOK, []), false));
test('true once everything is cooked', () =>
  assert.strictEqual(hasWrapped(BOOK, BOOK.map(r => r.p)), true));
test('true when fewer than three remain', () => {
  const cooked = BOOK.slice(0, BOOK.length - 2).map(r => r.p);
  assert.strictEqual(hasWrapped(BOOK, cooked), true);
});

console.log('\nbuildList');
test('an empty pick makes an empty list', () => {
  assert.deepStrictEqual(buildList(BOOK, []), []);
});
test('one recipe yields its own items', () => {
  const recipe = BOOK.find(r => r.p === 92); // Buffalo Chicken Wings
  const list = buildList(BOOK, [92]);
  assert.strictEqual(list.length, recipe.items.length);
  for (const [, n] of list) assert.strictEqual(n, 1);
});
test('an ingredient shared by two recipes is listed once with a count', () => {
  // Both burritos need flour tortillas and chicken breast.
  const list = buildList(BOOK, [118, 116]);
  const tortillas = list.filter(([item]) => item === 'flour tortillas');
  assert.strictEqual(tortillas.length, 1);
  assert.strictEqual(tortillas[0][1], 2);
});
test('shared ingredients sort above single-use ones', () => {
  const counts = buildList(BOOK, [118, 116, 44]).map(([, n]) => n);
  assert.deepStrictEqual(counts, [...counts].sort((a, b) => b - a));
});
test('items with the same count are alphabetical', () => {
  const list = buildList(BOOK, [118, 116, 44]);
  for (let i = 1; i < list.length; i++) {
    if (list[i][1] === list[i - 1][1]) {
      assert.ok(list[i - 1][0].localeCompare(list[i][0]) <= 0, `${list[i - 1][0]} before ${list[i][0]}`);
    }
  }
});
test('an unknown page is ignored rather than crashing', () => {
  assert.deepStrictEqual(buildList(BOOK, [99999]), []);
});
test('never loses an ingredient', () => {
  const picked = [118, 116, 44];
  const expected = new Set(picked.flatMap(p => BOOK.find(r => r.p === p).items));
  assert.strictEqual(buildList(BOOK, picked).length, expected.size);
});

console.log('\nclaudeMessage');
test('names each recipe with its page', () => {
  const msg = claudeMessage(BOOK, [92]);
  assert.ok(msg.includes('Buffalo Chicken Wings (p.92)'), msg);
});
test('marks shared ingredients with a multiplier', () => {
  assert.ok(claudeMessage(BOOK, [118, 116]).includes('flour tortillas x2'));
});
test('skips unknown pages', () => {
  const msg = claudeMessage(BOOK, [99999]);
  assert.ok(msg.includes('Recipes: .'), msg);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
