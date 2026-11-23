/* Tests for merging the old separate "Daily reminders" list into habits
   (src/lib/habits.js). Nobody should lose a reminder in the move.
   Run: node test/habits.test.js (also part of `npm test`). */
import assert from 'assert';
import { mergeRemindersIntoHabits, scheduleFromHabits } from '../src/lib/habits.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};

// What older saved data looks like: reminders in `schedule`, each with a
// twin habit 'hb-s-<reminder id>', plus habits added by hand.
const old = {
  habits: [
    { id: 'h1', name: 'Drink water', category: 'health' },
    { id: 'hb-s-r1', name: 'Gym', category: 'personal' },
  ],
  schedule: [
    { id: 'r1', time: '6:30 PM', label: 'Gym' },
    { id: 'r2', time: '7:05 am', label: 'Stretch' },    // twin habit missing
    { id: 'r3', time: '', label: 'Plan the week' },     // no time
    { id: 'r4', time: '9:00', label: '   ' },           // blank label: ignored
  ],
  logs: { '2026-11-20': ['h1', 'hb-s-r1'] },
  moodLog: { '2026-11-20': 3 },
};

console.log('\nmergeRemindersIntoHabits');
const merged = mergeRemindersIntoHabits(old);
const byName = n => merged.habits.find(h => h.name === n);

test('a reminder\'s time moves onto its twin habit (12-hour → 24-hour)', () =>
  assert.strictEqual(byName('Gym').time, '18:30'));
test('the twin keeps its id, so its streak history still counts', () =>
  assert.strictEqual(byName('Gym').id, 'hb-s-r1'));
test('a reminder with no twin habit becomes a new timed habit', () => {
  assert.strictEqual(byName('Stretch').time, '07:05');
  assert.strictEqual(byName('Stretch').id, 'hb-s-r2');
});
test('a reminder without a time becomes a plain habit', () => {
  assert.ok(byName('Plan the week'));
  assert.strictEqual(byName('Plan the week').time, undefined);
});
test('blank reminders are dropped, hand-made habits kept as they were', () => {
  assert.strictEqual(merged.habits.length, 4);
  assert.deepStrictEqual(byName('Drink water'), { id: 'h1', name: 'Drink water', category: 'health' });
});
test('logs and mood are untouched', () => {
  assert.deepStrictEqual(merged.logs, old.logs);
  assert.deepStrictEqual(merged.moodLog, old.moodLog);
});
test('the reminder list is rebuilt from the timed habits', () =>
  assert.deepStrictEqual(merged.schedule.map(s => [s.label, s.time]).sort(), [['Gym', '18:30'], ['Stretch', '07:05']]));
test('running it again changes nothing', () =>
  assert.deepStrictEqual(mergeRemindersIntoHabits(merged), merged));
test('the original object is not modified', () =>
  assert.strictEqual(old.habits[1].time, undefined));
test('brand-new empty data works', () =>
  assert.deepStrictEqual(mergeRemindersIntoHabits({ habits: [], schedule: [], logs: {} }).habits, []));
test('a time already set on a habit is never overwritten', () => {
  const r = mergeRemindersIntoHabits({ habits: [{ id: 'hb-s-x', name: 'Run', time: '05:00' }], schedule: [{ id: 'x', time: '6:00 AM', label: 'Run' }] });
  assert.strictEqual(r.habits[0].time, '05:00');
});

console.log('\nscheduleFromHabits');
test('only habits with a time become reminders', () =>
  assert.deepStrictEqual(scheduleFromHabits([{ id: 'a', name: 'A', time: '08:00' }, { id: 'b', name: 'B' }]),
    [{ id: 'a', time: '08:00', label: 'A' }]));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
