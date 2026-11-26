/* Tests for src/lib/progress.js: streak protection, challenges, the weekly
   summary and gym hints. Run: node test/progress.test.js (part of npm test). */
import assert from 'assert';
import {
  currentStreak, bestStreak, CHALLENGES, challengeProgress, weekSummary,
  nextTarget, isPersonalRecord, lastWorkoutDay,
} from '../src/lib/progress.js';

let passed = 0, failed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
};
const TODAY = '2026-11-26';
const R = (logs, extra = {}) => ({ habits: [{ id: 'h' }, { id: 'g' }], logs, skips: {}, restDays: [], ...extra });

console.log('\nstreaks');
test('3 days in a row = 3', () =>
  assert.strictEqual(currentStreak('h', R({ '2026-11-24': ['h'], '2026-11-25': ['h'], '2026-11-26': ['h'] }), TODAY), 3));
test('today not done yet does NOT wipe the streak', () =>
  assert.strictEqual(currentStreak('h', R({ '2026-11-24': ['h'], '2026-11-25': ['h'] }), TODAY), 2));
test('a missed day ends the current streak', () =>
  assert.strictEqual(currentStreak('h', R({ '2026-11-23': ['h'], '2026-11-25': ['h'], '2026-11-26': ['h'] }), TODAY), 2));
test('a skipped day keeps the streak alive', () =>
  assert.strictEqual(currentStreak('h', R({ '2026-11-23': ['h'], '2026-11-25': ['h'], '2026-11-26': ['h'] }, { skips: { '2026-11-24': ['h'] } }), TODAY), 3));
test('a rest day protects every habit', () =>
  assert.strictEqual(currentStreak('h', R({ '2026-11-23': ['h'], '2026-11-25': ['h'] }, { restDays: ['2026-11-24'] }), TODAY), 2));
test('skipping one habit does not protect another', () =>
  assert.strictEqual(currentStreak('g', R({ '2026-11-23': ['g'], '2026-11-25': ['g'] }, { skips: { '2026-11-24': ['h'] } }), TODAY), 1));
test('best streak is kept after a miss', () => {
  const r = R({ '2026-11-10': ['h'], '2026-11-11': ['h'], '2026-11-12': ['h'], '2026-11-13': ['h'], '2026-11-25': ['h'] });
  assert.strictEqual(bestStreak('h', r, TODAY), 4);
  assert.strictEqual(currentStreak('h', r, TODAY), 1);
});
test('never done = 0, and old data without skips/restDays still works', () => {
  assert.strictEqual(bestStreak('h', R({}), TODAY), 0);
  assert.strictEqual(currentStreak('h', { habits: [], logs: { '2026-11-26': ['h'] } }, TODAY), 1);
});

console.log('\nchallenges');
test('every template has a name, length and habits with valid categories', () => {
  const cats = ['work', 'gym', 'health', 'finance', 'personal', 'sleep'];
  for (const c of CHALLENGES) {
    assert.ok(c.id && c.name && c.days > 0 && c.habits.length > 0, c.id);
    for (const [name, cat] of c.habits) assert.ok(name && cats.includes(cat), `${c.id}: ${name}`);
  }
  assert.ok(CHALLENGES.some(c => c.id === 'winter-arc') && CHALLENGES.some(c => c.id === '75-soft'));
});
test('day number and perfect days', () => {
  const r = R({ '2026-11-24': ['h', 'g'], '2026-11-25': ['h'], '2026-11-26': ['h', 'g'] },
    { challenge: { id: 'x', name: 'X', days: 75, start: '2026-11-24', habitIds: ['h', 'g'] } });
  const p = challengeProgress(r, TODAY);
  assert.strictEqual(p.day, 3);
  assert.strictEqual(p.perfect, 2);
  assert.strictEqual(p.doneToday, 2);
  assert.strictEqual(p.finished, false);
});
test('a rest day counts as a kept challenge day', () => {
  const r = R({ '2026-11-24': ['h'] }, { restDays: ['2026-11-25'], challenge: { id: 'x', name: 'X', days: 75, start: '2026-11-24', habitIds: ['h'] } });
  assert.strictEqual(challengeProgress(r, '2026-11-25').perfect, 2);
});
test('finishes after the last day', () => {
  const r = R({}, { challenge: { id: 'x', name: 'X', days: 30, start: '2026-10-01', habitIds: ['h'] } });
  const p = challengeProgress(r, TODAY);
  assert.strictEqual(p.day, 30);
  assert.strictEqual(p.finished, true);
});
test('no challenge = null', () => assert.strictEqual(challengeProgress(R({}), TODAY), null));

console.log('\nweek summary');
test('habit %, workouts, money saved, best day', () => {
  const s = weekSummary({
    routine: R({ '2026-11-20': ['h', 'g'], '2026-11-26': ['h'] }),
    gym: { workouts: [{ date: '2026-11-21' }, { date: '2026-11-21' }, { date: '2026-11-25' }, { date: '2026-11-01' }] },
    budget: { goal: { history: [{ date: '2026-11-22', amount: 100 }, { date: '2026-11-25', amount: 50 }, { date: '2026-10-01', amount: 999 }] } },
  }, TODAY);
  assert.strictEqual(s.habitsDone, 3);
  assert.strictEqual(s.habitPct, Math.round(3 / 14 * 100)); // tracking started 11-20: 7 days x 2 habits
  assert.strictEqual(s.workouts, 2);
  assert.strictEqual(s.saved, 150);
  assert.strictEqual(s.bestDay, '2026-11-20');
});
test('a brand-new user is scored only from their first day', () => {
  const s = weekSummary({ routine: R({ '2026-11-26': ['h'] }), gym: { workouts: [] }, budget: { goal: {} } }, TODAY);
  assert.strictEqual(s.habitPct, 50); // 1 of 2 habits today, not 1 of 14
});
test('rest days are left out of the habit %', () => {
  const s = weekSummary({ routine: R({ '2026-11-26': ['h', 'g'] }, { restDays: ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'] }), gym: { workouts: [] }, budget: { goal: {} } }, TODAY);
  assert.strictEqual(s.habitPct, 100);
});

console.log('\ngym');
const W = [
  { exercise: 'Bench Press', weight: '135', reps: '8', date: '2026-11-25' },
  { exercise: 'Squat', weight: '185', reps: '5', date: '2026-11-25' },
  { exercise: 'Bench Press', weight: '125', reps: '8', date: '2026-11-20' },
  { exercise: 'Pull-ups', weight: '', reps: '8', date: '2026-11-20' },
];
test('beat last time: +5 lb', () => assert.deepStrictEqual(nextTarget(W, 'bench press').suggestion, { weight: 140, reps: 8 }));
test('bodyweight: +1 rep', () => assert.deepStrictEqual(nextTarget(W, 'Pull-ups').suggestion, { weight: 0, reps: 9 }));
test('never done = no hint', () => assert.strictEqual(nextTarget(W, 'Deadlift'), null));
test('personal record only when beating every earlier log', () => {
  assert.strictEqual(isPersonalRecord(W, 'Bench Press', '140'), true);
  assert.strictEqual(isPersonalRecord(W, 'Bench Press', '135'), false);
  assert.strictEqual(isPersonalRecord(W, 'Deadlift', '300'), false);
});
test('repeat last workout picks the most recent earlier day, in logged order', () => {
  const d = lastWorkoutDay(W, TODAY);
  assert.strictEqual(d.date, '2026-11-25');
  assert.deepStrictEqual(d.sets.map(s => s.exercise), ['Squat', 'Bench Press']);
  assert.strictEqual(lastWorkoutDay([], TODAY), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
