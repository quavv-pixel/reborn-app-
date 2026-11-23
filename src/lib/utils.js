// Small pure helpers: dates, money formatting, streaks, the hero wave path.
export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function localDateStr(d) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

export function todayStr() {
  return localDateStr(new Date());
}

export function defaultTargetDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  return localDateStr(d);
}

export function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// A perfectly seamless sine-wave path: for any integer `cycles`, the value
// and slope at x=0 and x=width match exactly, so two copies placed side by
// side and scrolled by exactly one width loop with no visible seam.
export function wavePath(width, height, amplitude, cycles, points = 72) {
  const midY = height / 2;
  let d = '';
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const y = midY + amplitude * Math.sin((2 * Math.PI * cycles * x) / width);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
  }
  return d.trim();
}
// Same wave frequency as a single 300-wide/3-cycle tile, generated directly
// at double width so two seamless periods sit side by side — the element
// scrolls by exactly one 300-wide tile (50% of its own 600-wide box) to loop.
export const HERO_WAVE_PATH = wavePath(600, 40, 12, 6);

/** Cold (blue) at progress 0 to hot (red) at progress 1, as an HSL string. */
export function heatColor(progress) {
  const hue = 220 - Math.max(0, Math.min(1, progress)) * 220;
  return `hsl(${hue.toFixed(0)}, 85%, 58%)`;
}

export function fmtMoney(n) {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US');
}

export function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(localDateStr(new Date(Date.now() - i * 86400000)));
  }
  return days;
}

export function streakFor(habitId, logs) {
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = localDateStr(d);
    if (logs[key] && logs[key].includes(habitId)) {
      streak++;
      d = new Date(d.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

export async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key);
    return res && res.value ? JSON.parse(res.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
