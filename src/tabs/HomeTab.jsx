// The Home tab. Pure view: every value and handler it needs arrives as a prop from LifeTracker.jsx, which owns all state.
import { Meter, NavCard, Panel, dimText, glassCard } from '../components/ui.jsx';
import { HERO_WAVE_PATH, fmtDate, fmtMoney, greeting } from '../lib/utils.js';
import { Dumbbell, ListChecks, Share2, Wallet } from 'lucide-react';
import ChallengeCard from '../components/ChallengeCard.jsx';
import InstallPrompt from '../components/InstallPrompt.jsx';

export default function HomeTab({ challenge, week, shareProgress, goal, gym, habitsToday, heroWaveDuration, isAllEmpty, profile, quote, routine, setTab, today, todayIdx, workoutsThisWeek }) {
  return (
    <div>
      <InstallPrompt />
      <div className="mb-3 p-4 relative overflow-hidden" style={glassCard(16)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={dimText}>{greeting()}</span>
          <span className="text-xs" style={dimText}>{fmtDate(today)}</span>
        </div>
        <div className="text-2xl font-bold mb-1">{profile}</div>
        <p className="text-sm mb-3" style={dimText}>{isAllEmpty ? "Let's get started." : "You're building momentum."}</p>
        {/* The wave speeds up as today's progress goes up. One color only. */}
        <div className="w-full h-10 overflow-hidden" aria-hidden="true">
          <svg viewBox="0 0 600 40" preserveAspectRatio="none" className="hero-wave h-full"
            style={{ width: '200%', animation: `heroWaveScroll ${heroWaveDuration}s linear infinite` }}>
            <path d={HERO_WAVE_PATH} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Meter
          label={goal.name}
          value={Number(goal.saved) || 0}
          max={Number(goal.target) || 1}
          displayValue={fmtMoney(goal.saved)}
          displayMax={fmtMoney(goal.target)}
        />
        <Meter label="Habits" value={habitsToday.length} max={routine.habits.length || 1} displayMax={routine.habits.length} />
        <Meter label="Workouts" value={workoutsThisWeek} max={7} />
      </div>

      <ChallengeCard compact progress={challenge} onOpen={() => setTab('routine')} />

      <Panel title="Your week" right={
        <button onClick={shareProgress} className="flex items-center gap-1 text-xs px-2.5 py-1.5"
          style={{ border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 999 }}>
          <Share2 size={12} /> Share my progress
        </button>
      }>
        <div className="grid grid-cols-3 gap-2 text-center" data-testid="week-summary">
          <div><div className="text-lg font-bold">{week.habitPct}%</div><div className="text-[11px]" style={dimText}>habits done</div></div>
          <div><div className="text-lg font-bold">{week.workouts}</div><div className="text-[11px]" style={dimText}>workout days</div></div>
          <div><div className="text-lg font-bold">{fmtMoney(week.saved)}</div><div className="text-[11px]" style={dimText}>saved</div></div>
        </div>
        <p className="text-xs mt-3" style={dimText}>
          {week.bestDay
            ? `Best day: ${new Date(week.bestDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}. Keep it going!`
            : 'Tick a habit or log a workout and your week fills in here.'}
        </p>
      </Panel>

      <Panel title="Today's thought">
        <p className="text-sm italic leading-relaxed mb-1">“{quote.text}”</p>
        <p className="text-xs" style={dimText}>{quote.author}</p>
      </Panel>

      <div className="md:grid md:grid-cols-2 md:gap-3">
        <div>
          <div className="mb-2 text-xs font-medium" style={dimText}>Jump to</div>
          <div className="mb-3" style={{ ...glassCard(16), overflow: 'hidden' }}>
            <NavCard
              icon={Dumbbell}
              title="Gym"
              subtitle={`${workoutsThisWeek}/7 days trained this week · today: ${gym.split[todayIdx] ? gym.split[todayIdx].type : '—'}`}
              onClick={() => setTab('gym')}
            />
            <NavCard
              icon={ListChecks}
              title="Routine"
              subtitle={`${habitsToday.length}/${routine.habits.length} habits done today`}
              onClick={() => setTab('routine')}
              divider
            />
            <NavCard
              icon={Wallet}
              title="Budget"
              subtitle={`${fmtMoney(goal.saved)} saved toward ${goal.name}`}
              onClick={() => setTab('budget')}
              divider
            />
          </div>
        </div>
        <div>
          {isAllEmpty && (
            <Panel title="Get started">
              <p className="text-sm" style={dimText}>Nothing logged yet. Tap a card to add your first workout, habit, or savings goal.</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
