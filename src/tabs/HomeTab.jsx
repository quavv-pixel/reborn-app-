// The Home tab: a greeting, three numbers that matter today, and the quote.
// Every value it shows arrives as a prop from LifeTracker.jsx.
import { BtnPrimary, Panel, Stat, dimText } from '../components/ui.jsx';
import { fmtDate, fmtMoney, greeting } from '../lib/utils.js';

export default function HomeTab({ habitsToday, isAllEmpty, profile, quote, remainingBills, routine, setTab, today, workoutsThisWeek }) {
  return (
    <div>
      <div className="mb-4 mt-1">
        <p className="text-sm" style={dimText}>{greeting()} · {fmtDate(today)}</p>
        <h1 className="text-2xl font-bold mt-0.5">{profile}</h1>
      </div>

      {isAllEmpty ? (
        <Panel title="Start here" hint="Pick one small thing to track. You can add the rest later.">
          <div className="flex flex-wrap gap-2">
            <BtnPrimary onClick={() => setTab('routine')}>Add a habit</BtnPrimary>
            <BtnPrimary onClick={() => setTab('gym')} style={{ background: 'var(--field)', color: 'var(--text)' }}>Log a workout</BtnPrimary>
            <BtnPrimary onClick={() => setTab('budget')} style={{ background: 'var(--field)', color: 'var(--text)' }}>Add a bill</BtnPrimary>
          </div>
        </Panel>
      ) : null}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <button onClick={() => setTab('routine')} className="text-left">
          <Stat label="habits done today" value={`${habitsToday.length}/${routine.habits.length}`} />
        </button>
        <button onClick={() => setTab('gym')} className="text-left">
          <Stat label="workouts this week" value={workoutsThisWeek} />
        </button>
        <button onClick={() => setTab('budget')} className="text-left">
          <Stat label="bills left this month" value={fmtMoney(remainingBills)} />
        </button>
      </div>
      {/* Plain-text summary kept for screen readers and the UI tests. */}
      <p className="sr-only">{habitsToday.length}/{routine.habits.length} habits done today</p>

      <Panel title="Today's thought">
        <p className="text-base leading-relaxed">“{quote.text}”</p>
        <p className="text-sm mt-2" style={dimText}>{quote.author}</p>
      </Panel>
    </div>
  );
}
