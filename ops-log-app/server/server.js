/* REBORN backend — serves the built app and fires Web Push reminders from
   the daily schedule. Push rides Apple's/Google's push relay, so reminders
   still reach the phone when the browser tab (or the phone's network) is
   off — the thing the in-app foreground Notification API cannot do, since
   that only fires while the page is alive in memory.

   One instance == one person's schedule, same single-user assumption as the
   rest of this app: there's no multi-profile fan-out here, just whichever
   schedule was last synced by POST /api/schedule. */
import express from 'express';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import config from './config.js';
import { requireToken, assertSafePushEndpoint } from './security.js';

const { PORT, HOST, DATA, DIST } = config;
const MAX_SUBS = 20; // one person, a handful of devices — anything past this is abuse

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); }
  catch { return fallback; }
};
// atomic: write a sibling .tmp then rename, so a crash mid-write can't shred the file
const writeJson = (file, obj) => {
  const dest = path.join(DATA, file);
  try {
    fs.writeFileSync(dest + '.tmp', JSON.stringify(obj, null, 2));
    fs.renameSync(dest + '.tmp', dest);
  } catch (e) {
    console.error('write failed', file, e.message);
  }
};

// ---------- state ----------
let schedule = readJson('schedule.json', []); // [{ id, time: 'HH:MM', label }]
let state = readJson('state.json', null) || { date: null, fired: {} };
let subs = readJson('subs.json', []);

// ---------- VAPID keys (generated once, persisted) ----------
let vapid = readJson('vapid.json', null);
if (!vapid) {
  if (subs.length) {
    // Existing subscriptions were signed with a key we no longer have —
    // undeliverable. Regenerate (single-user app) and drop them so
    // /api/test-push reports an honest zero instead of pretending it sent.
    console.error(
      `VAPID keys missing or unreadable, but data/subs.json holds ${subs.length} subscription(s). ` +
      'Those were created against a lost key and can never be delivered. ' +
      'Regenerating vapid.json and clearing subs.json — re-arm reminders from the app.'
    );
    subs = [];
    writeJson('subs.json', subs);
  }
  vapid = webpush.generateVAPIDKeys();
  writeJson('vapid.json', vapid);
}
// Apple's push service 403s on an invalid VAPID subject — push stays off
// until REBORN_CONTACT is set rather than failing per-notification later.
const PUSH_ENABLED = Boolean(config.CONTACT);
if (PUSH_ENABLED) {
  webpush.setVapidDetails(config.CONTACT, vapid.publicKey, vapid.privateKey);
} else {
  console.warn(
    'REBORN_CONTACT is not set, so Web Push is disabled. Set it to a real ' +
    'mailto: or https: URL you control (see .env.example) to arm reminders.'
  );
}

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hhmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function rolloverIfNeeded() {
  const today = todayStr();
  if (state.date === today) return;
  state.date = today;
  state.fired = {};
  writeJson('state.json', state);
}

// ---------- push ----------
async function push(title, body, tag) {
  if (!PUSH_ENABLED) return;
  const payload = JSON.stringify({ title, body, tag });
  const dead = [];
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification(s, payload); }
    catch (e) {
      // prune by endpoint — index-based pruning breaks once subs shifts
      if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.endpoint);
      else console.error('push failed', e.statusCode);
    }
  }));
  if (dead.length) {
    subs = subs.filter(s => !dead.includes(s.endpoint));
    writeJson('subs.json', subs);
  }
}

// ---------- scheduler (30s tick) ----------
const CATCHUP_MIN = 15; // fire a missed reminder up to 15 min late, then let it go
const toMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};
const isDue = (time, now) => {
  const late = toMinutes(now) - toMinutes(time);
  return late >= 0 && late <= CATCHUP_MIN;
};

function tick() {
  rolloverIfNeeded();
  const now = hhmm();
  for (const row of schedule) {
    if (!row || !row.id || !row.time || !row.label) continue;
    if (isDue(row.time, now) && !state.fired[row.id]) {
      state.fired[row.id] = true;
      push('REBORN', `${row.time} — ${row.label}`, row.id).catch(console.error);
    }
  }
  writeJson('state.json', state);
}
setInterval(tick, 30000);
process.on('unhandledRejection', (e) => console.error('unhandled', e));
tick(); // catch up on anything due before this process started

// ---------- API ----------
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.json({ limit: '64kb' }));

// The shell is public — you have to load the page before you can present a
// token. Everything under /api is gated, including the ones that only read.
app.use('/api', requireToken(config.TOKEN));

if (!fs.existsSync(DIST)) {
  console.warn(`No build found at ${DIST} — run "npm run build" first, or the app shell will 404.`);
}
app.use(express.static(DIST));

app.get('/api/vapid', (req, res) =>
  res.json({ key: vapid.publicKey, pushEnabled: PUSH_ENABLED }));

app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  try {
    assertSafePushEndpoint(sub && sub.endpoint);
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
  if (!subs.some(s => s.endpoint === sub.endpoint)) {
    if (subs.length >= MAX_SUBS) subs.shift(); // oldest device falls off, file stays bounded
    // Store only the fields web-push needs — never echo back whatever was posted.
    subs.push({ endpoint: sub.endpoint, expirationTime: sub.expirationTime ?? null, keys: sub.keys });
    writeJson('subs.json', subs);
  }
  res.json({ ok: true, count: subs.length });
});

app.post('/api/schedule', (req, res) => {
  const rows = Array.isArray(req.body && req.body.schedule) ? req.body.schedule : null;
  if (!rows) return res.status(400).json({ ok: false, error: 'body must be { schedule: [...] }' });
  const next = rows
    .filter(r => r && typeof r.id === 'string' && typeof r.time === 'string' && typeof r.label === 'string')
    .slice(0, 200);
  // Only clear an id's fired flag if its time actually changed — an edit that
  // doesn't touch time (relabeling, reordering, adding an unrelated row)
  // shouldn't risk re-sending something already pushed today. Only a real
  // time change legitimately earns another shot at firing.
  const prevById = Object.fromEntries(schedule.map(r => [r.id, r]));
  for (const row of next) {
    const prev = prevById[row.id];
    if (prev && prev.time !== row.time) delete state.fired[row.id];
  }
  schedule = next;
  writeJson('schedule.json', schedule);
  writeJson('state.json', state);
  res.json({ ok: true, count: schedule.length });
});

app.post('/api/test-push', async (req, res) => {
  await push('REBORN online', 'Reminders are armed. This is how they will arrive.', 'test');
  res.json({ ok: true, sent: PUSH_ENABLED ? subs.length : 0, pushEnabled: PUSH_ENABLED });
});

app.listen(PORT, HOST, () => {
  console.log(`REBORN backend up on http://localhost:${PORT} (bound ${HOST})`);
  console.log('');
  console.log('  Open this once per device — it saves the token, then drops it from the URL:');
  console.log(`  http://localhost:${PORT}/?token=${config.TOKEN}`);
  console.log('');
  console.log('  Over a tunnel (Tailscale/ngrok/etc), swap the host: https://<your-host>/?token=<same token>');
});
