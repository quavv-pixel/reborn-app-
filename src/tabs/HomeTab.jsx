// The Home tab. Pure view: every value and handler it needs arrives as a prop from LifeTracker.jsx, which owns all state.
import { Meter, NavCard, Panel, dimText, glassCard } from '../components/ui.jsx';
import { MONO, RADIUS } from '../lib/constants.js';
import { HERO_WAVE_PATH, fmtDate, fmtMoney, greeting } from '../lib/utils.js';
import { Dumbbell, ListChecks, ShoppingCart, Wallet } from 'lucide-react';
import { BOOK } from '../book';

export default function HomeTab({ cooked, goal, gym, habitsToday, heroWaveColor, heroWaveDuration, isAllEmpty, picked, profile, quote, remainingBills, routine, setTab, today, todayIdx, workoutsThisWeek }) {
  return (
        <div>
            <div className="mb-3 p-4 relative overflow-hidden" style={{
              ...glassCard(RADIUS),
              background: 'radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), color-mix(in srgb, var(--panel) 88%, transparent)',
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>{greeting()}</span>
                <span className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>{fmtDate(today)}</span>
              </div>
              <div className="text-2xl font-medium mb-1">{profile}</div>
              <p className="text-sm mb-3" style={dimText}>{isAllEmpty ? "Let's get started." : "You're building momentum."}</p>
              <div className="w-full h-10 overflow-hidden">
                <svg
                  viewBox="0 0 600 40"
                  preserveAspectRatio="none"
                  className="hero-wave h-full"
                  style={{ width: '200%', animation: `heroWaveScroll ${heroWaveDuration}s linear infinite` }}
                >
                  <path
                    d={HERO_WAVE_PATH}
                    fill="none"
                    stroke={heroWaveColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.9"
                    style={{ filter: `drop-shadow(0 0 5px ${heroWaveColor})`, transition: 'stroke 1.5s ease' }}
                  />
                </svg>
              </div>
            </div>

            <Panel title="Daily transmission">
              <p className="text-sm italic leading-relaxed mb-1">"{quote.text}"</p>
              <p className="text-xs" style={dimText}>— {quote.author}</p>
            </Panel>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <Meter
                label={`${goal.name} fund`}
                value={Number(goal.saved) || 0}
                max={Number(goal.target) || 1}
                displayValue={fmtMoney(goal.saved)}
                displayMax={fmtMoney(goal.target)}
                accentVar="--accent2" barVar="--accent2"
              />
              <Meter
                label="Habits today"
                value={habitsToday.length}
                max={routine.habits.length || 1}
                displayMax={routine.habits.length}
                accentVar="--accent2" barVar="--accent2"
              />
              <Meter
                label="Workouts (7d)"
                value={workoutsThisWeek}
                max={7}
                accentVar="--accent" barVar="--accent"
              />
            </div>

            <div className="md:grid md:grid-cols-2 md:gap-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>Jump to</div>
                <div className="mb-3" style={{ ...glassCard(RADIUS), overflow: 'hidden' }}>
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
                    subtitle={`${fmtMoney(remainingBills)} in bills left this month`}
                    onClick={() => setTab('budget')}
                    divider
                  />
                  <NavCard
                    icon={ShoppingCart}
                    title="Weekly"
                    subtitle={`${picked.length} recipe${picked.length !== 1 ? 's' : ''} picked · ${cooked.length}/${BOOK.length} cooked`}
                    onClick={() => setTab('week')}
                  />
                </div>
              </div>
              <div>
                {isAllEmpty && (
                  <Panel title="Get started">
                    <p className="text-sm" style={dimText}>Nothing logged yet. Tap a card to add your first gym session, habit check, or expense.</p>
                  </Panel>
                )}
              </div>
            </div>
          </div>
  );
}
