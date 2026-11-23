// Shared building blocks: Panel, Meter, buttons, Header, BottomNav.
import { DISPLAY, MONO, RADIUS, RADIUS_SM, THEMES } from '../lib/constants.js';
import { Bell, BellOff, ChevronRight, Dumbbell, Home, ListChecks, ShoppingCart, StickyNote, Wallet } from 'lucide-react';
import { fmtDate, todayStr } from '../lib/utils.js';

export const inputStyle = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
export const dimText = { color: 'var(--dim)' };

// Dashboard-style "glass" card: the panel color shows through at reduced
// opacity over the page's ambient glow (see the root background) with a
// blur behind it, plus a soft glow in the accent color instead of a flat
// border. tint lets a card use --field instead of --panel for its base.
// Stippled dot-cloud texture (radial density fading at the edges), echoing
// the particle-visualization look from the reference dashboard screens.
// Deterministic (seeded PRNG) so it doesn't reshuffle on every re-render.
export function DotCloud({ width = 320, height = 150, cols = 24, rows = 11, color = 'var(--accent)' }) {
  const dots = [];
  const cx = cols / 2, cy = rows / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  let seed = 42;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + ((y - cy) * 1.7) ** 2) / maxDist;
      const density = Math.max(0, 1 - dist * 1.2) + rand() * 0.12;
      if (density < 0.2) continue;
      const px = (x / (cols - 1)) * width;
      const py = (y / (rows - 1)) * height;
      dots.push(
        <circle key={`${x}-${y}`} cx={px} cy={py} r={0.6 + density * 1.3} fill={color} opacity={Math.min(0.8, density)} />
      );
    }
  }
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {dots}
    </svg>
  );
}

export function glassCard(radius, tint = '--panel') {
  return {
    background: `color-mix(in srgb, var(${tint}) 88%, transparent)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--border)',
    borderRadius: radius,
    boxShadow: '0 4px 24px color-mix(in srgb, var(--accent) 10%, transparent)',
  };
}

export function Panel({ title, children, right }) {
  return (
    <div className="mb-3" style={{ ...glassCard(RADIUS), overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>{title}</span>
        {right}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// Circular progress ring, matching the stat-tile look across the dashboard
// references (Aura's training %, the blue dashboard's Productivity/System
// Status rings) instead of a flat linear bar.
export function Meter({ label, value, max, displayValue, displayMax, accentVar, barVar }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const size = 42, stroke = 4, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="p-2.5 flex items-center gap-2" style={glassCard(RADIUS_SM, '--field')}>
      <svg width={size} height={size} className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(${barVar})`} strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide mb-1 truncate" style={{ fontFamily: MONO, ...dimText }}>{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-medium" style={{ fontFamily: MONO, color: `var(${accentVar})` }}>{displayValue !== undefined ? displayValue : value}</span>
          <span className="text-[10px] truncate" style={{ fontFamily: MONO, ...dimText }}>/ {displayMax !== undefined ? displayMax : max}</span>
        </div>
      </div>
    </div>
  );
}

// A sequence of NavCards is meant to read as one iOS-style grouped list —
// each row stays flush against its neighbors (no radius, no outer border of
// its own; that lives on the wrapping container below) and gets a divider
// on top of every row but the first.
export function NavCard({ icon: Icon, title, subtitle, onClick, divider }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      style={{ borderRadius: 0, borderTop: divider ? '1px solid var(--border)' : 'none' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--accent)', borderRadius: 8 }}>
          <Icon size={14} />
        </div>
        <div className="min-w-0">
          <div className="text-sm" style={{ color: 'var(--text)' }}>{title}</div>
          <div className="text-xs truncate" style={dimText}>{subtitle}</div>
        </div>
      </div>
      <ChevronRight size={14} style={dimText} className="flex-shrink-0" />
    </button>
  );
}

export function BtnPrimary({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-medium px-3 py-2 transition-opacity hover:opacity-90"
      style={{ background: 'var(--accent)', color: 'var(--bg)', ...style }}
    >{children}</button>
  );
}

export function Header({ theme, setTheme, tab, setTab, profile, onSwitchProfile, notifsEnabled, onToggleNotifs, realPushArmed }) {
  const navItems = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'gym', label: 'Gym', Icon: Dumbbell },
    { id: 'routine', label: 'Routine', Icon: ListChecks },
    { id: 'budget', label: 'Budget', Icon: Wallet },
    { id: 'notes', label: 'Notes', Icon: StickyNote },
  ];
  return (
    <div className="sticky top-0 z-10 backdrop-blur px-4 pb-2" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))', background: 'color-mix(in srgb, var(--bg) 95%, transparent)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1.5 md:mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: 4, color: "var(--accent)" }}>REBORN</span>
          <button onClick={onSwitchProfile} className="text-[10px] px-2 py-0.5" style={{ fontFamily: MONO, border: '1px solid var(--border)', color: 'var(--dim)' }} title="Switch profile">
            {profile}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onToggleNotifs} title={notifsEnabled ? (realPushArmed ? 'Real push armed — fires even with the app closed. Tap to pause' : 'Reminders on (this tab only) — tap to pause') : 'Turn on schedule reminders'}
            className="p-1.5"
            style={{ border: `1px solid ${notifsEnabled ? 'var(--accent)' : 'var(--border)'}`, color: notifsEnabled ? 'var(--accent)' : 'var(--dim)' }}>
            {notifsEnabled ? <Bell size={13} /> : <BellOff size={13} />}
          </button>
          <div className="flex gap-1 overflow-x-auto" style={{ maxWidth: '46vw' }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => setTheme(key)} title={t.label}
                className="text-[10px] uppercase px-2 py-1 flex-shrink-0"
                style={{
                  fontFamily: MONO,
                  border: `1px solid ${theme === key ? 'var(--accent)' : 'var(--border)'}`,
                  background: theme === key ? 'var(--accent)' : 'transparent',
                  color: theme === key ? 'var(--bg)' : 'var(--dim)',
                }}>{t.label}</button>
            ))}
          </div>
          <span className="text-xs hidden sm:inline" style={{ fontFamily: MONO, ...dimText }}>{fmtDate(todayStr())}</span>
        </div>
      </div>
      <div className="hidden md:flex gap-1">
        {navItems.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm"
            style={{
              fontFamily: MONO,
              borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
              color: tab === id ? 'var(--accent)' : 'var(--dim)',
            }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'gym', label: 'Gym', Icon: Dumbbell },
    { id: 'routine', label: 'Routine', Icon: ListChecks },
    { id: 'budget', label: 'Budget', Icon: Wallet },
    { id: 'week', label: 'Weekly', Icon: ShoppingCart },
    { id: 'notes', label: 'Notes', Icon: StickyNote },
  ];
  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 max-w-md mx-auto p-1.5" style={glassCard(999)}>
      <div className="grid grid-cols-6">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-col items-center gap-0.5 py-2"
            style={{
              borderRadius: 999,
              background: tab === id ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'transparent',
              color: tab === id ? 'var(--accent)' : 'var(--dim)',
            }}
          >
            <Icon size={16} />
            <span className="text-[10px]" style={{ fontFamily: MONO }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
