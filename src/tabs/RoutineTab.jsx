// The Routine tab. Pure view: every value and handler it needs arrives as a prop from LifeTracker.jsx, which owns all state.
import { BtnPrimary, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { downloadICS } from '../lib/ics.js';
import { CATEGORIES, MONO, MOODS, MOOD_LABELS, RADIUS_SM } from '../lib/constants.js';
import { CalendarDays, Download, Plus, Trash2 } from 'lucide-react';
import { streakFor } from '../lib/utils.js';

export default function RoutineTab({ addScheduleRow, deleteHabit, deleteScheduleRow, habitsToday, handleAddHabit, last7Days, newHabitCategory, newHabitName, routine, setMood, setNewHabitCategory, setNewHabitName, today, toggleHabit, updateScheduleRow }) {
  return (
        <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel
              title="Daily schedule"
              right={
                <button onClick={() => downloadICS(routine.schedule)} className="flex items-center gap-1 text-[11px] px-2 py-1" style={{ fontFamily: MONO, border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                  <Download size={12} /> Export to calendar
                </button>
              }
            >
              <div className="space-y-1 mb-2 max-h-96 overflow-y-auto">
                {routine.schedule.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
                    <input
                      className="w-20 bg-transparent text-xs focus:outline-none flex-shrink-0"
                      style={{ fontFamily: MONO, color: 'var(--accent)' }}
                      value={s.time}
                      onChange={e => updateScheduleRow(s.id, 'time', e.target.value)}
                      placeholder="8:00 AM"
                    />
                    <input
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                      style={{ color: 'var(--text)' }}
                      value={s.label}
                      onChange={e => updateScheduleRow(s.id, 'label', e.target.value)}
                    />
                    <button onClick={() => deleteScheduleRow(s.id)} className="flex-shrink-0" style={dimText}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <BtnPrimary onClick={addScheduleRow}>Add block</BtnPrimary>
                <span className="text-xs flex items-center gap-1" style={dimText}>
                  <CalendarDays size={12} /> Export makes each block a daily repeating reminder — re-export after edits.
                </span>
              </div>
            </Panel>
          </div>

          <div>
            <Panel title="Today's vibe">
              <div className="flex gap-1.5">
                {MOODS.map((m, i) => (
                  <button key={i} onClick={() => setMood(today, i)}
                    className="flex-1 py-2 text-center"
                    style={{
                      background: routine.moodLog[today] === i ? 'var(--field)' : 'transparent',
                      border: `1px solid ${routine.moodLog[today] === i ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <div className="text-lg">{m}</div>
                    <div className="text-[9px] mt-0.5" style={dimText}>{MOOD_LABELS[i]}</div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Today's checklist">
              {routine.habits.length === 0 ? (
                <p className="text-sm mb-2" style={dimText}>No habits yet. Add one below.</p>
              ) : (
                <div className="mb-3">
                  {CATEGORIES.map(cat => {
                    const inCat = routine.habits.filter(h => (h.category || 'personal') === cat.id);
                    if (!inCat.length) return null;
                    return (
                      <div key={cat.id} className="mb-3">
                        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: MONO, color: cat.color }}>{cat.icon} {cat.label}</div>
                        <div className="space-y-1">
                          {inCat.map(h => {
                            const done = habitsToday.includes(h.id);
                            const streak = streakFor(h.id, routine.logs);
                            return (
                              <div key={h.id} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
                                <button onClick={() => toggleHabit(h.id, today)} className="flex items-center gap-2 flex-1 text-left">
                                  <span className="w-4 h-4 flex-shrink-0" style={{ background: done ? cat.color : 'transparent', border: `1px solid ${done ? cat.color : 'var(--border)'}` }} />
                                  <span className="text-sm" style={{ color: done ? 'var(--dim)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{h.name}</span>
                                </button>
                                <div className="flex items-center gap-2">
                                  {streak > 0 && <span className="text-xs" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{streak}d</span>}
                                  <button onClick={() => deleteHabit(h.id)} style={dimText}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
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
                    className="text-[10px] px-2 py-1"
                    style={{
                      fontFamily: MONO,
                      border: `1px solid ${newHabitCategory === cat.id ? cat.color : 'var(--border)'}`,
                      background: newHabitCategory === cat.id ? cat.color : 'transparent',
                      color: newHabitCategory === cat.id ? '#000' : 'var(--dim)',
                    }}>{cat.icon} {cat.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-sm px-3 py-2 focus:outline-none"
                  style={inputStyle}
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  placeholder="New habit"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); }}
                />
                <BtnPrimary onClick={handleAddHabit}><Plus size={16} /></BtnPrimary>
              </div>
            </Panel>

            <Panel title="Last 7 days">
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ fontFamily: MONO }}>
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
                        <td className="pr-2 py-1 truncate" style={{ maxWidth: '5.5rem', ...dimText }}>{h.name}</td>
                        {last7Days.map(d => {
                          const on = (routine.logs[d] || []).includes(h.id);
                          return (
                            <td key={d} className="text-center py-1">
                              <span className="inline-block w-3 h-3" style={{ background: on ? 'var(--accent2)' : 'var(--field)', border: on ? 'none' : '1px solid var(--border)', borderRadius: 3 }} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
          </div>
  );
}
