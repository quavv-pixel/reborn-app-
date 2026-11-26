// Progress logic for streaks, challenges, the weekly summary and gym hints.
// Plain functions with no React, unit-tested in test/progress.test.js.
//
// Data these read (all inside the routine / gym / budget objects):
//   routine.logs      { 'YYYY-MM-DD': [habitId, ...] }   habits done that day
//   routine.skips     { 'YYYY-MM-DD': [habitId, ...] }   habits skipped that day
//   routine.restDays  ['YYYY-MM-DD', ...]               whole days off
//   routine.challenge { id, name, days, start, habitIds } (or null)
//   budget.goal.history [{ date, amount }]               money added to savings
import { localDateStr } from './utils.js';

const DAY = 86400000;
const dateOf = s => new Date(s + 'T00:00:00');
const addDays = (s, n) => localDateStr(new Date(dateOf(s).getTime() + n * DAY));

function dayState(habitId, date, routine) {
  if ((routine.logs[date] || []).includes(habitId)) return 'done';
  if ((routine.restDays || []).includes(date)) return 'rest';
  if (((routine.skips || {})[date] || []).includes(habitId)) return 'skip';
  return 'missed';
}

// Current streak. Skipped and rest days don't count, but they don't break the
// streak either. Today only counts once it's done, so an unfinished today
// doesn't wipe yesterday's streak.
export function currentStreak(habitId, routine, today = localDateStr(new Date())) {
  let streak = 0;
  let d = today;
  if (dayState(habitId, today, routine) === 'missed') d = addDays(today, -1);
  for (let i = 0; i < 3650; i++) {
    const st = dayState(habitId, d, routine);
    if (st === 'done') streak++;
    else if (st === 'missed') break;
    d = addDays(d, -1);
  }
  return streak;
}

// Longest streak ever, with the same rules. A missed day ends a run, but the
// best is kept, so missing once never takes your record away.
export function bestStreak(habitId, routine, today = localDateStr(new Date())) {
  const dates = Object.keys(routine.logs).filter(d => routine.logs[d].includes(habitId)).sort();
  if (!dates.length) return 0;
  let best = 0, run = 0;
  for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
    const st = dayState(habitId, d, routine);
    if (st === 'done') { run++; best = Math.max(best, run); }
    else if (st === 'missed' && d !== today) run = 0;
  }
  return best;
}

// ---- challenges -------------------------------------------------------------
// Ready-made resets. Starting one adds its habits (or reuses ones with the
// same name) and shows "Day N of X".
export const CHALLENGES = [
  {
    id: 'winter-arc', name: 'Winter Arc', days: 90, emoji: '❄️',
    blurb: '90 days to finish the year stronger than you started it.',
    habits: [['Move your body (30+ min)', 'gym'], ['Wake up on time', 'sleep'], ['No junk food', 'health'], ['Read or learn for 20 min', 'personal'], ['Plan tomorrow tonight', 'work']],
  },
  {
    id: '75-soft', name: '75 Soft', days: 75, emoji: '🌱',
    blurb: 'The kinder 75: daily movement, water, reading and eating well.',
    habits: [['Workout 45 min', 'gym'], ['Drink 3 liters of water', 'health'], ['Read 10 pages', 'personal'], ['Eat well, no junk', 'health']],
  },
  {
    id: '75-hard', name: '75 Hard', days: 75, emoji: '🔥',
    blurb: 'The strict one. Two workouts, a diet, a gallon of water, every day.',
    habits: [['Workout #1 (45 min)', 'gym'], ['Workout #2 outdoors (45 min)', 'gym'], ['Follow your diet, no alcohol', 'health'], ['Drink 1 gallon of water', 'health'], ['Read 10 pages', 'personal'], ['Take a progress photo', 'personal']],
  },
  {
    id: 'monk-mode', name: 'Monk Mode', days: 30, emoji: '🧘',
    blurb: 'Cut distractions and go deep on one big goal.',
    habits: [['2 hours of deep work', 'work'], ['No social media', 'personal'], ['Workout', 'gym'], ['Meditate 10 min', 'health'], ['In bed by 11pm', 'sleep']],
  },
  {
    id: 'glow-up', name: '30-Day Glow Up', days: 30, emoji: '✨',
    blurb: 'Skin, sleep, water and movement: small daily care that adds up.',
    habits: [['Skincare routine', 'health'], ['8 hours of sleep', 'sleep'], ['Drink 2 liters of water', 'health'], ['Move 30 min', 'gym'], ['1 hour less phone time', 'personal']],
  },
];

