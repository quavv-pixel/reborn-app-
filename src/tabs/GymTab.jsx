// The Gym tab. Pure view: every value and handler it needs arrives as a prop from LifeTracker.jsx, which owns all state.
import { BtnPrimary, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { ALL_EXERCISES, MONO, MUSCLE_GROUPS, RADIUS_SM, getExercisesForType } from '../lib/constants.js';
import { fmtDate } from '../lib/utils.js';
import { Trash2 } from 'lucide-react';

export default function GymTab({ deleteWorkout, gDate, gExercise, gMuscle, gReps, gSets, gWeight, gym, handleAddWorkout, handleExerciseChange, personalBests, setGDate, setGMuscle, setGReps, setGSets, setGWeight, splitStripRef, todayIdx, updateSplitDay, workoutsByDate }) {
  return (
        <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel title="Weekly split">
              {/* Horizontal day-selector strip — today gets an accent ring
                  and dot, matching the Mon-Sun day cards in the gaming
                  profile reference. Each card still holds the same editable
                  type input the old list rows had. */}
              <div ref={splitStripRef} className="flex gap-2 overflow-x-auto pb-1">
                {gym.split.map((s, i) => (
                  <div
                    key={s.day}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5"
                    style={{
                      width: 76,
                      border: `1px solid ${i === todayIdx ? 'var(--accent)' : 'var(--border)'}`,
                      background: i === todayIdx ? 'var(--field)' : 'var(--panel)',
                      borderRadius: RADIUS_SM,
                    }}
                  >
                    <span className="text-xs uppercase tracking-wide" style={{ fontFamily: MONO, color: i === todayIdx ? 'var(--accent)' : 'var(--dim)' }}>{s.day}</span>
                    <span className="w-1.5 h-1.5" style={{ borderRadius: '50%', background: i === todayIdx ? 'var(--accent)' : 'var(--border)' }} />
                    <input
                      className="w-full bg-transparent text-xs text-center focus:outline-none"
                      style={{ color: 'var(--text)' }}
                      value={s.type}
                      onChange={e => updateSplitDay(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </Panel>

            {personalBests.length > 0 && (
              <Panel title="Personal bests">
                <div className="space-y-1">
                  {personalBests.map(([ex, wt]) => (
                    <div key={ex} className="flex justify-between text-sm">
                      <span>{ex}</span>
                      <span style={{ fontFamily: MONO, color: 'var(--accent)' }}>{wt} lb</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="History">
              {workoutsByDate.length === 0 ? (
                <p className="text-sm" style={dimText}>No lifts logged yet. Add your first one on the right.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {workoutsByDate.map(([date, list]) => (
                    <div key={date}>
                      <div className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: MONO, ...dimText }}>{fmtDate(date)}</div>
                      <div className="space-y-1">
                        {list.map(w => (
                          <div key={w.id} className="flex items-center justify-between px-2 py-1.5" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
                            <div className="text-sm">
                              {w.muscle && <span className="text-[10px] mr-1 px-1.5 py-0.5" style={{ fontFamily: MONO, border: '1px solid var(--accent)', color: 'var(--accent)' }}>{w.muscle}</span>}
                              {w.exercise} <span style={dimText}>— {w.sets || '–'}×{w.reps || '–'} @ {w.weight || '–'}lb</span>
                            </div>
                            <button onClick={() => deleteWorkout(w.id)} style={dimText}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div>
            <Panel title={`Exercises for today — ${gym.split[todayIdx] ? gym.split[todayIdx].type : '—'} day`}>
              {getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').length === 0 ? (
                <p className="text-sm" style={dimText}>Rest day — nothing scheduled. Pick "Add lift" below manually if you're training anyway.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').map(name => (
                    <button
                      key={name}
                      onClick={() => handleExerciseChange(name)}
                      className="text-xs px-2 py-1"
                      style={{
                        fontFamily: MONO,
                        border: `1px solid ${gExercise === name ? 'var(--accent)' : 'var(--border)'}`,
                        background: gExercise === name ? 'var(--accent)' : 'var(--field)',
                        color: gExercise === name ? 'var(--on-accent)' : 'var(--text)',
                      }}
                    >{name}</button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Log a set">
              <div className="mb-2">
                <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Muscle group tag (optional)</label>
                <div className="flex flex-wrap gap-1">
                  {MUSCLE_GROUPS.map(mg => (
                    <button key={mg} onClick={() => setGMuscle(gMuscle === mg ? '' : mg)}
                      className="text-[10px] px-2 py-1"
                      style={{
                        fontFamily: MONO,
                        border: `1px solid ${gMuscle === mg ? 'var(--accent)' : 'var(--border)'}`,
                        background: gMuscle === mg ? 'var(--accent)' : 'transparent',
                        color: gMuscle === mg ? 'var(--on-accent)' : 'var(--dim)',
                      }}>{mg}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Exercise</label>
                  <select className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gExercise} onChange={e => handleExerciseChange(e.target.value)}>
                    <option value="" disabled>Select an exercise…</option>
                    {getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {ALL_EXERCISES.filter(name => !getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').includes(name)).length > 0 && (
                      <optgroup label="Other days">
                        {ALL_EXERCISES.filter(name => !getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').includes(name)).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Sets</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gSets} onChange={e => setGSets(e.target.value)} placeholder="3" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Reps</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gReps} onChange={e => setGReps(e.target.value)} placeholder="10" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Weight (lb)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gWeight} onChange={e => setGWeight(e.target.value)} placeholder="135" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Date</label>
                  <input type="date" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gDate} onChange={e => setGDate(e.target.value)} />
                </div>
              </div>
              <BtnPrimary onClick={handleAddWorkout}>Add lift</BtnPrimary>
              <p className="text-xs mt-2" style={dimText}>Sets/reps/weight auto-fill from your last log of the selected exercise — tweak and log again for each set.</p>
            </Panel>
          </div>
          </div>
  );
}
