// Crash reporting + the "something went wrong" safety screen.
//
// Two separate jobs:
//
// 1. ErrorBoundary: if any tab throws while rendering, React would normally
//    unmount the WHOLE app and leave a blank page. The boundary catches it
//    and shows a calm screen with a Reload button instead. Works with or
//    without Sentry.
//
// 2. Sentry (optional): when VITE_SENTRY_DSN is set at build time, errors
//    are sent to your Sentry dashboard so you find out about crashes on
//    customers' phones. The Sentry code is loaded with a dynamic import(),
//    so Vite puts it in its own file that's only downloaded when a DSN is
//    configured. Without a DSN, users download zero bytes of it.
//
// Privacy: Sentry receives the error message, stack trace, browser and page
// URL. It does NOT receive anything from storage (habits, budget, notes).
// sendDefaultPii stays false so IP addresses aren't stored either.
import React from 'react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
let sentry = null;
const pending = []; // errors that happened before Sentry finished loading

export function reportError(error, context) {
  if (!DSN) return;
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined);
  else if (pending.length < 20) pending.push([error, context]);
}

export function initMonitoring() {
  // Uncaught errors outside React's render (click handlers, timers, promises).
  window.addEventListener('error', e => reportError(e.error || new Error(e.message)));
  window.addEventListener('unhandledrejection', e =>
    reportError(e.reason instanceof Error ? e.reason : new Error(String(e.reason))));

  if (!DSN) return;
  import('./sentry-lazy.js')
    .then(S => {
      S.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        sendDefaultPii: false,
        tracesSampleRate: 0, // errors only, no performance tracing (keeps it free-tier friendly)
      });
      sentry = S;
      pending.splice(0).forEach(([e, c]) => reportError(e, c));
    })
    .catch(() => { /* ad blockers often block Sentry — never let that break the app */ });
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    reportError(error, { componentStack: info && info.componentStack });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center',
        background: '#0a0a0a', color: '#EAE6DF', fontFamily: "'Inter', ui-sans-serif, sans-serif",
      }}>
        <div style={{ maxWidth: 340 }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</div>
          <p style={{ fontSize: 14, color: '#8A857C', marginBottom: 20 }}>
            Your data is safe. It's saved on this device, and this error didn't touch it.
            Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 22px', borderRadius: 999, border: 'none', background: '#D9B36C', color: '#0a0a0a', fontSize: 14, fontWeight: 600 }}
          >
            Reload
          </button>
          <p style={{ fontSize: 11, color: '#5c5852', marginTop: 20, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-word' }}>
            {String(this.state.error && this.state.error.message || this.state.error)}
          </p>
        </div>
      </div>
    );
  }
}
