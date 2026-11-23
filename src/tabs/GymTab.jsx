// The Gym tab: log a lift, see your bests, see your history.
// Every value and handler arrives as a prop from LifeTracker.jsx.
import { BtnPrimary, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { ALL_EXERCISES } from '../lib/constants.js';
import { fmtDate } from '../lib/utils.js';
import { Trash2 } from 'lucide-react';

const field = 'w-full text-sm px-3 py-2.5 focus:outline-none';
const label = 'text-xs font-medium mb-1 block';

export default function GymTab({ deleteWorkout, gExercise, gReps, gSets, gWeight, handleAddWorkout, handleExerciseChange, personalBests, setGReps, setGSets, setGWeight, workoutsByDate }) {
  return (
    <div className="md:grid md:grid-cols-2 md:gap-3 md:items-start">
      <div>
        <Panel title="Log a lift" hint="Pick an exercise. Your last numbers fill in automatically.">
          <label className={label} style={dimText}>Exercise</label>
          <select className={field + ' mb-3'} style={inputStyle} value={gExercise} onChange={e => handleExerciseChange(e.target.value)}>
            <option value="" disabled>Choose…</option>
            {ALL_EXERCISES.slice().sort().map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className={label} style={dimText}>Sets</label>
              <input type="number" inputMode="numeric" className={field} style={inputStyle} value={gSets} onChange={e => setGSets(e.target.value)} placeholder="3" />
            </div>
            <div>
              <label className={label} style={dimText}>Reps</label>
              <input type="number" inputMode="numeric" className={field} style={inputStyle} value={gReps} onChange={e => setGReps(e.target.value)} placeholder="10" />
            </div>
            <div>
              <label className={label} style={dimText}>Weight (lb)</label>
              <input type="number" inputMode="decimal" className={field} style={inputStyle} value={gWeight} onChange={e => setGWeight(e.target.value)} placeholder="135" />
            </div>
          </div>
          <BtnPrimary onClick={handleAddWorkout} style={{ width: '100%' }}>Add lift</BtnPrimary>
        </Panel>

        {personalBests.length > 0 && (
          <Panel title="Your best lifts">
            <div className="space-y-2">
              {personalBests.map(([ex, wt]) => (
                <div key={ex} className="flex justify-between text-sm">
                  <span>{ex}</span>
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>{wt} lb</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <div>
        <Panel title="History">
          {workoutsByDate.length === 0 ? (
            <p className="text-sm" style={dimText}>Nothing yet. Your lifts will show up here.</p>
          ) : (
            <div className="space-y-4">
              {workoutsByDate.map(([date, list]) => (
                <div key={date}>
                  <div className="text-xs font-semibold mb-1.5" style={dimText}>{fmtDate(date)}</div>
                  <div className="space-y-1.5">
                    {list.map(w => (
                      <div key={w.id} className="flex items-center justify-between px-3 py-2" style={{ background: 'var(--field)', borderRadius: 10 }}>
                        <div className="text-sm">
                          {w.exercise} <span style={dimText}>· {w.sets || '–'}×{w.reps || '–'} · {w.weight || '–'} lb</span>
                        </div>
                        <button onClick={() => deleteWorkout(w.id)} style={dimText} aria-label={`Delete ${w.exercise}`}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
