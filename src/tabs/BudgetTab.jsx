// The Budget tab, kept to three things: bills this month, one savings goal,
// and a simple weekly plan. Every value and handler arrives as a prop from
// LifeTracker.jsx. (Older extras — debt payoff, milestones, a monthly cap —
// were removed from the screen; any numbers saved in them are untouched.)
import { BtnPrimary, CheckCircle, Panel, ProgressBar, dimText, inputStyle } from '../components/ui.jsx';
import { fmtMoney } from '../lib/utils.js';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const field = 'text-sm px-3 py-2.5 focus:outline-none';
const row = { background: 'var(--field)', borderRadius: 12 };

export default function BudgetTab({ addPlanLine, addSavingsAmount, addToSavings, billAmount, billName, billsThisMonthPaid, budget, deleteBill, deletePlanLine, editBillAmount, editBillName, editingBillId, goal, handleAddBill, paidBills, planAmount, planCategory, remainingBills, saveEditBill, setAddSavingsAmount, setBillAmount, setBillName, setEditBillAmount, setEditBillName, setEditingBillId, setPlanAmount, setPlanCategory, setWeeklyIncome, startEditBill, thisMonth, toggleBillPaid, togglePlanDone, totalBills, updateGoal, updatePlanAmount, updatePlanCategory, weeklyPlanTotal }) {
  const leftOver = (Number(budget.weeklyIncome) || 0) - weeklyPlanTotal;
  const addLine = () => { addPlanLine(planCategory, planAmount); setPlanCategory(''); setPlanAmount(''); };

  return (
    <div className="md:grid md:grid-cols-2 md:gap-3 md:items-start">
      <div>
        {/* 1. Bills */}
        <Panel title="Bills this month">
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-2xl font-bold" style={{ color: remainingBills > 0 ? 'var(--text)' : 'var(--accent)' }}>{fmtMoney(remainingBills)}</span>
              <span className="text-sm" style={dimText}>left to pay of {fmtMoney(totalBills)}</span>
            </div>
            <ProgressBar value={paidBills} max={totalBills} />
          </div>

          <div className="space-y-1.5 mb-3">
            {budget.bills.map(b => {
              const paid = billsThisMonthPaid.includes(b.id);
              if (editingBillId === b.id) {
                return (
                  <div key={b.id} className="flex items-center gap-2 p-2" style={row}>
                    <input className={field + ' flex-1 min-w-0'} style={inputStyle} value={editBillName} autoFocus
                      onChange={e => setEditBillName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditBill(); if (e.key === 'Escape') setEditingBillId(null); }} aria-label="Bill name" />
                    <input type="number" inputMode="decimal" className={field + ' w-24'} style={inputStyle} value={editBillAmount}
                      onChange={e => setEditBillAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditBill(); if (e.key === 'Escape') setEditingBillId(null); }} aria-label="Amount" />
                    <BtnPrimary onClick={saveEditBill} style={{ padding: '10px 12px' }}>Save</BtnPrimary>
                  </div>
                );
              }
              return (
                <div key={b.id} className="flex items-center gap-3 px-3 py-2.5" style={row}>
                  <CheckCircle on={paid} onClick={() => toggleBillPaid(b.id, thisMonth)} label={`Paid: ${b.name}`} />
                  <button onClick={() => toggleBillPaid(b.id, thisMonth)} className="flex-1 text-left text-sm"
                    style={{ color: paid ? 'var(--dim)' : 'var(--text)', textDecoration: paid ? 'line-through' : 'none' }}>
                    {b.name}
                  </button>
                  <span className="text-sm font-medium">{fmtMoney(b.amount)}</span>
                  <button onClick={() => startEditBill(b)} style={dimText} aria-label={`Edit ${b.name}`}><Pencil size={14} /></button>
                  <button onClick={() => deleteBill(b.id)} style={dimText} aria-label={`Delete ${b.name}`}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input className={field + ' flex-1 min-w-0'} style={inputStyle} value={billName} onChange={e => setBillName(e.target.value)} placeholder="Bill name" />
            <input type="number" inputMode="decimal" className={field + ' w-24'} style={inputStyle} value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="$" />
            <BtnPrimary onClick={handleAddBill} style={{ padding: '0 14px' }}><Plus size={18} /></BtnPrimary>
          </div>
        </Panel>
      </div>

      <div>
        {/* 2. Savings goal */}
        <Panel title="Savings goal">
          <div className="flex gap-2 mb-3">
            <input className={field + ' flex-1 min-w-0'} style={inputStyle} value={goal.name} onChange={e => updateGoal('name', e.target.value)} aria-label="What you're saving for" placeholder="What for?" />
            <input type="number" inputMode="decimal" className={field + ' w-28'} style={inputStyle} value={goal.target}
              onChange={e => updateGoal('target', e.target.value === '' ? 0 : Number(e.target.value))} aria-label="Goal amount" placeholder="Goal $" />
          </div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-2xl font-bold">{fmtMoney(goal.saved)}</span>
            <span className="text-sm" style={dimText}>saved of {fmtMoney(goal.target)}</span>
          </div>
          <ProgressBar value={Number(goal.saved) || 0} max={Number(goal.target) || 0} />
          <div className="flex gap-2 mt-3">
            <input type="number" inputMode="decimal" className={field + ' flex-1 min-w-0'} style={inputStyle} value={addSavingsAmount}
              onChange={e => setAddSavingsAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addToSavings(addSavingsAmount); }}
              placeholder="Amount to add" />
            <BtnPrimary onClick={() => addToSavings(addSavingsAmount)}>Add</BtnPrimary>
          </div>
        </Panel>

        {/* 3. Weekly plan */}
        <Panel title="Weekly plan" hint="What comes in each week, and where it goes.">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm font-medium">Income</span>
            <input type="number" inputMode="decimal" className={field + ' w-28 text-right'} style={inputStyle} value={budget.weeklyIncome}
              onChange={e => setWeeklyIncome(e.target.value === '' ? 0 : Number(e.target.value))} aria-label="Weekly income" />
          </div>
          <div className="space-y-1.5 mb-3">
            {budget.weeklyPlan.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1.5" style={row}>
                <CheckCircle on={!!p.done} onClick={() => togglePlanDone(p.id)} label={`Done this week: ${p.category}`} />
                <input className="flex-1 min-w-0 bg-transparent text-sm px-1 py-1.5 focus:outline-none" value={p.category}
                  style={{ color: p.done ? 'var(--dim)' : 'var(--text)', textDecoration: p.done ? 'line-through' : 'none' }}
                  onChange={e => updatePlanCategory(p.id, e.target.value)} aria-label="Category" />
                <input type="number" inputMode="decimal" className="w-20 bg-transparent text-sm text-right px-1 py-1.5 focus:outline-none" value={p.amount}
                  onChange={e => updatePlanAmount(p.id, e.target.value === '' ? 0 : Number(e.target.value))} aria-label="Amount" />
                <button onClick={() => deletePlanLine(p.id)} style={dimText} aria-label={`Delete ${p.category}`}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <input className={field + ' flex-1 min-w-0'} style={inputStyle} value={planCategory} onChange={e => setPlanCategory(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLine(); }} placeholder="e.g. Groceries" />
            <input type="number" inputMode="decimal" className={field + ' w-24'} style={inputStyle} value={planAmount} onChange={e => setPlanAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLine(); }} placeholder="$" />
            <BtnPrimary onClick={addLine} style={{ padding: '0 14px' }}><Plus size={18} /></BtnPrimary>
          </div>
          <div className="flex justify-between text-sm pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span style={dimText}>Left over each week</span>
            <span className="font-semibold" style={{ color: leftOver < 0 ? 'var(--danger)' : 'var(--accent)' }}>{fmtMoney(leftOver)}</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