// Where a challenge stands today.
export function challengeProgress(routine, today = localDateStr(new Date())) {
  const ch = routine.challenge;
  if (!ch) return null;
  const dayNum = Math.floor((dateOf(today) - dateOf(ch.start)) / DAY) + 1;
  const day = Math.min(Math.max(dayNum, 1), ch.days);
  let perfect = 0;
  for (let d = ch.start; d <= today && d < addDays(ch.start, ch.days); d = addDays(d, 1)) {
    if (ch.habitIds.length && ch.habitIds.every(id => dayState(id, d, routine) !== 'missed')) perfect++;
  }
  const doneToday = ch.habitIds.filter(id => (routine.logs[today] || []).includes(id)).length;
  return {
    ...ch, day, perfect, doneToday, totalToday: ch.habitIds.length,
    finished: dayNum > ch.days || (dayNum === ch.days && doneToday === ch.habitIds.length),
  };
}

// ---- the week at a glance --------------------------------------------------
export function weekSummary({ routine, gym, budget }, today = localDateStr(new Date())) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const habits = routine.habits.length;
  // Only count days since you started tracking, so a new user doesn't see
  // "3% this week" on day one.
  const firstLog = Object.keys(routine.logs).filter(d => (routine.logs[d] || []).length).sort()[0] || today;
  let done = 0, possible = 0, bestDay = null, bestCount = -1;
  for (const d of days) {
    const count = (routine.logs[d] || []).filter(id => routine.habits.some(h => h.id === id)).length;
    done += count;
    if (d >= firstLog && !(routine.restDays || []).includes(d)) possible += habits;
    if (count > bestCount) { bestCount = count; bestDay = d; }
  }
  const workouts = new Set(gym.workouts.filter(w => days.includes(w.date)).map(w => w.date)).size;
  const saved = ((budget.goal && budget.goal.history) || [])
    .filter(e => days.includes(e.date)).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return {
    habitPct: possible ? Math.round((done / possible) * 100) : 0,
    habitsDone: done, workouts, saved,
    bestDay: bestCount > 0 ? bestDay : null,
  };
}

// ---- gym: beat last time ---------------------------------------------------
// The most recent log of an exercise, plus a simple next step: add 5 lb, or
// one more rep for bodyweight moves.
export function nextTarget(workouts, exercise) {
  const last = workouts.find(w => w.exercise.toLowerCase() === (exercise || '').toLowerCase());
  if (!last) return null;
  const weight = parseFloat(last.weight) || 0;
  const reps = parseInt(last.reps, 10) || 0;
  return {
    last,
    suggestion: weight > 0 ? { weight: weight + 5, reps } : { weight: 0, reps: reps + 1 },
  };
}

// True when this weight beats every earlier log of the exercise.
export function isPersonalRecord(workouts, exercise, weight) {
  const w = parseFloat(weight) || 0;
  if (w <= 0) return false;
  const prior = workouts.filter(x => x.exercise.toLowerCase() === exercise.toLowerCase()).map(x => parseFloat(x.weight) || 0);
  return prior.length > 0 && w > Math.max(...prior);
}

// Every set from the most recent workout day, to repeat in one tap.
export function lastWorkoutDay(workouts, today = localDateStr(new Date())) {
  const past = workouts.filter(w => w.date < today);
  if (!past.length) return null;
  const date = past.map(w => w.date).sort().pop();
  return { date, sets: past.filter(w => w.date === date).slice().reverse() };
}
