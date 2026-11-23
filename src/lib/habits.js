// Habits and reminders are one list: a habit with a `time` ("HH:MM") is
// also a reminder. Pure functions, unit-tested in test/habits.test.js.
import { parseTimeLabel } from './ics.js';

// ---- habits + reminders --------------------------------------------------
// The reminder list the bell / push server / calendar export read, made from
// the habits that have a time.
export function scheduleFromHabits(habits) {
  return habits.filter(h => h.time).map(h => ({ id: h.id, time: h.time, label: h.name }));
}
// One-time move for older data, where reminders were a separate list. Each
// old reminder had a twin habit ('hb-s-<id>'); the reminder's time moves onto
// that habit (or a new habit is made for it). Nothing is lost, and running it
// again changes nothing.
export function mergeRemindersIntoHabits(r) {
  const habits = (r.habits || []).map(h => ({ ...h }));
  const byId = new Map(habits.map(h => [h.id, h]));
  for (const block of r.schedule || []) {
    const label = (block.label || '').trim();
    if (!label) continue;
    const p = parseTimeLabel(block.time);
    const time = p ? `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}` : '';
    const twinId = String(block.id).startsWith('hb-s-') ? String(block.id) : 'hb-s-' + block.id;
    const twin = byId.get(block.id) || byId.get(twinId);
    if (twin) { if (time && !twin.time) twin.time = time; }
    else {
      const h = { id: twinId, name: label, category: 'personal' };
      if (time) h.time = time;
      habits.push(h); byId.set(h.id, h);
    }
  }
  return { ...r, habits, schedule: scheduleFromHabits(habits) };
}

