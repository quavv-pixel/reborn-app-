// "Add REBORN to your Home Screen" guide. On iPhone, reminders (push) only
// work once the app is on the Home Screen, and iOS never offers it by itself,
// so we show the two steps. On Android/desktop Chrome we use the browser's own
// install button. Hidden once installed or dismissed.
import { useEffect, useState } from 'react';
import { dimText, glassCard } from './ui.jsx';

const DISMISS_KEY = 'reborn:install-dismissed';

function isInstalled() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch { return false; }
}
function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

let deferredPrompt = null; // Chrome's install event, caught as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
}

export default function InstallPrompt() {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } });
  const [canPrompt, setCanPrompt] = useState(!!deferredPrompt);
  useEffect(() => {
    const on = e => { e.preventDefault(); deferredPrompt = e; setCanPrompt(true); };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  if (dismissed || isInstalled() || (!isIOS() && !canPrompt)) return null;
  const dismiss = () => { try { localStorage.setItem(DISMISS_KEY, '1'); } catch {} setDismissed(true); };

  return (
    <div className="mb-3 p-4" style={{ ...glassCard(16), borderColor: 'var(--accent)' }} data-testid="install-prompt">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold">📲 Put REBORN on your Home Screen</div>
        <button onClick={dismiss} aria-label="Dismiss" style={dimText}>✕</button>
      </div>
      {isIOS() ? (
        <p className="text-xs mt-1" style={dimText}>
          It opens full-screen and can send your reminders. In Safari tap <b style={{ color: 'var(--text)' }}>Share</b> (the square with an arrow),
          then <b style={{ color: 'var(--text)' }}>Add to Home Screen</b>.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs" style={dimText}>Opens like a normal app and can send your reminders.</p>
          <button className="text-sm font-semibold px-3 py-1.5 flex-shrink-0" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            onClick={async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(() => {}); deferredPrompt = null; setCanPrompt(false); }}>
            Install
          </button>
        </div>
      )}
    </div>
  );
}
