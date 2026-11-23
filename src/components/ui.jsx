// Shared building blocks: Panel, Stat, ProgressBar, buttons, Header, BottomNav.
// All colors come from the CSS variables in src/index.css (one palette,
// light or dark following the phone's setting).
import { Bell, BellOff, ChevronRight, Dumbbell, Home, ListChecks, StickyNote, Wallet } from 'lucide-react';

export const inputStyle = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
export const dimText = { color: 'var(--dim)' };

// A plain card: solid color, thin border, rounded corners. (The old version
// used see-through "glass" with a blur, which older phones can't draw.)
export function glassCard(radius = 14) {
  return {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: radius,
  };
}

export function Panel({ title, children, right, hint }) {
  return (
    <section className="mb-3 p-4" style={glassCard(16)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
          {right}
        </div>
      )}
      {hint && <p className="text-sm -mt-2 mb-3" style={dimText}>{hint}</p>}
      {children}
    </section>
  );
}

// One number with a label underneath. Used on Home and in Budget.
export function Stat({ label, value, tone }) {
  return (
    <div className="p-3" style={glassCard(14)}>
      <div className="text-xl font-semibold" style={{ color: tone === 'danger' ? 'var(--danger)' : 'var(--text)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={dimText}>{label}</div>
    </div>
  );
}

// Small ring + number tile (Home). Always the single accent color.
export function Meter({ label, value, max, displayValue, displayMax }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const size = 26, stroke = 3.5, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  // Stacked (label + ring, then the number, then "of …") so three tiles fit
  // side by side on any phone without cutting the numbers off.
  return (
    <div className="p-3 min-w-0" style={glassCard(14)}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[11px] truncate" style={dimText}>{label}</span>
        <svg width={size} height={size} className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--field)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke}
            strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-lg font-semibold leading-tight truncate">{displayValue !== undefined ? displayValue : value}</div>
      <div className="text-[11px] truncate" style={dimText}>of {displayMax !== undefined ? displayMax : max}</div>
    </div>
  );
}

// One row of the grouped "Jump to" list on Home.
export function NavCard({ icon: Icon, title, subtitle, onClick, divider }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-3 text-left"
      style={{ borderRadius: 0, borderTop: divider ? '1px solid var(--border)' : 'none' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 10 }}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs truncate" style={dimText}>{subtitle}</div>
        </div>
      </div>
      <ChevronRight size={16} style={dimText} className="flex-shrink-0" />
    </button>
  );
}

export function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div style={{ height: 8, background: 'var(--field)', borderRadius: 999, overflow: 'hidden' }}
      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width 300ms ease' }} />
    </div>
  );
}

// Round tick box used for habits, bills and plan lines. `decorative` draws
// just the circle (for use inside a bigger button — a button can't contain
// another button).
export function CheckCircle({ on, onClick, label, decorative }) {
  const style = {
    width: 24, height: 24, borderRadius: 999,
    background: on ? 'var(--accent)' : 'transparent',
    border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    color: 'var(--on-accent)', fontSize: 13, lineHeight: 1,
  };
  if (decorative) {
    return <span aria-hidden="true" className="flex items-center justify-center flex-shrink-0" style={style}>{on ? '✓' : ''}</span>;
  }
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={on}
      className="flex items-center justify-center flex-shrink-0" style={style}>
      {on ? '✓' : ''}
    </button>
  );
}

export function BtnPrimary({ children, onClick, style, type }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="text-sm font-semibold px-4 py-2.5 transition-opacity active:opacity-80"
      style={{ background: 'var(--accent)', color: 'var(--on-accent)', ...style }}
    >{children}</button>
  );
}

export function BtnSecondary({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-medium px-4 py-2.5 flex items-center gap-2 active:opacity-80"
      style={{ background: 'var(--field)', color: 'var(--text)', border: '1px solid var(--border)', ...style }}
    >{children}</button>
  );
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'gym', label: 'Gym', Icon: Dumbbell },
  { id: 'routine', label: 'Routine', Icon: ListChecks },
  { id: 'budget', label: 'Budget', Icon: Wallet },
  { id: 'notes', label: 'Notes', Icon: StickyNote },
];

export function Header({ tab, setTab, profile, onSwitchProfile, notifsEnabled, onToggleNotifs, realPushArmed }) {
  return (
    <header className="sticky top-0 z-10 px-4 pb-2" style={{ paddingTop: 'calc(0.6rem + env(safe-area-inset-top, 0px))', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto flex items-center justify-between">
        <span className="text-lg font-bold" style={{ letterSpacing: 3, color: 'var(--accent)' }}>REBORN</span>
        <div className="flex items-center gap-2">
          <button onClick={onToggleNotifs} aria-label="Reminders"
            title={notifsEnabled ? (realPushArmed ? 'Reminders on, even with the app closed. Tap to pause' : 'Reminders on while the app is open. Tap to pause') : 'Turn on reminders'}
            className="p-2"
            style={{ background: notifsEnabled ? 'var(--accent-soft)' : 'transparent', color: notifsEnabled ? 'var(--accent)' : 'var(--dim)' }}>
            {notifsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button onClick={onSwitchProfile} title="Switch profile"
            className="text-sm px-3 py-1.5 font-medium"
            style={{ background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 999 }}>
            {profile}
          </button>
        </div>
      </div>
      <nav className="hidden md:flex gap-1 max-w-2xl lg:max-w-4xl mx-auto mt-2">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium"
            style={{
              background: tab === id ? 'var(--accent-soft)' : 'transparent',
              color: tab === id ? 'var(--accent)' : 'var(--dim)',
            }}>
            <Icon size={15} />{label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export function BottomNav({ tab, setTab }) {
  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 z-10"
      style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-col items-center gap-1 pt-2 pb-1.5"
            style={{ borderRadius: 0, color: tab === id ? 'var(--accent)' : 'var(--dim)' }}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
