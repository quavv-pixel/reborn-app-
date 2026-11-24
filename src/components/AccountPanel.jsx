// "Back up & sync" box on the Who's-this screen. Renders nothing unless
// cloud sync is configured (see src/sync/cloud.js).
import { useEffect, useState } from 'react';
import * as cloud from '../sync/cloud.js';
import { BtnPrimary, dimText, glassCard } from './ui.jsx';

export function useCloudState() {
  const [s, setS] = useState(cloud.getState());
  useEffect(() => cloud.subscribe(setS), []);
  return s;
}

const field = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
const danger = { color: 'var(--danger, #f87171)' };

function ago(ms) {
  if (!ms) return '';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

const STATUS_TEXT = {
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline — will sync when you’re back online',
  error: 'Sync problem — will retry',
  'needs-payment': 'Cloud sync is part of REBORN Pro',
};

export default function AccountPanel() {
  const s = useCloudState();
  const [mode, setMode] = useState('signin'); // signin | signup | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  // After "Create account", Supabase emails a confirm link. People often tap
  // it on their PHONE, which signs the phone in but leaves this device waiting.
  // So while waiting, quietly retry signing in here — every 15s, and right away
  // whenever you come back to this tab — until the account is confirmed.
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!waiting || s.user) return undefined;
    let stopped = false;
    let inFlight = false;
    const started = Date.now();
    const tryNow = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        await cloud.signIn(email.trim(), password);
        if (!stopped) setWaiting(false);
      } catch (e) {
        // "Email not confirmed" just means: keep waiting. Anything else is a real problem.
        if (!/not confirmed/i.test((e && e.message) || '') && !stopped) { setErr(e.message || String(e)); setWaiting(false); }
      } finally { inFlight = false; }
    };
    const iv = setInterval(() => {
      if (Date.now() - started > 15 * 60000) { setWaiting(false); setMsg('Still not confirmed. Tap the link in the email, then sign in here.'); return; }
      tryNow();
    }, 15000);
    const onBack = () => { if (document.visibilityState !== 'hidden') tryNow(); };
    window.addEventListener('focus', onBack);
    document.addEventListener('visibilitychange', onBack);
    return () => { stopped = true; clearInterval(iv); window.removeEventListener('focus', onBack); document.removeEventListener('visibilitychange', onBack); };
  }, [waiting, s.user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s.configured) return null;

  async function run(fn) {
    setBusy(true); setErr(''); setMsg('');
    try { await fn(); } catch (e) { setErr(e.message || String(e)); }
    setBusy(false);
  }

  if (s.user) {
    const upgrade = cloud.upgradeUrl();
    const manage = cloud.manageUrl();
    return (
      <div className="mt-6 p-4" style={glassCard(18, '--panel')} data-testid="account-panel">
        <div className="text-sm font-semibold mb-2">Account</div>
        <div className="text-sm mb-1 break-all">{s.user.email}</div>
        <div className="text-xs mb-3" style={s.status === 'error' || s.status === 'needs-payment' ? danger : dimText}>
          {STATUS_TEXT[s.status] || ''}{s.status === 'synced' && s.lastSyncedAt ? ` · ${ago(s.lastSyncedAt)}` : ''}
          {s.paid && <span style={{ color: 'var(--accent)' }}> · Pro ✓</span>}
        </div>
        {s.status === 'needs-payment' && upgrade && (
          <a href={upgrade} className="block text-center text-sm font-medium px-3 py-2 mb-3 rounded-full"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Upgrade to Pro</a>
        )}
        <div className="flex flex-wrap gap-3 text-xs">
          <button onClick={() => run(cloud.syncNow)} disabled={busy} style={{ color: 'var(--accent)' }}>Sync now</button>
          {s.paid && manage && <a href={manage} style={dimText}>Manage subscription</a>}
          <button onClick={() => run(() => cloud.signOut({ keepData: true }))} disabled={busy} style={dimText}>Sign out</button>
          <button onClick={() => {
            if (window.confirm('Sign out AND remove all REBORN data from this device? It stays safe in your account.')) {
              run(() => cloud.signOut({ keepData: false }));
            }
          }} disabled={busy} style={danger}>Sign out & clear this device</button>
        </div>
        <button className="text-xs mt-3" style={danger} disabled={busy} onClick={() => {
          const typed = window.prompt(
            'This permanently deletes your account and everything backed up to it, and clears this device. '
            + (s.paid ? 'Cancel your subscription first under "Manage subscription". ' : '')
            + 'It cannot be undone.\n\nType DELETE to confirm.');
          if (typed && typed.trim().toUpperCase() === 'DELETE') run(cloud.deleteAccount);
        }}>Delete my account</button>
        {err && <p className="text-xs mt-2" style={danger}>{err}</p>}
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="mt-6 p-4" style={glassCard(18, '--panel')} data-testid="account-panel">
        <div className="text-sm font-semibold mb-1">Check your email</div>
        <p className="text-xs mb-3" style={dimText}>
          We sent a confirmation link to <b style={{ color: 'var(--text)' }}>{email.trim()}</b>. Tap it on any device (your phone is fine).
          This screen signs you in by itself once you've confirmed.
        </p>
        <BtnPrimary style={{ width: '100%', opacity: busy ? 0.6 : 1 }} onClick={() => run(async () => {
          try { await cloud.signIn(email.trim(), password); setWaiting(false); }
          catch (e) {
            if (/not confirmed/i.test(e.message || '')) throw new Error("Not confirmed yet. Tap the link in the email first, then try again.");
            throw e;
          }
        })}>{busy ? 'Checking…' : "I've confirmed, sign me in"}</BtnPrimary>
        {err && <p className="text-xs mt-2" style={danger}>{err}</p>}
        <button type="button" className="text-xs mt-3" style={dimText}
          onClick={() => { setWaiting(false); setMode('signup'); setErr(''); setMsg(''); }}>Use a different email</button>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4" style={glassCard(18, '--panel')} data-testid="account-panel">
      <div className="text-sm font-medium mb-1">
        {mode === 'signup' ? 'Create an account' : mode === 'reset' ? 'Reset your password' : 'Back up & sync'}
      </div>
      <p className="text-xs mb-3" style={dimText}>
        {mode === 'reset'
          ? 'We’ll email you a link to choose a new password.'
          : 'Sign in to keep your profiles safe in the cloud and use them on any device.'}
      </p>
      <form onSubmit={e => {
        e.preventDefault();
        if (mode === 'signin') run(() => cloud.signIn(email.trim(), password));
        if (mode === 'signup') run(async () => {
          const r = await cloud.signUp(email.trim(), password);
          if (r.needsConfirmation) setWaiting(true);
        });
        if (mode === 'reset') run(async () => {
          await cloud.sendPasswordReset(email.trim());
          setMsg('If that email has an account, a reset link is on its way.');
        });
      }}>
        <input type="email" required autoComplete="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} className="w-full text-sm px-3 py-2 mb-2 focus:outline-none" style={field} />
        {mode !== 'reset' && (
          <input type="password" required minLength={8} placeholder="Account password (8+ characters)"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password}
            onChange={e => setPassword(e.target.value)} className="w-full text-sm px-3 py-2 mb-2 focus:outline-none" style={field} />
        )}
        <BtnPrimary style={{ width: '100%', opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
        </BtnPrimary>
      </form>
      {err && <p className="text-xs mt-2" style={danger}>{err}</p>}
      {msg && <p className="text-xs mt-2" style={{ color: 'var(--accent)' }}>{msg}</p>}
      <div className="flex justify-between mt-3 text-xs" style={dimText}>
        {mode === 'signin'
          ? <button type="button" onClick={() => { setMode('signup'); setErr(''); setMsg(''); }}>New here? Create an account</button>
          : <button type="button" onClick={() => { setMode('signin'); setErr(''); setMsg(''); }}>Back to sign in</button>}
        {mode === 'signin' && <button type="button" onClick={() => { setMode('reset'); setErr(''); setMsg(''); }}>Forgot password?</button>}
      </div>
    </div>
  );
}

// Banners that can appear on any screen: "updated on another device" and the
// set-a-new-password form after following a reset email link.
export function CloudOverlay() {
  const s = useCloudState();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  if (!s.configured) return null;
  const box = {
    position: 'fixed', left: 12, right: 12, zIndex: 60, margin: '0 auto', maxWidth: 420, padding: 14,
    borderRadius: 16, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)',
    fontSize: 14, boxShadow: '0 10px 30px rgba(0,0,0,.18)',
  };
  return (
    <>
      {s.remoteChanged && (
        <div style={{ ...box, top: 'calc(env(safe-area-inset-top, 0px) + 12px)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}>Updated from your other device.</span>
          <button onClick={() => window.location.reload()}
            style={{ background: 'var(--accent)', color: 'var(--on-accent)', border: 0, borderRadius: 999, padding: '6px 14px', fontWeight: 600 }}>Refresh</button>
        </div>
      )}
      {s.recovery && (
        <div style={{ ...box, top: '30%' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Choose a new account password</div>
          <form onSubmit={async e => {
            e.preventDefault();
            try { await cloud.setNewPassword(pw); } catch (x) { setErr(x.message); }
          }}>
            <input type="password" minLength={8} required value={pw} onChange={e => setPw(e.target.value)}
              placeholder="New password (8+ characters)" autoComplete="new-password"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--field)', color: 'inherit', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ background: 'var(--accent)', color: 'var(--on-accent)', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>Save</button>
              <button type="button" onClick={cloud.dismissRecovery} style={{ background: 'none', border: 0, color: 'var(--dim)' }}>Cancel</button>
            </div>
            {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{err}</div>}
          </form>
        </div>
      )}
    </>
  );
}
