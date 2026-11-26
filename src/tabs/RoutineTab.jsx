// The Routine tab. "Habits & reminders" is one list: every habit can have an
// optional time, and a habit with a time is also a reminder (the bell at the
// top sends a nudge at that time, and "Add to calendar" exports them).
// Every value and handler arrives as a prop from LifeTracker.jsx.
import { BtnPrimary, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { downloadICS } from '../lib/ics.js';
import { CATEGORIES, MOODS, MOOD_LABELS } from '../lib/constants.js';
import { Bell, Download, Plus, Trash2 } from 'lucide-react';
import { bestStreak, currentStreak } from '../lib/progress.js';
import ChallengeCard from '../components/ChallengeCard.jsx';

// "18:30" -> "6:30 PM" (the phone's own clock style).
function fmtTime(hhmm) {
  const [h, m] = (hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Reminder time chip. Shows "6:30 PM" (or "Time" when empty) as plain text,
// with the phone's own time picker laid invisibly on top — tapping the chip
// opens the native wheel/clock on iPhone and Android. Empty = no reminder.
function TimeField({ value, onChange, label }) {
  return (
    <label className="relative flex items-center gap-1 px-2.5 py-1.5 flex-shrink-0 text-xs font-medium"
      style={{ background: value ? 'var(--accent-soft)' : 'transparent', border: `1px solid ${value ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 999, color: value ? 'var(--accent)' : 'var(--dim)' }}>
      <Bell size={12} />
      <span className="whitespace-nowrap">{value ? fmtTime(value) : 'Time'}</span>
      <input type="time" value={value || ''} onChange={e => onChange(e.target.value)} aria-label={label}
        onClick={e => { try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch { /* older browsers open it on tap anyway */ } }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
    </label>
  );
}

export default function RoutineTab({ challenge, skipHabit, toggleRestDay, startChallenge, endChallenge, deleteHabit, habitsToday, handleAddHabit, last7Days, newHabitCategory, newHabitName, newHabitTime, routine, setHabitTime, setMood, setNewHabitCategory, setNewHabitName, setNewHabitTime, today, toggleHabit }) {
  const timed = routine.habits.filter(h => h.time);
  const restToday = (routine.restDays || []).includes(today);
  const skippedToday = (routine.skips || {})[today] || [];
  return (
    <div className="md:grid md:grid-cols-2 md:gap-3 md:items-start">
      <div>
        <ChallengeCard progress={challenge} startChallenge={startChallenge} endChallenge={endChallenge} />
        <Panel
          title="Habits & reminders"
          right={timed.length > 0 && (
            <button onClick={() => downloadICS(routine.schedule)} className="flex items-center gap-1 text-xs px-2 py-1"
              style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
              <Download size={12} /> Add to calendar
            </button>
          )}
          hint="Tick a habit when it's done, or Skip it today without losing your streak. Give it a time for a reminder (turn on the bell at the top)."
        >
          <button onClick={() => toggleRestDay(today)} aria-pressed={restToday}
            className="w-full text-sm px-3 py-2 mb-3 text-left"
            style={{ background: restToday ? 'var(--accent-soft)' : 'transparent', border: `1px ${restToday ? 'solid' : 'dashed'} ${restToday ? 'var(--accent)' : 'var(--border)'}`, color: restToday ? 'var(--accent)' : 'var(--dim)' }}>
            {restToday ? '😴 Rest day today. Every streak is safe. Tap to undo' : '😴 Need a break? Take a rest day (keeps every streak)'}
          </button>
          {routine.habits.length === 0 ? (
            <p className="text-sm mb-3" style={dimText}>No habits yet. Add one below.</p>
          ) : (
            <div className="mb-3">
              {CATEGORIES.map(cat => {
                const inCat = routine.habits
                  .filter(h => (h.category || 'personal') === cat.id)
                  .sort((a, b) => (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0);
                if (!inCat.length) return null;
                return (
                  <div key={cat.id} className="mb-3">
                    <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--accent)' }}>{cat.icon} {cat.label}</div>
                    <div className="space-y-1.5">
                      {inCat.map(h => {
                        const done = habitsToday.includes(h.id);
                        const streak = currentStreak(h.id, routine, today);
                        const best = bestStreak(h.id, routine, today);
                        const skipped = skippedToday.includes(h.id);
                        return (
                          <div key={h.id} className="flex items-center gap-2 px-2.5 py-2" style={{ background: 'var(--field)', borderRadius: 12 }}>
                            <button onClick={() => toggleHabit(h.id, today)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left" aria-pressed={done}>
                              <span className="flex items-center justify-center flex-shrink-0"
                                style={{ width: 22, height: 22, borderRadius: 999, background: done ? 'var(--accent)' : 'transparent', border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--on-accent)', fontSize: 12 }}>
                                {done ? '✓' : ''}
                              </span>
                              <span className="text-sm truncate" style={{ color: done ? 'var(--dim)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{h.name}</span>
                            </button>
                            {streak > 0 && <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--accent)' }} title={`Best: ${best} days`}>🔥{streak}</span>}
                            {!done && !restToday && (
                              <button onClick={() => skipHabit(h.id, today)} aria-pressed={skipped} aria-label={`${skipped ? 'Undo skip' : 'Skip today'}: ${h.name}`}
                                className="text-[11px] px-2 py-1 flex-shrink-0"
                                style={{ background: skipped ? 'var(--accent-soft)' : 'transparent', color: skipped ? 'var(--accent)' : 'var(--dim)', border: '1px solid var(--border)', borderRadius: 999 }}>
                                {skipped ? 'Skipped' : 'Skip'}
                              </button>
                            )}
                            <TimeField value={h.time} onChange={v => setHabitTime(h.id, v)} label={`Reminder time for ${h.name}`} />
                            <button onClick={() => deleteHabit(h.id)} style={dimText} className="flex-shrink-0" aria-label={`Delete ${h.name}`}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-1 mb-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setNewHabitCategory(cat.id)}
                className="text-xs px-2.5 py-1"
                style={{
                  border: `1px solid ${newHabitCategory === cat.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: newHabitCategory === cat.id ? 'var(--accent-soft)' : 'transparent',
                  color: newHabitCategory === cat.id ? 'var(--accent)' : 'var(--dim)',
                }}>{cat.icon} {cat.label}</button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 min-w-0 text-sm px-3 py-2.5 focus:outline-none"
              style={inputStyle}
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              placeholder="New habit"
              onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); }}
            />
            <TimeField value={newHabitTime} onChange={setNewHabitTime} label="Reminder time (optional)" />
            <BtnPrimary onClick={handleAddHabit} style={{ padding: '10px 12px' }}><Plus size={16} /></BtnPrimary>
          </div>
        </Panel>
      </div>

      <div>
        <Panel title="Today's vibe">
          <div className="flex gap-1.5">
            {MOODS.map((m, i) => {
              const on = routine.moodLog[today] === i;
              return (
                <button key={i} onClick={() => setMood(today, i)} aria-pressed={on}
                  className="flex-1 py-2 text-center"
                  style={{ background: on ? 'var(--accent-soft)' : 'var(--field)', border: `1.5px solid ${on ? 'var(--accent)' : 'transparent'}` }}>
                  <div className="text-lg">{m}</div>
                  <div className="text-[10px] mt-0.5" style={dimText}>{MOOD_LABELS[i]}</div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Last 7 days">
          {routine.habits.length === 0 ? (
            <p className="text-sm" style={dimText}>Your week shows up here once you add habits.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <td></td>
                    {last7Days.map(d => (
                      <td key={d} className="text-center pb-1" style={dimText}>
                        {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {routine.habits.map(h => (
                    <tr key={h.id}>
                      <td className="pr-2 py-1 truncate" style={{ maxWidth: '6rem', ...dimText }}>{h.name}</td>
                      {last7Days.map(d => {
                        const on = (routine.logs[d] || []).includes(h.id);
                        return (
                          <td key={d} className="text-center py-1">
                            <span className="inline-block w-3.5 h-3.5" style={{ background: on ? 'var(--accent)' : 'var(--field)', border: on ? 'none' : '1px solid var(--border)', borderRadius: 4 }} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
