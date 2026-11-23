// The Weekly tab: pick this week's dinners from the book, get one shopping
// list, send it on. Every value and handler arrives as a prop from
// LifeTracker.jsx. (The paid grocery-ad search and the Instacart button,
// which needed API keys, were removed from the screen to keep this simple.)
import { BtnPrimary, BtnSecondary, CheckCircle, Panel, dimText } from '../components/ui.jsx';
import { buildList, hasWrapped, pickOptions, weekIndex, weekLabel } from '../rotation';
import { BookOpen, Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { BOOK } from '../book';

export default function WeeklyTab({ cooked, copied, copyForClaude, markCooked, openInClaude, openedClaude, picked, resetCooked, shareList, toggleRecipe, weeklyReady }) {
  const list = buildList(BOOK, picked);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  return (
    <div className="mx-auto" style={{ maxWidth: 560 }}>
      <div className="mb-4 mt-1">
        <p className="text-sm" style={dimText}>Week of {weekLabel()}</p>
        <h1 className="text-2xl font-bold mt-0.5">This week's dinners</h1>
      </div>

      <Panel title="Pick up to three" hint={`From Trust The Skinny Chef · ${cooked.length} of ${BOOK.length} cooked so far`}>
        {hasWrapped(BOOK, cooked) && (
          <p className="text-sm mb-3" style={{ color: 'var(--accent)' }}>
            You've cooked the whole book, so it's starting over.{' '}
            <button onClick={resetCooked} className="underline">Clear the record</button>
          </p>
        )}
        <div className="space-y-2">
          {weeklyReady && pickOptions(BOOK, weekIndex(), cooked).map(r => {
            const on = picked.includes(r.p);
            return (
              <button key={r.p} onClick={() => toggleRecipe(r.p)}
                className="w-full text-left p-3 flex items-center gap-3"
                style={{ background: on ? 'var(--accent-soft)' : 'var(--field)', border: `1.5px solid ${on ? 'var(--accent)' : 'transparent'}`, borderRadius: 12 }}>
                <CheckCircle on={on} decorative />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.t}</div>
                  <div className="text-xs mt-0.5" style={dimText}>Page {r.p} · {r.tag} · {r.items.length} items</div>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Shopping list">
        {list.length === 0 ? (
          <p className="text-sm" style={dimText}>Pick a recipe and your list appears here.</p>
        ) : (
          <>
            <div className="mb-4">
              {list.map(([item, n]) => (
                <div key={item} className="flex items-baseline justify-between py-2 text-sm" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="capitalize">{item}</span>
                  {n > 1 && <span className="text-xs" style={{ color: 'var(--accent)' }}>for {n} recipes</span>}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <BtnPrimary onClick={openInClaude} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {openedClaude ? <Check size={16} /> : <ExternalLink size={16} />}
                {openedClaude ? 'Opened, now hit send' : 'Order with Claude'}
              </BtnPrimary>
              {canShare ? (
                <BtnSecondary onClick={shareList}><Share2 size={16} />Share list</BtnSecondary>
              ) : (
                <BtnSecondary onClick={copyForClaude}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy list'}</BtnSecondary>
              )}
              <BtnSecondary onClick={markCooked}><BookOpen size={16} />Mark cooked</BtnSecondary>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
