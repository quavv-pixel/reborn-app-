// Challenges (75 Soft, Winter Arc, Monk Mode...). `compact` is the small
// version for Home; the full version on Routine lets you pick, track and end one.
import { useState } from 'react';
import { BtnPrimary, Panel, ProgressBar, dimText, glassCard } from './ui.jsx';
import { CHALLENGES } from '../lib/progress.js';

export default function ChallengeCard({ progress, startChallenge, endChallenge, compact, onOpen }) {
  const [picking, setPicking] = useState(false);

  if (compact) {
    if (!progress) {
      return (
        <button onClick={onOpen} className="w-full text-left mb-3 p-4" style={{ ...glassCard(16), borderStyle: 'dashed' }}>
          <div className="text-sm font-semibold">🔥 Start a challenge</div>
          <div className="text-xs mt-0.5" style={dimText}>Winter Arc, 75 Soft, Monk Mode… pick one and we set up the habits.</div>
        </button>
      );
    }
    return (
      <button onClick={onOpen} className="w-full text-left mb-3 p-4" style={glassCard(16)} data-testid="challenge-compact">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-semibold">{progress.emoji} {progress.name}</span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Day {progress.day} of {progress.days}</span>
        </div>
        <ProgressBar value={progress.day} max={progress.days} />
        <div className="text-xs mt-2" style={dimText}>Today {progress.doneToday}/{progress.totalToday} · {progress.perfect} full days so far</div>
      </button>
    );
  }

  if (progress) {
    return (
      <Panel title={`${progress.emoji} ${progress.name}`} right={<span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Day {progress.day} of {progress.days}</span>}>
        <ProgressBar value={progress.day} max={progress.days} />
        <p className="text-sm mt-3">
          {progress.finished
            ? `🎉 You finished ${progress.name}! ${progress.perfect} full days out of ${progress.days}.`
            : `Today: ${progress.doneToday} of ${progress.totalToday} done · ${progress.perfect} full days so far`}
        </p>
        <p className="text-xs mt-1" style={dimText}>Its habits are in your list below. Rest days count as kept.</p>
        <button className="text-xs mt-3" style={dimText} onClick={() => {
          if (!window.confirm(progress.finished ? 'Close this challenge?' : `End ${progress.name}? Your progress is kept in your habit history.`)) return;
          const removeHabits = window.confirm('Also remove the habits this challenge added? (Cancel keeps them.)');
          endChallenge(removeHabits);
        }}>{progress.finished ? 'Close challenge' : 'End challenge'}</button>
      </Panel>
    );
  }

  return (
    <Panel title="🔥 Challenges" hint="Pick a reset. We'll add its daily habits and count the days for you.">
      {!picking ? (
        <BtnPrimary onClick={() => setPicking(true)} style={{ width: '100%' }}>Start a challenge</BtnPrimary>
      ) : (
        <div className="space-y-2" data-testid="challenge-list">
          {CHALLENGES.map(c => (
            <div key={c.id} className="p-3" style={{ background: 'var(--field)', borderRadius: 12 }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{c.emoji} {c.name}</span>
                <span className="text-xs" style={dimText}>{c.days} days</span>
              </div>
              <p className="text-xs mt-0.5 mb-2" style={dimText}>{c.blurb}</p>
              <p className="text-xs mb-2">{c.habits.map(h => h[0]).join(' · ')}</p>
              <BtnPrimary onClick={() => { startChallenge(c.id); setPicking(false); }} style={{ padding: '6px 14px' }}>Start {c.name}</BtnPrimary>
            </div>
          ))}
          <button className="text-xs" style={dimText} onClick={() => setPicking(false)}>Not now</button>
        </div>
      )}
    </Panel>
  );
}
