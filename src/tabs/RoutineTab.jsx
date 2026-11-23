// The Routine tab: today's habits, how you feel, and daily reminders.
// Every value and handler arrives as a prop from LifeTracker.jsx.
import { BtnPrimary, CheckCircle, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { downloadICS } from '../lib/ics.js';
import { MOODS, MOOD_LABELS } from '../lib/constants.js';
import { Plus, Trash2 } from 'lucide-react';
import { streakFor } from '../lib/utils.js';

export default function RoutineTab({ addScheduleRow, deleteHabit, deleteScheduleRow, habitsToday, handleAddHabit, newHabitName, routine, setMood, setNewHabitName, today, toggleHabit, updateScheduleRow }) {
  return (
    <div className="md:grid md:grid-cols-2 md:gap-3 md:items-start">
      <div>
        <Panel title="Today's habits" right={<span className="text-sm" style={dimText}>{habitsToday.length}/{routine.habits.length}</span>}>
          {routine.habits.length === 0 && (
            <p className="text-sm mb-3" style={dimText}>Add something small you want to do every day, like "Drink water".</p>
          )}
          <div className="space-y-1.5 mb-3">
            {routine.habits.map(h => {
              const done = habitsToday.includes(h.id);
              const streak = streakFor(h.id, routine.logs);
              return (
                <div key={h.id} className="flex items-center gap-3 px-3 py-2.5" style={{ background: 'var(--field)', borderRadius: 12 }}>
                  <CheckCircle on={done} onClick={() => toggleHabit(h.id, today)} label={`Done: ${h.name}`} />
                  <button onClick={() => toggleHabit(h.id, today)} className="flex-1 text-left text-sm"
                    style={{ color: done ? 'var(--dim)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                    {h.name}
                  </button>
                  {streak > 1 && <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{streak} days</span>}
                  <button onClick={() => deleteHabit(h.id)} style={dimText} aria-label={`Delete ${h.name}`}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 min-w-0 text-sm px-3 py-2.5 focus:outline-none"
              style={inputStyle}
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              placeholder="New habit"
              onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); }}
            />
            <BtnPrimary onClick={handleAddHabit} style={{ padding: '0 14px' }}><Plus size={18} /></BtnPrimary>
          </div>
        </Panel>
      </div>

      <div>
        <Panel title="How do you feel today?">
          <div className="flex gap-1.5">
            {MOODS.map((m, i) => {
              const on = routine.moodLog[today] === i;
              return (
                <button key={i} onClick={() => setMood(today, i)} aria-pressed={on}
                  className="flex-1 py-2 text-center"
                  style={{ background: on ? 'var(--accent-soft)' : 'var(--field)', border: `1.5px solid ${on ? 'var(--accent)' : 'transparent'}` }}>
                  <div className="text-xl">{m}</div>
                  <div className="text-[10px] mt-0.5" style={dimText}>{MOOD_LABELS[i]}</div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Daily reminders" hint="Turn on the bell at the top to get a nudge at each time.">
          <div className="space-y-1.5 mb-3">
            {routine.schedule.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'var(--field)', borderRadius: 12 }}>
                <input
                  className="w-20 bg-transparent text-sm font-medium focus:outline-none flex-shrink-0"
                  style={{ color: 'var(--accent)' }}
                  value={s.time}
                  onChange={e => updateScheduleRow(s.id, 'time', e.target.value)}
                  placeholder="8:00 AM"
                  aria-label="Time"
                />
                <input
                  className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
                  value={s.label}
                  onChange={e => updateScheduleRow(s.id, 'label', e.target.value)}
                  placeholder="What to do"
                  aria-label="Reminder"
                />
                <button onClick={() => deleteScheduleRow(s.id)} className="flex-shrink-0" style={dimText} aria-label="Delete reminder"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <BtnPrimary onClick={addScheduleRow} style={{ background: 'var(--field)', color: 'var(--text)' }}>Add reminder</BtnPrimary>
            {routine.schedule.length > 0 && (
              <button onClick={() => downloadICS(routine.schedule)} className="text-sm underline" style={dimText}>Add to phone calendar</button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
