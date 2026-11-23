// The Budget tab. Pure view: every value and handler it needs arrives as a prop from LifeTracker.jsx, which owns all state.
import { BtnPrimary, Meter, Panel, dimText, inputStyle } from '../components/ui.jsx';
import { fmtDate, fmtMoney } from '../lib/utils.js';
import { MONO, RADIUS_SM } from '../lib/constants.js';
import { Check, Plus, Trash2 } from 'lucide-react';

export default function BudgetTab({ addPlanLine, addSavingsAmount, addToSavings, billAmount, billName, billsThisMonthPaid, budget, budgetOnTrack, budgetPctDone, deleteBill, deletePlanLine, editBillAmount, editBillName, editingBillId, goal, handleAddBill, logConfirmed, logWeeklyPlan, paidBills, planAmount, planCategory, remainingBills, saveEditBill, setAddSavingsAmount, setBillAmount, setBillName, setEditBillAmount, setEditBillName, setEditingBillId, setMonthlyBudget, setPlanAmount, setPlanCategory, setWeeklyIncome, spentThisMonth, startEditBill, thisMonth, today, toggleBillPaid, togglePlanDone, totalBills, updateGoal, updatePlanAmount, updatePlanCategory, updateWeeklySavingsAmount, weeklyNeeded, weeklyPlanTotal, weeksLeft }) {
  return (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <Meter
              label={`${goal.name} fund`}
              value={Number(goal.saved) || 0}
              max={Number(goal.target) || 1}
              displayValue={fmtMoney(goal.saved)}
              displayMax={fmtMoney(goal.target)}
              accentVar="--accent2" barVar="--accent2"
            />
            <Meter
              label="Weeks left"
              value={weeksLeft}
              max={weeksLeft || 1}
              displayMax={weeksLeft}
              accentVar="--accent" barVar="--accent"
            />
            <div className="p-3" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
              <div className="text-xs uppercase tracking-widest mb-2 truncate" style={{ fontFamily: MONO, ...dimText }}>Per week needed</div>
              <div className="text-xl font-medium" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmtMoney(weeklyNeeded)}</div>
            </div>
            <div className="p-3" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
              <div className="text-xs uppercase tracking-widest mb-2 truncate" style={{ fontFamily: MONO, ...dimText }}>Status</div>
              <div className="text-xl font-medium" style={{ fontFamily: MONO, color: budgetPctDone >= 100 ? 'var(--accent2)' : budgetOnTrack === null ? 'var(--dim)' : budgetOnTrack ? 'var(--accent2)' : 'var(--danger)' }}>
                {budgetPctDone >= 100 ? 'Done' : budgetOnTrack === null ? '—' : budgetOnTrack ? 'On track' : 'Behind'}
              </div>
            </div>
          </div>

          <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel title="Savings goal">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Goal</label>
                  <input className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.name} onChange={e => updateGoal('name', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Target ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.target} onChange={e => updateGoal('target', e.target.value === '' ? 0 : Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Saved so far ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.saved} onChange={e => updateGoal('saved', e.target.value === '' ? 0 : Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Target date</label>
                  <input type="date" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.targetDate} onChange={e => updateGoal('targetDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Save per week ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.weeklySavingsAmount || ''} onChange={e => updateWeeklySavingsAmount(e.target.value)} placeholder="e.g. 100" />
                </div>
              </div>
              <Meter
                label={`${goal.name} fund`}
                value={Number(goal.saved) || 0}
                max={Number(goal.target) || 1}
                displayValue={fmtMoney(goal.saved)}
                displayMax={fmtMoney(goal.target)}
                accentVar="--accent2" barVar="--accent2"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  className="flex-1 text-sm px-3 py-2 focus:outline-none"
                  style={inputStyle}
                  value={addSavingsAmount}
                  onChange={e => setAddSavingsAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addToSavings(addSavingsAmount); }}
                  placeholder="Add an amount…"
                />
                <BtnPrimary onClick={() => addToSavings(addSavingsAmount)}>Add to savings</BtnPrimary>
              </div>
              {Number(goal.weeklySavingsAmount) > 0 ? (
                (() => {
                  const remaining = Math.max(0, (Number(goal.target) || 0) - (Number(goal.saved) || 0));
                  const wk = Math.ceil(remaining / Number(goal.weeklySavingsAmount));
                  const projected = new Date(Date.now() + wk * 7 * 86400000);
                  return (
                    <div className="p-3 mt-2" style={{ background: 'var(--field)', border: '1px solid var(--accent2)', borderRadius: RADIUS_SM }}>
                      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: 'var(--accent2)', lineHeight: 1 }}>
                        {wk === 0 ? 'Goal met' : `${wk} ${wk === 1 ? 'week' : 'weeks'}`}
                      </div>
                      <div className="text-xs mt-1" style={dimText}>
                        at {fmtMoney(goal.weeklySavingsAmount)}/wk → {goal.name} funded by <span style={{ color: 'var(--text)' }}>{fmtDate(projected.toISOString().slice(0, 10))}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs mt-2" style={dimText}>
                  Set a weekly amount above to see how long {goal.name} will take. This is separate from the weekly plan below — your actual plan can save faster, slower, or nothing some weeks, that's fine.
                </p>
              )}
            </Panel>

            <Panel title="Debt payoff (optional, runs before savings)">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Amount owed ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.debtAmount || 0} onChange={e => updateGoal('debtAmount', e.target.value === '' ? 0 : Number(e.target.value))} disabled={goal.debtCleared} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Pay per week ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.debtWeeklyPayment || ''} onChange={e => updateGoal('debtWeeklyPayment', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="e.g. 50" disabled={goal.debtCleared} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Start paying on</label>
                  <input type="date" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.debtStartDate || today} onChange={e => updateGoal('debtStartDate', e.target.value)} disabled={goal.debtCleared} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => updateGoal('debtCleared', !goal.debtCleared)}
                    className="w-full text-sm px-3 py-2"
                    style={{ border: `1px solid ${goal.debtCleared ? 'var(--accent2)' : 'var(--border)'}`, color: goal.debtCleared ? 'var(--accent2)' : 'var(--dim)' }}>
                    {goal.debtCleared ? '✓ Cleared' : 'Mark cleared'}
                  </button>
                </div>
              </div>
              {goal.debtCleared ? (
                <p className="text-xs" style={{ color: 'var(--accent2)' }}>No debt in the way — savings go straight to your goal.</p>
              ) : goal.debtAmount > 0 && goal.debtWeeklyPayment > 0 ? (
                (() => {
                  const weeksNeeded = Math.ceil(Number(goal.debtAmount) / Number(goal.debtWeeklyPayment));
                  const start = new Date((goal.debtStartDate || today) + 'T00:00:00');
                  const payoffDate = new Date(start.getTime() + weeksNeeded * 7 * 86400000);
                  return (
                    <div className="p-3 mt-1" style={{ background: 'var(--field)', border: '1px solid var(--accent)', borderRadius: RADIUS_SM }}>
                      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{weeksNeeded} {weeksNeeded === 1 ? 'week' : 'weeks'}</div>
                      <div className="text-xs mt-1" style={dimText}>
                        at {fmtMoney(goal.debtWeeklyPayment)}/wk starting {fmtDate(goal.debtStartDate || today)} → debt-free by <span style={{ color: 'var(--text)' }}>{fmtDate(payoffDate.toISOString().slice(0, 10))}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs" style={dimText}>
                  {goal.debtAmount > 0 ? 'Set a weekly payment amount to see how long it\'ll take.' : 'No debt entered — this section stays out of the way until you add one.'}
                </p>
              )}
              {goal.debtAmount > 0 && !goal.debtCleared && (
                <p className="text-xs mt-2" style={dimText}>Any "saving" line in your weekly plan below also pays this down first, on top of the plan above.</p>
              )}
            </Panel>

            <Panel
              title="Weekly plan"
              right={
                <button
                  onClick={logWeeklyPlan}
                  className="flex items-center gap-1 text-xs px-2 py-1"
                  style={{
                    border: `1px solid ${logConfirmed ? 'var(--accent2)' : 'var(--accent)'}`,
                    color: logConfirmed ? 'var(--accent2)' : 'var(--accent)',
                  }}
                >
                  {logConfirmed && <Check size={12} />}
                  {logConfirmed ? 'Logged' : 'Log this week'}
                </button>
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Weekly income</span>
                <input
                  type="number"
                  className="w-24 text-sm px-2 py-1 text-right"
                  style={inputStyle}
                  value={budget.weeklyIncome}
                  onChange={e => setWeeklyIncome(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                {budget.weeklyPlan.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => togglePlanDone(p.id)}
                      title={p.done ? 'Done for this week — tap to undo' : 'Mark done for this week'}
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 20, height: 20,
                        background: p.done ? 'var(--accent)' : 'transparent',
                        border: `1.5px solid ${p.done ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: RADIUS_SM,
                      }}
                    >
                      {p.done && <Check size={13} color="#fff" strokeWidth={3} />}
                    </button>
                    <input
                      className="flex-1 text-sm px-2 py-1 focus:outline-none"
                      style={{ ...inputStyle, opacity: p.done ? 0.55 : 1, textDecoration: p.done ? 'line-through' : 'none' }}
                      value={p.category}
                      onChange={e => updatePlanCategory(p.id, e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-20 text-sm px-2 py-1 text-right"
                      style={{ ...inputStyle, opacity: p.done ? 0.55 : 1 }}
                      value={p.amount}
                      onChange={e => updatePlanAmount(p.id, e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                    <button onClick={() => deletePlanLine(p.id)} style={dimText}><Trash2 size={14} /></button>
                  </div>
                ))}
                {budget.weeklyPlan.length === 0 && (
                  <p className="text-sm" style={dimText}>No categories yet — add your own below.</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <input
                  className="flex-1 text-sm px-2 py-1 focus:outline-none"
                  style={inputStyle}
                  value={planCategory}
                  onChange={e => setPlanCategory(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addPlanLine(planCategory, planAmount); setPlanCategory(''); setPlanAmount(''); } }}
                  placeholder="New category"
                />
                <input
                  type="number"
                  className="w-20 text-sm px-2 py-1 text-right"
                  style={inputStyle}
                  value={planAmount}
                  onChange={e => setPlanAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addPlanLine(planCategory, planAmount); setPlanCategory(''); setPlanAmount(''); } }}
                  placeholder="$"
                />
                <button onClick={() => { addPlanLine(planCategory, planAmount); setPlanCategory(''); setPlanAmount(''); }}
                  style={{ color: 'var(--accent)' }}><Plus size={16} /></button>
              </div>
              <div className="flex justify-between text-xs mt-2 pt-2" style={{ ...dimText, borderTop: '1px solid var(--border)' }}>
                <span>Planned total</span>
                <span style={{ fontFamily: MONO }}>{fmtMoney(weeklyPlanTotal)}</span>
              </div>
            </Panel>
          </div>

          <div>
            <Panel title="Milestones">
              <div className="space-y-2">
                {(goal.debtAmount > 0 || goal.debtCleared) && (
                  <div className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: `1px solid ${goal.debtCleared ? 'var(--accent2)' : 'var(--border)'}`, borderRadius: RADIUS_SM }}>
                    <span className="text-sm">💳 Debt cleared</span>
                    <span className="text-xs" style={{ fontFamily: MONO, color: goal.debtCleared ? 'var(--accent2)' : 'var(--dim)' }}>{goal.debtCleared ? 'DONE' : 'pending'}</span>
                  </div>
                )}
                {[0.25, 0.5, 0.75, 1].map(frac => {
                  const target = Math.round((Number(goal.target) || 0) * frac);
                  const reached = (Number(goal.saved) || 0) >= target;
                  return (
                    <div key={frac} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: `1px solid ${reached ? 'var(--accent)' : 'var(--border)'}`, borderRadius: RADIUS_SM }}>
                      <span className="text-sm">{frac === 1 ? '🎯' : '🌱'} {Math.round(frac * 100)}% of {goal.name}</span>
                      <span className="text-xs" style={{ fontFamily: MONO, color: reached ? 'var(--accent)' : 'var(--dim)' }}>{reached ? fmtMoney(target) + ' ✓' : fmtMoney(target)}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Monthly bills">
              <div className="space-y-1 mb-2">
                {budget.bills.map(b => {
                  const paid = billsThisMonthPaid.includes(b.id);
                  const isEditing = editingBillId === b.id;
                  if (isEditing) {
                    return (
                      <div key={b.id} className="flex items-center gap-2 px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--accent)', borderRadius: RADIUS_SM }}>
                        <input
                          className="flex-1 text-sm px-2 py-1 focus:outline-none"
                          style={inputStyle}
                          value={editBillName}
                          onChange={e => setEditBillName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditBill(); if (e.key === 'Escape') setEditingBillId(null); }}
                          autoFocus
                        />
                        <input
                          type="number"
                          className="w-20 text-sm px-2 py-1 focus:outline-none"
                          style={inputStyle}
                          value={editBillAmount}
                          onChange={e => setEditBillAmount(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditBill(); if (e.key === 'Escape') setEditingBillId(null); }}
                        />
                        <button onClick={saveEditBill} className="text-xs px-2 py-1" style={{ border: '1px solid var(--accent2)', color: 'var(--accent2)' }}>Save</button>
                        <button onClick={() => setEditingBillId(null)} style={dimText}>✕</button>
                      </div>
                    );
                  }
                  return (
                    <div key={b.id} onDoubleClick={() => startEditBill(b)} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
                      <button onClick={() => toggleBillPaid(b.id, thisMonth)} onDoubleClick={e => { e.stopPropagation(); startEditBill(b); }} className="flex items-center gap-2 flex-1 text-left">
                        <span className="w-4 h-4 flex-shrink-0" style={{ background: paid ? 'var(--accent2)' : 'transparent', border: `1px solid ${paid ? 'var(--accent2)' : 'var(--border)'}` }} />
                        <span className="text-sm" style={{ color: paid ? 'var(--dim)' : 'var(--text)', textDecoration: paid ? 'line-through' : 'none' }}>{b.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ fontFamily: MONO }} onDoubleClick={e => { e.stopPropagation(); startEditBill(b); }}>{fmtMoney(b.amount)}</span>
                        <button onClick={() => deleteBill(b.id)} style={dimText}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] mb-2" style={dimText}>Double-tap a bill to edit its name or amount.</p>
              <div className="flex gap-2 mb-2">
                <input className="flex-1 text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={billName} onChange={e => setBillName(e.target.value)} placeholder="Bill name" />
                <input
                  type="number"
                  className="w-24 text-sm px-2"
                  style={inputStyle}
                  value={billAmount}
                  onChange={e => setBillAmount(e.target.value)}
                  placeholder="$"
                />
                <BtnPrimary onClick={handleAddBill}><Plus size={16} /></BtnPrimary>
              </div>
              <div className="flex justify-between text-xs pt-2 mb-1" style={{ ...dimText, borderTop: '1px solid var(--border)' }}>
                <span>Paid {fmtMoney(paidBills)} of {fmtMoney(totalBills)}</span>
                <span style={{ fontFamily: MONO, color: remainingBills > 0 ? 'var(--danger)' : 'var(--accent2)' }}>{fmtMoney(remainingBills)} left</span>
              </div>
            </Panel>

            <Panel
              title="Monthly cap (optional)"
              right={
                <input
                  type="number"
                  className="w-24 text-sm px-2 py-1 text-right"
                  style={inputStyle}
                  value={budget.monthlyBudget}
                  onChange={e => setMonthlyBudget(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              }
            >
              {budget.monthlyBudget > 0 ? (
                <Meter
                  label="Spent this month"
                  value={spentThisMonth}
                  max={budget.monthlyBudget}
                  displayValue={fmtMoney(spentThisMonth)}
                  displayMax={fmtMoney(budget.monthlyBudget)}
                  accentVar={spentThisMonth > budget.monthlyBudget ? '--danger' : '--accent2'}
                  barVar={spentThisMonth > budget.monthlyBudget ? '--danger' : '--accent2'}
                />
              ) : (
                <p className="text-sm" style={dimText}>Optional: set an overall monthly spending cap to track against.</p>
              )}
            </Panel>
          </div>
          </div>
          </div>
  );
}
