// The Weekly tab. Pure view: every value and handler it needs arrives as a prop from LifeTracker.jsx, which owns all state.
import { MONO, WEEK_DISPLAY } from '../lib/constants.js';
import { buildList, hasWrapped, pickOptions, weekIndex, weekLabel } from '../rotation';
import { BookOpen, Check, Copy, ExternalLink, Loader2, RefreshCw, Share2, ShoppingCart } from 'lucide-react';
import { dimText } from '../components/ui.jsx';
import { BOOK } from '../book';

export default function WeeklyTab({ cartBusy, cartMsg, cartUrl, cooked, copied, copyForClaude, deals, dealsMsg, dealsState, dealsStore, loadDeals, markCooked, openInClaude, openInInstacart, openedClaude, picked, resetCooked, shareList, toggleRecipe, updateDealsStore, weeklyReady }) {
  return (
        <div className="mx-auto" style={{ maxWidth: 560 }}>
            {/* Masthead */}
            <div className="flex items-end justify-between pb-3" style={{ borderBottom: '4px solid var(--text)' }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', color: 'var(--dim)' }}>
                  WEEK OF {weekLabel().toUpperCase()}
                </div>
                <h1 style={{ fontFamily: WEEK_DISPLAY, fontSize: 28, lineHeight: 1.05, marginTop: 4, color: 'var(--text)' }}>
                  THREE DINNERS,<br />ONE SHOP
                </h1>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', background: 'var(--text)', color: 'var(--bg)', padding: '5px 8px', flexShrink: 0 }}>
                ALDI
              </div>
            </div>

            {/* Deals */}
            <section className="mt-7">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 style={{ fontFamily: WEEK_DISPLAY, fontSize: 15, letterSpacing: '.02em', color: 'var(--text)' }}>ON SALE NOW</h2>
                <div className="flex items-center gap-2">
                  <input
                    value={dealsStore}
                    onChange={e => updateDealsStore(e.target.value)}
                    placeholder="Your area"
                    aria-label="Store area"
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      background: 'transparent',
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text)',
                      width: 96,
                      padding: '2px 0',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={loadDeals}
                    disabled={dealsState === 'loading' || !dealsStore.trim()}
                    className="flex items-center gap-1 px-2 py-1"
                    style={{
                      fontFamily: MONO, fontSize: 11, background: 'var(--text)', color: 'var(--bg)', border: 'none',
                      cursor: dealsState === 'loading' ? 'wait' : 'pointer',
                      opacity: !dealsStore.trim() ? 0.5 : 1,
                    }}
                  >
                    {dealsState === 'loading' ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    CHECK
                  </button>
                </div>
              </div>

              {dealsState === 'idle' && (
                <p className="mt-3 text-sm" style={dimText}>Tap check to search this week's grocery ads for your area, across whatever stores serve it. Each check costs a little API usage.</p>
              )}
              {dealsState === 'loading' && (
                <p className="mt-3 text-sm" style={dimText}>Searching the ads — this takes a few seconds.</p>
              )}
              {dealsState === 'error' && (
                <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{dealsMsg || 'Couldn\'t reach the ad. Try again in a moment.'}</p>
              )}
              {dealsState === 'empty' && (
                <p className="mt-3 text-sm" style={dimText}>No specials found for that area this week.</p>
              )}
              {deals.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {deals.map((d, i) => (
                    <div key={i} className="p-3" style={{ background: 'var(--panel)', borderLeft: '4px solid var(--accent)' }}>
                      <div style={{ fontFamily: MONO, fontSize: 17, color: 'var(--danger)' }}>{d.price}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25, marginTop: 2, color: 'var(--text)' }}>{d.item}</div>
                      {(d.store || d.note) && (
                        <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>
                          {[d.store, d.note].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recipe picks */}
            <section className="mt-8">
              <h2 style={{ fontFamily: WEEK_DISPLAY, fontSize: 15, color: 'var(--text)' }}>PICK YOUR THREE</h2>
              <p style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 3 }}>
                From your copy of Trust The Skinny Chef. Cook the page, not the card.
              </p>

              {hasWrapped(BOOK, cooked) && (
                <p style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 6 }}>
                  You've cooked your way through the book — the rotation has started over.{' '}
                  <button onClick={resetCooked} style={{ textDecoration: 'underline', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
                    Clear the record
                  </button>.
                </p>
              )}

              <div className="mt-4 space-y-2">
                {weeklyReady && pickOptions(BOOK, weekIndex(), cooked).map(r => {
                  const on = picked.includes(r.p);
                  return (
                    <button
                      key={r.p}
                      onClick={() => toggleRecipe(r.p)}
                      className="w-full text-left p-4 flex items-start gap-3"
                      style={{
                        background: on ? 'var(--text)' : 'var(--panel)',
                        color: on ? 'var(--bg)' : 'var(--text)',
                        border: `1px solid ${on ? 'var(--text)' : 'var(--border)'}`,
                        transition: 'background 140ms ease',
                      }}
                    >
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 20, height: 20, marginTop: 2,
                          background: on ? 'var(--accent)' : 'transparent',
                          border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                      >
                        {on && <Check size={13} color="#fff" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{r.t}</div>
                        <div style={{ fontFamily: MONO, fontSize: 11, marginTop: 4, color: on ? 'var(--bg)' : 'var(--dim)', opacity: on ? 0.7 : 1, letterSpacing: '.05em' }}>
                          PAGE {r.p} · {r.tag.toUpperCase()} · {r.items.length} ITEMS
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Shopping list */}
            <section className="mt-8">
              <h2 style={{ fontFamily: WEEK_DISPLAY, fontSize: 15, color: 'var(--text)' }}>SHOPPING LIST</h2>
              {buildList(BOOK, picked).length === 0 ? (
                <p className="text-sm mt-2" style={dimText}>Pick a recipe above and the list builds itself.</p>
              ) : (
                <div className="mt-3" style={{ background: 'var(--panel)', padding: '6px 14px' }}>
                  {buildList(BOOK, picked).map(([item, n]) => (
                    <div key={item} className="flex items-baseline justify-between py-2" style={{ borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--text)' }}>
                      <span className="capitalize">{item}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: n > 1 ? 'var(--accent)' : 'var(--dim)' }}>
                        {n > 1 ? `×${n} recipes` : '1'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {buildList(BOOK, picked).length > 0 && (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={openInInstacart}
                      disabled={cartBusy}
                      className="flex items-center gap-2 px-4 py-3"
                      style={{ background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 600, border: 'none', cursor: cartBusy ? 'wait' : 'pointer' }}
                    >
                      {cartBusy ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
                      {cartBusy ? 'Opening…' : 'Open in Instacart'}
                    </button>
                    <button
                      onClick={openInClaude}
                      className="flex items-center gap-2 px-4 py-3"
                      style={{ background: 'transparent', border: '1px solid var(--text)', color: 'var(--text)', fontSize: 13.5, cursor: 'pointer' }}
                    >
                      {openedClaude ? <Check size={15} /> : <ExternalLink size={15} />}
                      {openedClaude ? 'Opened — hit send' : 'Open in Claude'}
                    </button>
                    <button
                      onClick={copyForClaude}
                      className="flex items-center gap-2 px-4 py-3"
                      style={{ background: 'transparent', border: '1px solid var(--text)', color: 'var(--text)', fontSize: 13.5, cursor: 'pointer' }}
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? 'Copied — paste it to Claude' : 'Copy for Claude'}
                    </button>
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button
                        onClick={shareList}
                        className="flex items-center gap-2 px-4 py-3"
                        style={{ background: 'transparent', border: '1px solid var(--text)', color: 'var(--text)', fontSize: 13.5, cursor: 'pointer' }}
                      >
                        <Share2 size={15} />
                        Share list
                      </button>
                    )}
                    <button
                      onClick={markCooked}
                      className="flex items-center gap-2 px-4 py-3"
                      style={{ background: 'transparent', border: '1px solid var(--text)', color: 'var(--text)', fontSize: 13.5, cursor: 'pointer' }}
                    >
                      <BookOpen size={15} />
                      Mark cooked
                    </button>
                  </div>

                  {cartMsg && <p className="mt-3" style={{ fontSize: 12.5, color: 'var(--danger)' }}>{cartMsg}</p>}
                  {cartUrl && (
                    <p className="mt-3" style={{ fontSize: 12.5, color: 'var(--text)' }}>
                      Your browser blocked the new tab —{' '}
                      <a href={cartUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                        tap here to open your Instacart list
                      </a>.
                    </p>
                  )}
                  <p className="mt-3" style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.4 }}>
                    Instacart opens a shopping list page with these items — it can't see what's already in your cart.{' '}
                    Open in Claude starts a fresh chat with the list already typed in — just hit send.
                  </p>
                </>
              )}
            </section>

            <footer className="mt-9 pt-4 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)', fontFamily: MONO, fontSize: 10.5, color: 'var(--dim)', letterSpacing: '.06em' }}>
              <ShoppingCart size={12} />
              {weeklyReady ? `${cooked.length} OF ${BOOK.length} RECIPES COOKED` : 'LOADING ROTATION'}
            </footer>
          </div>
  );
}
