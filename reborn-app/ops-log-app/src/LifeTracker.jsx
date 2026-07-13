import React, { useState, useEffect, useRef } from 'react';
import { Home, Dumbbell, ListChecks, UtensilsCrossed, Wallet, Plus, Trash2, ChevronRight, CalendarDays, Download, Bell, BellOff } from 'lucide-react';

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = "'Inter', ui-sans-serif, sans-serif";
const DISPLAY = "'Cormorant Garamond', Georgia, serif"; // luxury wordmark/numbers

/* =========================================================================
   THEMES — applied as CSS custom properties on the root element.
   Every component below reads var(--bg)/var(--panel)/etc instead of
   hardcoded Tailwind color classes, so re-theming never touches component
   code — only the THEMES table.
   ========================================================================= */
const THEMES = {
  noir: {
    label: 'Noir',
    bg: '#0B0B0D', panel: '#141416', field: '#1C1C1F', border: '#26262B',
    text: '#EDEAE3', dim: '#8F8B82', accent: '#C9A96A', accent2: '#7FA98F', danger: '#C96A6A',
  },
  ivory: {
    label: 'Ivory',
    bg: '#F7F5F0', panel: '#FFFFFF', field: '#F0EDE6', border: '#E2DDD2',
    text: '#1E1C18', dim: '#8A857A', accent: '#9A7B3F', accent2: '#4E6E5D', danger: '#A34A4A',
  },
  midnight: {
    label: 'Midnight',
    bg: '#0A0F1A', panel: '#111827', field: '#18202F', border: '#232D40',
    text: '#E6EAF2', dim: '#7C8698', accent: '#8FA8D0', accent2: '#C9A96A', danger: '#C96A6A',
  },
};

const CATEGORIES = [
  { id: 'work', label: 'Work', icon: '⚡', color: '#f59e0b' },
  { id: 'gym', label: 'Gym', icon: '🏋️', color: '#ef4444' },
  { id: 'health', label: 'Health', icon: '🥗', color: '#22c55e' },
  { id: 'finance', label: 'Finance', icon: '💰', color: '#3b82f6' },
  { id: 'personal', label: 'Personal', icon: '🎮', color: '#a855f7' },
  { id: 'sleep', label: 'Sleep', icon: '🌙', color: '#6366f1' },
];
const MOODS = ['😤', '😕', '😐', '🙂', '🔥'];
const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'On Fire'];
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

const DEFAULT_HABITS = [
  { id: 'hb1', name: 'Wake up 8am', category: 'sleep' },
  { id: 'hb2', name: 'No phone before 9am', category: 'personal' },
  { id: 'hb3', name: 'Gym', category: 'gym' },
  { id: 'hb4', name: 'Meal prep', category: 'health' },
  { id: 'hb5', name: 'No overspending', category: 'finance' },
];

const DEFAULT_SCHEDULE = [
  { id: 's1', time: '8:00 AM', label: 'Wake up' },
  { id: 's2', time: '9:00 AM', label: 'No phone' },
  { id: 's3', time: '10:30 AM', label: 'Gym' },
  { id: 's4', time: '12:00 PM', label: 'Shower' },
  { id: 's5', time: '12:30 PM', label: 'Eat' },
  { id: 's6', time: '2:00 PM', label: 'Work on tracker / game' },
  { id: 's7', time: '3:00 PM', label: 'Get ready for work' },
  { id: 's8', time: '3:30 PM', label: 'Work starts' },
  { id: 's9', time: '2:00 AM', label: 'Finish work' },
  { id: 's10', time: '2:30 AM', label: 'Shower' },
  { id: 's11', time: '3:00 AM', label: 'Sleep' },
];

const DEFAULT_SPLIT = [
  { day: 'Mon', type: 'Pull' },
  { day: 'Tue', type: 'Rest' },
  { day: 'Wed', type: 'Push' },
  { day: 'Thu', type: 'Legs' },
  { day: 'Fri', type: 'Rest' },
  { day: 'Sat', type: 'Rest' },
  { day: 'Sun', type: 'Full body' },
];

const DEFAULT_WEEKLY_PLAN = [];

const DEFAULT_BILLS = [
  { id: 'b1', name: 'Rent', amount: 1000 },
  { id: 'b2', name: 'Zip', amount: 700 },
  { id: 'b3', name: 'Credit card', amount: 441 },
  { id: 'b4', name: 'Phone', amount: 300 },
  { id: 'b5', name: 'SoFi', amount: 49 },
  { id: 'b6', name: 'Cash App', amount: 55 },
];

const QUOTES = [
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The pain of discipline weighs ounces; the pain of regret weighs tons.", author: "Jim Rohn" },
  { text: "Suffer now and live the rest of your life as a champion.", author: "Muhammad Ali" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only place success comes before work is in the dictionary.", author: "Vince Lombardi" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "By failing to prepare, you are preparing to fail.", author: "Benjamin Franklin" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Someone's sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
  { text: "Do not save what is left after spending; spend what is left after saving.", author: "Warren Buffett" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "A goal is a dream with a deadline.", author: "Napoleon Hill" },
  { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Great things come from hard work and perseverance. No excuses.", author: "Kobe Bryant" },
  { text: "I've failed over and over again in my life, and that is why I succeed.", author: "Michael Jordan" },
  { text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
  { text: "A dream doesn't become reality through magic; it takes sweat, determination, and hard work.", author: "Colin Powell" },
  { text: "Opportunity is missed by most people because it is dressed in overalls and looks like work.", author: "Thomas Edison" },
  { text: "I have not failed. I've just found ten thousand ways that won't work.", author: "Thomas Edison" },
  { text: "Success is measured not by the position one reaches, but by the obstacles overcome.", author: "Booker T. Washington" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Setting goals is the first step in turning the invisible into the visible.", author: "Tony Robbins" },
  { text: "You must gain control over your money, or the lack of it will forever control you.", author: "Dave Ramsey" },
  { text: "A budget is telling your money where to go instead of wondering where it went.", author: "Dave Ramsey" },
  { text: "It's not how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
  { text: "Every time you spend money, you're casting a vote for the kind of world you want.", author: "Anna Lappé" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Whether you think you can, or you think you can't — you're right.", author: "Henry Ford" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
];

// Full meal book — browsable by category in the Meals tab. Tapping an entry
// fills the Add meal form (name/calories/type) so you can review before
// logging. Calorie figures are estimates for a typical single serving.
const MEAL_BOOK = [
  // breakfast
  { name: 'Scrambled eggs (2) & toast', calories: 320, type: 'breakfast' },
  { name: 'Oatmeal with banana', calories: 340, type: 'breakfast' },
  { name: 'Greek yogurt with granola', calories: 300, type: 'breakfast' },
  { name: 'Protein pancakes (3)', calories: 380, type: 'breakfast' },
  { name: 'Bacon, egg & cheese bagel', calories: 520, type: 'breakfast' },
  { name: 'Avocado toast (2 slices)', calories: 350, type: 'breakfast' },
  { name: 'Breakfast burrito', calories: 480, type: 'breakfast' },
  { name: 'Cereal with milk', calories: 280, type: 'breakfast' },
  { name: 'Smoothie (fruit + protein)', calories: 310, type: 'breakfast' },
  { name: 'French toast (2 slices)', calories: 360, type: 'breakfast' },
  { name: 'Egg white omelet with veggies', calories: 220, type: 'breakfast' },
  { name: 'Peanut butter toast', calories: 290, type: 'breakfast' },
  // lunch
  { name: 'Chicken and rice bowl', calories: 550, type: 'lunch' },
  { name: 'Turkey sandwich', calories: 420, type: 'lunch' },
  { name: 'Caesar salad with chicken', calories: 450, type: 'lunch' },
  { name: 'Burrito bowl (chicken)', calories: 650, type: 'lunch' },
  { name: 'Grilled chicken wrap', calories: 480, type: 'lunch' },
  { name: 'Tuna salad sandwich', calories: 400, type: 'lunch' },
  { name: 'Sushi roll combo (2 rolls)', calories: 500, type: 'lunch' },
  { name: 'Pasta with marinara', calories: 520, type: 'lunch' },
  { name: 'Chicken noodle soup + roll', calories: 380, type: 'lunch' },
  { name: 'Quesadilla (chicken)', calories: 560, type: 'lunch' },
  { name: 'Poke bowl', calories: 500, type: 'lunch' },
  { name: 'Leftover meal prep plate', calories: 550, type: 'lunch' },
  // dinner
  { name: 'Steak with baked potato', calories: 700, type: 'dinner' },
  { name: 'Salmon with rice and broccoli', calories: 580, type: 'dinner' },
  { name: 'Spaghetti with meat sauce', calories: 620, type: 'dinner' },
  { name: 'Grilled chicken with veggies', calories: 480, type: 'dinner' },
  { name: 'Homemade burger with fries', calories: 750, type: 'dinner' },
  { name: 'Stir fry (beef or chicken)', calories: 550, type: 'dinner' },
  { name: 'Pizza (3 slices)', calories: 750, type: 'dinner' },
  { name: 'Tacos (3, beef or chicken)', calories: 600, type: 'dinner' },
  { name: 'Shrimp pasta alfredo', calories: 680, type: 'dinner' },
  { name: 'Pork chops with rice', calories: 620, type: 'dinner' },
  { name: 'Chili with cornbread', calories: 560, type: 'dinner' },
  { name: 'Sheet pan chicken & veggies', calories: 500, type: 'dinner' },
  // snack
  { name: 'Protein shake', calories: 150, type: 'snack' },
  { name: 'Protein bar', calories: 200, type: 'snack' },
  { name: 'Apple with peanut butter', calories: 250, type: 'snack' },
  { name: 'Handful of almonds', calories: 165, type: 'snack' },
  { name: 'Greek yogurt cup', calories: 130, type: 'snack' },
  { name: 'Rice cakes with peanut butter', calories: 180, type: 'snack' },
  { name: 'String cheese', calories: 80, type: 'snack' },
  { name: 'Trail mix (small handful)', calories: 200, type: 'snack' },
  { name: 'Beef jerky (1oz)', calories: 110, type: 'snack' },
  { name: 'Banana', calories: 105, type: 'snack' },
  { name: 'Hard-boiled eggs (2)', calories: 140, type: 'snack' },
  { name: 'Chips and guac', calories: 300, type: 'snack' },
];

// Calorie estimates for common foods and dish variants, per a stated single
// serving. Figures are rounded reference-range values for that portion (the
// kind you'd find on a nutrition label or standard database), not a lookup
// against what you actually cooked — treat them as a solid starting point
// to adjust, not a precise measurement of your specific plate.
const FOOD_CALORIES = [
  // proteins (per standard 3oz cooked serving unless noted)
  ['chicken breast', 140, '3oz, grilled, skinless'],
  ['chicken thigh', 178, '3oz, skin-on'],
  ['fried chicken', 280, '3oz, breaded'],
  ['ground beef', 215, '3oz, 85/15 cooked'],
  ['steak', 330, '6oz sirloin'],
  ['salmon', 175, '3oz, cooked'],
  ['tuna', 100, '3oz canned in water'],
  ['shrimp', 85, '3oz, cooked'],
  ['egg', 72, 'each, large'],
  ['bacon', 43, 'per slice, cooked'],
  ['turkey breast', 125, '3oz, roasted'],
  ['pork chop', 210, '3oz, cooked'],
  ['tofu', 90, '3oz, firm'],
  // grains / starches
  ['white rice', 205, '1 cup cooked'],
  ['brown rice', 216, '1 cup cooked'],
  ['pasta', 220, '1 cup cooked, plain'],
  ['bread', 80, 'per slice, whole wheat'],
  ['bagel', 270, 'each, medium'],
  ['oatmeal', 150, '1 cup cooked, water'],
  ['tortilla', 95, 'each, flour, medium'],
  ['potato', 160, 'medium, baked, plain'],
  ['sweet potato', 115, 'medium, baked'],
  ['fries', 365, 'medium fast-food serving'],
  ['spaghetti squash', 100, '1 cup, plain'],
  // spaghetti / pasta dish variants
  ['spaghetti with marinara', 350, '1.5 cups w/ sauce'],
  ['spaghetti alfredo', 600, '1.5 cups'],
  ['spaghetti bolognese', 550, '1.5 cups w/ meat sauce'],
  ['spaghetti with meatballs', 620, '1.5 cups + 3 meatballs'],
  ['spaghetti carbonara', 580, '1.5 cups'],
  ['spaghetti with shrimp', 480, '1.5 cups, garlic shrimp'],
  ['spaghetti with chicken', 520, '1.5 cups, chicken + sauce'],
  // veggies / fruit
  ['broccoli', 55, '1 cup, cooked'],
  ['banana', 105, 'medium'],
  ['apple', 95, 'medium'],
  ['avocado', 250, 'whole, medium'],
  // salads
  ['garden salad', 100, 'no dressing'],
  ['caesar salad', 350, 'w/ dressing + croutons, no protein'],
  ['caesar salad with chicken', 470, 'w/ dressing + croutons'],
  ['greek salad', 300, 'w/ feta + olive oil'],
  ['cobb salad', 500, 'full salad w/ protein'],
  ['salad', 120, 'w/ light dressing, general'],
  // snacks / dairy
  ['almonds', 164, '1oz / ~23 nuts'],
  ['peanut butter', 190, '2 tbsp'],
  ['greek yogurt', 130, '1 cup, plain nonfat'],
  ['milk', 150, '1 cup, whole'],
  ['cheese', 113, '1oz slice, cheddar'],
  ['protein shake', 130, '1 scoop whey + water'],
  ['protein bar', 200, 'each'],
  ['granola bar', 140, 'each'],
  ['chips', 150, '1oz bag'],
  ['cookie', 150, 'each, medium'],
  ['ice cream', 270, '1 cup'],
  // sandwiches / burgers
  ['turkey sandwich', 380, 'deli style'],
  ['ham sandwich', 350, 'deli style'],
  ['club sandwich', 550, 'triple decker'],
  ['blt sandwich', 400, 'w/ mayo'],
  ['grilled chicken sandwich', 400, 'fast food'],
  ['crispy chicken sandwich', 550, 'fast food, breaded'],
  ['chicken salad sandwich', 450, 'w/ mayo'],
  ['buffalo chicken sandwich', 500, 'fast food'],
  ['sandwich', 400, 'deli style, general'],
  ['cheeseburger', 600, 'fast food, single'],
  ['double cheeseburger', 750, 'fast food'],
  ['veggie burger', 350, 'patty + bun'],
  ['turkey burger', 400, 'patty + bun'],
  ['burger', 550, 'fast food, single'],
  // bowls / mexican
  ['chicken rice bowl', 550, 'meal-prep style'],
  ['beef rice bowl', 600, 'meal-prep style'],
  ['shrimp rice bowl', 480, 'meal-prep style'],
  ['tofu rice bowl', 450, 'meal-prep style'],
  ['chicken and rice', 550, 'typical meal prep plate'],
  ['chicken taco', 170, 'each, soft shell'],
  ['beef taco', 210, 'each, soft shell'],
  ['fish taco', 180, 'each'],
  ['shrimp taco', 160, 'each'],
  ['burrito', 700, 'large, fast-casual style'],
  ['quesadilla', 500, 'cheese, one full'],
  // other common meals
  ['pizza', 285, 'per slice, cheese'],
  ['sushi roll', 280, '8pc, e.g. California roll'],
  ['ramen', 500, '1 bowl, restaurant style'],
  ['soup', 180, '1 cup'],
  ['soda', 150, '12oz can'],
  ['coffee', 5, 'black'],
  ['latte', 200, '16oz, whole milk'],
  ['beer', 150, '12oz, regular'],
];

// Exercise options per split-day type, so at the gym you pick from a list
// instead of typing. Matched case-insensitively against gym.split[today].type;
// unrecognized day types (custom labels) fall back to a combined list.
const EXERCISE_LIBRARY = {
  push: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Chest Fly', 'Lateral Raise', 'Tricep Pushdown', 'Dips', 'Close-Grip Bench Press'],
  pull: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Face Pull', 'Bicep Curl', 'Hammer Curl'],
  legs: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Walking Lunges', 'Calf Raise', 'Hip Thrust'],
  'full body': ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-ups'],
  rest: [],
};
const ALL_EXERCISES = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];

function getExercisesForType(type) {
  const key = (type || '').trim().toLowerCase();
  if (EXERCISE_LIBRARY[key]) return EXERCISE_LIBRARY[key];
  // Custom/unrecognized day label — offer everything rather than nothing.
  return ALL_EXERCISES;
}

// Returns up to 6 ranked suggestions for whatever's typed so far — e.g.
// "spaghetti" surfaces every spaghetti variant (alfredo, with shrimp, with
// chicken, ...) instead of collapsing to one guess. A match counts if the
// typed text is a substring of the food name, the food name is a substring
// of what's typed, or every word typed appears somewhere in the food name.
function estimateCalorieOptions(name) {
  const q = (name || '').trim().toLowerCase();
  if (q.length < 3) return [];
  const qTokens = q.split(/\s+/).filter(Boolean);
  const matches = FOOD_CALORIES.filter(([key]) => {
    const k = key.toLowerCase();
    if (k.includes(q) || q.includes(k)) return true;
    return qTokens.every(t => k.includes(t));
  });
  matches.sort((a, b) => {
    const ak = a[0].toLowerCase(), bk = b[0].toLowerCase();
    const aStarts = ak.startsWith(q) ? 0 : 1;
    const bStarts = bk.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return Math.abs(ak.length - q.length) - Math.abs(bk.length - q.length);
  });
  return matches.slice(0, 6).map(([key, cal, note]) => ({ name: key, calories: cal, note }));
}

function getDailyQuote(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return QUOTES[hash % QUOTES.length];
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function localDateStr(d) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function todayStr() {
  return localDateStr(new Date());
}

function defaultTargetDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  return localDateStr(d);
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtMoney(n) {
  const v = Math.round(Number(n) || 0);
  return `$${v.toLocaleString('en-US')}`;
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(localDateStr(new Date(Date.now() - i * 86400000)));
  }
  return days;
}

function streakFor(habitId, logs) {
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

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key);
    return res && res.value ? JSON.parse(res.value) : fallback;
  } catch (e) {
    return fallback;
  }
}

// ---- profile switcher with a password gate ---------------------------------
// Not a real backend login — there's no server here to check a password
// against, so this hashes the password client-side (SHA-256 + a per-profile
// salt via Web Crypto) and compares hashes. That stops a casual person from
// reading someone else's data by picking their name, but anyone with access
// to the device's storage or dev tools could still get past it. Real
// Google/Apple sign-in needs an actual backend (see the README in the
// deployable zip) — flagged here as future work, not built yet.
async function hashPassword(password, salt) {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(salt + ':' + password);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return null;
  }
}
function pKey(profile, key) {
  return `p:${profile}:${key}`;
}
async function loadProfileList() {
  const list = await loadKey('profiles-list', []);
  // Migrate old plain-string profile entries (pre-password) to the new shape.
  return list.map(p => (typeof p === 'string' ? { name: p, passHash: null, salt: uid() } : p));
}
async function saveProfileList(list) {
  try { await window.storage.set('profiles-list', JSON.stringify(list)); } catch (e) {}
}

// ---- .ics calendar export -------------------------------------------------
function parseTimeLabel(t) {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec((t || '').trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3] ? m[3].toUpperCase() : null;
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, min };
}

function icsEscape(s) {
  return String(s).replace(/[\\;,]/g, c => '\\' + c);
}

function buildScheduleICS(schedule) {
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const startDate = localDateStr(now).replace(/-/g, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//REBORN//Schedule Export//EN', 'CALSCALE:GREGORIAN'];

  schedule.forEach((block, i) => {
    const parsed = parseTimeLabel(block.time);
    if (!parsed || !block.label) return;
    const hh = String(parsed.h).padStart(2, '0');
    const mm = String(parsed.min).padStart(2, '0');
    const dtstart = `${startDate}T${hh}${mm}00`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:reborn-${block.id || i}@reborn`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${Intl.DateTimeFormat().resolvedOptions().timeZone}:${dtstart}`,
      'DURATION:PT15M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:${icsEscape(block.label)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(block.label)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICS(schedule) {
  const ics = buildScheduleICS(schedule);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reborn-schedule.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- generic debounced multi-key storage writer ---------------------------
function useDebouncedStorage(delay = 500) {
  const timers = useRef({});
  return (key, value) => {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      window.storage.set(key, JSON.stringify(value)).catch(() => {});
    }, delay);
  };
}

const inputStyle = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
const dimText = { color: 'var(--dim)' };

function Panel({ title, children, right }) {
  return (
    <div className="mb-2" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>{title}</span>
        {right}
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}

function Meter({ label, value, max, displayValue, displayMax, accentVar, barVar }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div className="p-2.5" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
      <div className="text-xs uppercase tracking-widest mb-1.5 truncate" style={{ fontFamily: MONO, ...dimText }}>{label}</div>
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="text-lg font-medium" style={{ fontFamily: MONO, color: `var(${accentVar})` }}>{displayValue !== undefined ? displayValue : value}</span>
        <span className="text-xs" style={{ fontFamily: MONO, ...dimText }}>/ {displayMax !== undefined ? displayMax : max}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: `var(${barVar})` }} />
      </div>
    </div>
  );
}

function NavCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-2.5 py-2 mb-1.5 text-left"
      style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
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

function BtnPrimary({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-medium px-3 py-2 transition-opacity hover:opacity-90"
      style={{ background: 'var(--accent)', color: 'var(--bg)', ...style }}
    >{children}</button>
  );
}

function Header({ theme, setTheme, tab, setTab, profile, onSwitchProfile, notifsEnabled, onToggleNotifs }) {
  const navItems = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'gym', label: 'Gym', Icon: Dumbbell },
    { id: 'routine', label: 'Routine', Icon: ListChecks },
    { id: 'meals', label: 'Meals', Icon: UtensilsCrossed },
    { id: 'budget', label: 'Budget', Icon: Wallet },
  ];
  return (
    <div className="sticky top-0 z-10 backdrop-blur px-4 py-2" style={{ background: 'color-mix(in srgb, var(--bg) 95%, transparent)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1.5 md:mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 600, letterSpacing: 4, color: "var(--accent)" }}>REBORN</span>
          <button onClick={onSwitchProfile} className="text-[10px] px-2 py-0.5" style={{ fontFamily: MONO, border: '1px solid var(--border)', color: 'var(--dim)' }} title="Switch profile">
            {profile}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onToggleNotifs} title={notifsEnabled ? 'Reminders on — tap to pause' : 'Turn on schedule reminders'}
            className="p-1.5"
            style={{ border: `1px solid ${notifsEnabled ? 'var(--accent)' : 'var(--border)'}`, color: notifsEnabled ? 'var(--accent)' : 'var(--dim)', borderRadius: 4 }}>
            {notifsEnabled ? <Bell size={13} /> : <BellOff size={13} />}
          </button>
          <div className="flex gap-1">
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => setTheme(key)} title={t.label}
                className="text-[10px] uppercase px-2 py-1"
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

function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'gym', label: 'Gym', Icon: Dumbbell },
    { id: 'routine', label: 'Routine', Icon: ListChecks },
    { id: 'meals', label: 'Meals', Icon: UtensilsCrossed },
    { id: 'budget', label: 'Budget', Icon: Wallet },
  ];
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur max-w-md mx-auto"
      style={{ background: 'color-mix(in srgb, var(--bg) 95%, transparent)', borderTop: '1px solid var(--border)' }}>
      <div className="grid grid-cols-5">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-col items-center gap-0.5 py-1.5"
            style={{ borderTop: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`, color: tab === id ? 'var(--accent)' : 'var(--dim)' }}
          >
            <Icon size={16} />
            <span className="text-xs" style={{ fontFamily: MONO }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LifeTracker() {
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState('noir');
  const writeDebounced = useDebouncedStorage(500);

  // Profile switcher with a password gate. See the hashPassword comment
  // above for exactly what this does and doesn't protect against.
  const [profile, setProfile] = useState(null);
  const [profileList, setProfileList] = useState([]);
  const [profileListLoading, setProfileListLoading] = useState(true);
  const [newProfileName, setNewProfileName] = useState('');
  const [pickerMode, setPickerMode] = useState('list'); // list | new | unlock
  const [pickerTarget, setPickerTarget] = useState(null); // profile name being unlocked
  const [pickerPassword, setPickerPassword] = useState('');
  const [pickerPassword2, setPickerPassword2] = useState('');
  const [pickerError, setPickerError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await loadProfileList();
      if (mounted) { setProfileList(list); setProfileListLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  function openUnlock(name) {
    setPickerTarget(name);
    setPickerPassword('');
    setPickerError('');
    setPickerMode('unlock');
  }
  async function confirmUnlock() {
    const entry = profileList.find(p => p.name === pickerTarget);
    if (!entry) return;
    const hash = await hashPassword(pickerPassword, entry.salt);
    if (hash === entry.passHash) {
      setProfile(entry.name);
    } else {
      setPickerError('Wrong password.');
    }
  }
  async function confirmNewProfile() {
    const trimmed = newProfileName.trim();
    if (!trimmed) { setPickerError('Enter a name.'); return; }
    if (profileList.some(p => p.name === trimmed)) { setPickerError('That name is taken — pick another or unlock it instead.'); return; }
    if (!pickerPassword) { setPickerError('Set a password.'); return; }
    if (pickerPassword !== pickerPassword2) { setPickerError('Passwords don\'t match.'); return; }
    const salt = uid();
    const passHash = await hashPassword(pickerPassword, salt);
    const entry = { name: trimmed, passHash, salt };
    const next = [...profileList, entry];
    setProfileList(next);
    saveProfileList(next);
    setProfile(trimmed);
  }

  const [gym, setGymState] = useState({ workouts: [], split: DEFAULT_SPLIT });
  const [routine, setRoutineState] = useState({ habits: DEFAULT_HABITS, logs: {}, schedule: DEFAULT_SCHEDULE });
  const [meals, setMealsState] = useState({ entries: [], calorieGoal: 2400 });
  const [budget, setBudgetState] = useState({
    transactions: [],
    monthlyBudget: 0,
    weeklyIncome: 0,
    weeklyPlan: DEFAULT_WEEKLY_PLAN,
    bills: DEFAULT_BILLS,
    billPayments: {},
    goal: { name: 'Car', target: 3000, saved: 0, targetDate: defaultTargetDate() },
  });

  const [gExercise, setGExercise] = useState('');
  const [gMuscle, setGMuscle] = useState('');
  const [gSets, setGSets] = useState('3');
  const [gReps, setGReps] = useState('8');
  const [gWeight, setGWeight] = useState('');
  const [gDate, setGDate] = useState(todayStr());

  // ---- schedule reminders (browser notifications) ------------------------
  // Real notifications, with a real limitation: they fire only while the app
  // is open in a tab (foreground or background). Firing when the app is fully
  // closed requires a deployed PWA with a service worker or a native app —
  // not possible from inside an artifact.
  const [notifsEnabled, setNotifsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const firedRef = useRef({}); // { "blockId:date:HH:MM": true } so each block fires once per day

  async function toggleNotifications() {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      setNotifsEnabled(v => !v); // toggle app-level on/off; browser permission stays granted
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifsEnabled(perm === 'granted');
  }

  useEffect(() => {
    if (!notifsEnabled || !profile) return;
    const interval = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const dateKey = todayStr();
      (routine.schedule || []).forEach(block => {
        const parsed = parseTimeLabel(block.time);
        if (!parsed) return;
        const bh = String(parsed.h).padStart(2, '0');
        const bm = String(parsed.min).padStart(2, '0');
        if (bh === hh && bm === mm) {
          const key = `${block.id}:${dateKey}:${bh}:${bm}`;
          if (firedRef.current[key]) return;
          firedRef.current[key] = true;
          try {
            new Notification('REBORN', { body: `${block.time} — ${block.label}` });
          } catch (e) { /* notification blocked or unsupported — fail quietly */ }
        }
      });
    }, 20000); // check every 20s; fires within the target minute
    return () => clearInterval(interval);
  }, [notifsEnabled, profile, routine.schedule]);

  useEffect(() => {
    if (loading || gExercise) return;
    const idx = (new Date(todayStr() + 'T00:00:00').getDay() + 6) % 7;
    const todaysType = gym.split[idx] ? gym.split[idx].type : '';
    const options = getExercisesForType(todaysType);
    if (options.length) setGExercise(options[0]);
  }, [loading, gym.split]);

  function handleExerciseChange(name) {
    setGExercise(name);
    const priorLogs = gym.workouts.filter(w => w.exercise.toLowerCase() === name.toLowerCase());
    if (priorLogs.length) {
      const mostRecent = priorLogs[0]; // workouts are unshifted newest-first
      setGSets(mostRecent.sets || '3');
      setGReps(mostRecent.reps || '8');
      setGWeight(mostRecent.weight || '');
    } else {
      setGSets('3'); setGReps('8'); setGWeight('');
    }
  }

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('personal');

  const [mName, setMName] = useState('');
  const [mBookSearch, setMBookSearch] = useState('');
  const [mBookFilter, setMBookFilter] = useState('all');
  const [mCalories, setMCalories] = useState('');
  const [mType, setMType] = useState('breakfast');
  const [mDate, setMDate] = useState(todayStr());

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [planCategory, setPlanCategory] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [editingBillId, setEditingBillId] = useState(null);
  const [editBillName, setEditBillName] = useState('');
  const [editBillAmount, setEditBillAmount] = useState('');

  function startEditBill(b) {
    setEditingBillId(b.id);
    setEditBillName(b.name);
    setEditBillAmount(String(b.amount));
  }
  function saveEditBill() {
    if (!editBillName.trim()) { setEditingBillId(null); return; }
    editBill(editingBillId, editBillName.trim(), editBillAmount);
    setEditingBillId(null);
  }

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const [g, r, m, b, th] = await Promise.all([
        loadKey(pKey(profile, 'gym-data'), { workouts: [], split: DEFAULT_SPLIT }),
        loadKey(pKey(profile, 'routine-data'), { habits: DEFAULT_HABITS, logs: {}, schedule: DEFAULT_SCHEDULE, moodLog: {} }),
        loadKey(pKey(profile, 'meals-data'), { entries: [], calorieGoal: 2400 }),
        loadKey(pKey(profile, 'budget-data'), {
          transactions: [],
          monthlyBudget: 0,
          weeklyIncome: 0,
          weeklyPlan: DEFAULT_WEEKLY_PLAN,
          bills: DEFAULT_BILLS,
          billPayments: {},
          goal: { name: 'Car', target: 3000, saved: 0, targetDate: defaultTargetDate(), debtAmount: 0, debtCleared: false, weeklySavingsAmount: 0 },
        }),
        loadKey(pKey(profile, 'theme'), 'noir'),
      ]);

      if (!g.split) g.split = DEFAULT_SPLIT;
      if (!r.schedule) r.schedule = DEFAULT_SCHEDULE;
      if (!r.habits || r.habits.length === 0) r.habits = DEFAULT_HABITS;
      if (!r.moodLog) r.moodLog = {};
      if (!b.weeklyPlan) b.weeklyPlan = DEFAULT_WEEKLY_PLAN;
      if (b.weeklyIncome === undefined) b.weeklyIncome = 0;
      if (!b.bills) b.bills = DEFAULT_BILLS;
      if (!b.billPayments) b.billPayments = {};
      if (!b.goal) b.goal = { name: 'Car', target: 3000, saved: 0, targetDate: defaultTargetDate(), debtAmount: 0, debtCleared: false };
      if (b.goal.debtAmount === undefined) b.goal.debtAmount = 0;
      if (b.goal.debtCleared === undefined) b.goal.debtCleared = false;
      if (b.goal.debtWeeklyPayment === undefined) b.goal.debtWeeklyPayment = 0;
      if (b.goal.debtStartDate === undefined) b.goal.debtStartDate = todayStr();
      if (b.goal.weeklySavingsAmount === undefined) b.goal.weeklySavingsAmount = 0;
      // One-time seed only, not ongoing sync: if an existing weekly-plan line
      // already looks like savings (e.g. the default "Car savings" line),
      // use its amount as a starting point for the projection field below so
      // it isn't blank on first load. After this, the two are independent —
      // editing one never touches the other.
      if (!b.goal.weeklySavingsAmount) {
        const nameLower = (b.goal.name || '').toLowerCase();
        const existingSavingsLine = (b.weeklyPlan || []).find(p => {
          const c = (p.category || '').toLowerCase();
          return c.includes('saving') || (nameLower && c.includes(nameLower));
        });
        if (existingSavingsLine) b.goal.weeklySavingsAmount = Number(existingSavingsLine.amount) || 0;
      }

      if (mounted) {
        setGymState(g);
        setRoutineState(r);
        setMealsState(m);
        setBudgetState(b);
        setThemeState(THEMES[th] ? th : 'noir');
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [profile]);

  function setTheme(key) {
    setThemeState(key);
    writeDebounced(pKey(profile, 'theme'), key);
  }
  function updateGym(next) {
    setGymState(next);
    writeDebounced(pKey(profile, 'gym-data'), next);
  }
  function updateRoutine(next) {
    setRoutineState(next);
    writeDebounced(pKey(profile, 'routine-data'), next);
  }
  function updateMeals(next) {
    setMealsState(next);
    writeDebounced(pKey(profile, 'meals-data'), next);
  }
  function updateBudget(next) {
    setBudgetState(next);
    writeDebounced(pKey(profile, 'budget-data'), next);
  }

  function addWorkout(w) {
    updateGym({ ...gym, workouts: [{ id: uid(), ...w }, ...gym.workouts] });
  }
  function deleteWorkout(id) {
    updateGym({ ...gym, workouts: gym.workouts.filter(w => w.id !== id) });
  }
  function handleAddWorkout() {
    if (!gExercise.trim()) return;
    addWorkout({ date: gDate, exercise: gExercise.trim(), muscle: gMuscle, sets: gSets, reps: gReps, weight: gWeight });
    // Deliberately not clearing exercise/sets/reps/weight — at the gym you're
    // usually logging several sets of the same lift back to back.
  }
  function updateSplitDay(idx, value) {
    const split = gym.split.map((s, i) => (i === idx ? { ...s, type: value } : s));
    updateGym({ ...gym, split });
  }

  function addHabit(name, category) {
    updateRoutine({ ...routine, habits: [...routine.habits, { id: uid(), name, category: category || 'personal' }] });
  }
  function deleteHabit(id) {
    const logs = { ...routine.logs };
    Object.keys(logs).forEach(d => { logs[d] = logs[d].filter(h => h !== id); });
    // BUG FIX: this used to rebuild the routine object from scratch (habits/
    // logs/schedule only), silently dropping any other field — moodLog in
    // particular would vanish on the next save. Spread the existing routine
    // first so only habits/logs actually change.
    updateRoutine({ ...routine, habits: routine.habits.filter(h => h.id !== id), logs });
  }
  function toggleHabit(id, date) {
    const current = routine.logs[date] || [];
    const next = current.includes(id) ? current.filter(h => h !== id) : [...current, id];
    updateRoutine({ ...routine, logs: { ...routine.logs, [date]: next } });
  }
  function setMood(date, moodIdx) {
    updateRoutine({ ...routine, moodLog: { ...routine.moodLog, [date]: moodIdx } });
  }
  function handleAddHabit() {
    if (!newHabitName.trim()) return;
    addHabit(newHabitName.trim(), newHabitCategory);
    setNewHabitName('');
  }
  function updateScheduleRow(id, field, value) {
    const schedule = routine.schedule.map(s => (s.id === id ? { ...s, [field]: value } : s));
    updateRoutine({ ...routine, schedule });
  }
  function addScheduleRow() {
    updateRoutine({ ...routine, schedule: [...routine.schedule, { id: uid(), time: '', label: '' }] });
  }
  function deleteScheduleRow(id) {
    updateRoutine({ ...routine, schedule: routine.schedule.filter(s => s.id !== id) });
  }

  function addMeal(m) {
    updateMeals({ ...meals, entries: [{ id: uid(), ...m }, ...meals.entries] });
  }
  function deleteMeal(id) {
    updateMeals({ ...meals, entries: meals.entries.filter(m => m.id !== id) });
  }
  function setCalorieGoal(goalVal) {
    updateMeals({ ...meals, calorieGoal: goalVal });
  }
  function handleAddMeal() {
    if (!mName.trim() || mCalories === '') return;
    addMeal({ date: mDate, name: mName.trim(), calories: mCalories, type: mType });
    setMName(''); setMCalories('');
  }

  function setMonthlyBudget(amt) {
    updateBudget({ ...budget, monthlyBudget: amt });
  }
  function setWeeklyIncome(v) {
    updateBudget({ ...budget, weeklyIncome: v });
  }
  function updatePlanAmount(id, amount) {
    const weeklyPlan = budget.weeklyPlan.map(p => (p.id === id ? { ...p, amount } : p));
    updateBudget({ ...budget, weeklyPlan });
  }
  function updatePlanCategory(id, category) {
    const weeklyPlan = budget.weeklyPlan.map(p => (p.id === id ? { ...p, category } : p));
    updateBudget({ ...budget, weeklyPlan });
  }
  function addPlanLine(category, amount) {
    if (!category.trim()) return;
    updateBudget({ ...budget, weeklyPlan: [...budget.weeklyPlan, { id: uid(), category: category.trim(), amount: Number(amount) || 0 }] });
  }
  function deletePlanLine(id) {
    updateBudget({ ...budget, weeklyPlan: budget.weeklyPlan.filter(p => p.id !== id) });
  }
  // Deliberately independent from the weekly plan below — the goal's target
  // pace and someone's actual weekly plan don't have to match (they might be
  // saving faster/slower than the "needed" pace on purpose). This only
  // updates the projection shown in the goal panel.
  function updateWeeklySavingsAmount(amount) {
    updateGoal('weeklySavingsAmount', Number(amount) || 0);
  }
  // BUG FIX: "Log this week" previously recorded real transactions but never
  // touched goal.saved, so the car-fund bar and the transaction ledger could
  // silently diverge. Now any weekly-plan line whose category matches the
  // goal name (or contains "saving") also adds to goal.saved here.
  function logWeeklyPlan() {
    const date = todayStr();
    const incomeTx = { id: uid(), date, type: 'income', amount: budget.weeklyIncome, category: 'Paycheck' };
    const expenseTxs = budget.weeklyPlan.map(p => ({ id: uid(), date, type: 'expense', amount: p.amount, category: p.category }));
    const goalNameLower = (budget.goal.name || '').toLowerCase();
    const savingsThisWeek = budget.weeklyPlan
      .filter(p => p.category.toLowerCase().includes('saving') || p.category.toLowerCase().includes(goalNameLower))
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

    // Debt-first: if there's an outstanding debt amount, this week's savings
    // pay that down before anything counts toward the goal — mirrors a
    // debt-payoff-then-save plan instead of running both at once.
    const debtRemaining = budget.goal.debtCleared ? 0 : (Number(budget.goal.debtAmount) || 0);
    let toDebt = 0, toGoal = savingsThisWeek;
    if (debtRemaining > 0) {
      toDebt = Math.min(debtRemaining, savingsThisWeek);
      toGoal = savingsThisWeek - toDebt;
    }
    const newDebtRemaining = Math.max(0, debtRemaining - toDebt);

    updateBudget({
      ...budget,
      transactions: [incomeTx, ...expenseTxs, ...budget.transactions],
      goal: {
        ...budget.goal,
        saved: (Number(budget.goal.saved) || 0) + toGoal,
        debtAmount: newDebtRemaining,
        debtCleared: budget.goal.debtCleared || newDebtRemaining === 0 && debtRemaining > 0,
      },
    });
  }
  function updateGoal(field, value) {
    updateBudget({ ...budget, goal: { ...budget.goal, [field]: value } });
  }
  function toggleBillPaid(id, monthKey) {
    const current = budget.billPayments[monthKey] || [];
    const next = current.includes(id) ? current.filter(b => b !== id) : [...current, id];
    updateBudget({ ...budget, billPayments: { ...budget.billPayments, [monthKey]: next } });
  }
  function addBill(name, amount) {
    updateBudget({ ...budget, bills: [...budget.bills, { id: uid(), name, amount }] });
  }
  function deleteBill(id) {
    updateBudget({ ...budget, bills: budget.bills.filter(b => b.id !== id) });
  }
  function editBill(id, name, amount) {
    updateBudget({ ...budget, bills: budget.bills.map(b => b.id === id ? { ...b, name, amount: Number(amount) || 0 } : b) });
  }
  function handleAddBill() {
    if (!billName.trim() || billAmount === '') return;
    addBill(billName.trim(), Number(billAmount) || 0);
    setBillName(''); setBillAmount('');
  }

  const th = THEMES[theme] || THEMES.noir;
  const rootVars = {
    '--bg': th.bg, '--panel': th.panel, '--field': th.field, '--border': th.border,
    '--text': th.text, '--dim': th.dim, '--accent': th.accent, '--accent2': th.accent2, '--danger': th.danger,
  };

  if (!profile) {
    const pickerVars = {
      '--bg': THEMES.noir.bg, '--panel': THEMES.noir.panel, '--field': THEMES.noir.field,
      '--border': THEMES.noir.border, '--text': THEMES.noir.text, '--dim': THEMES.noir.dim,
      '--accent': THEMES.noir.accent, '--accent2': THEMES.noir.accent2,
    };
    const pwInputStyle = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ ...pickerVars, background: 'var(--bg)', color: 'var(--text)', fontFamily: SANS }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&family=Cormorant+Garamond:wght@500;600;700&display=swap');`}</style>
        <div className="w-full max-w-sm">
          <div style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 600, letterSpacing: 5, color: "var(--accent)", marginBottom: 4 }}>REBORN</div>

          {pickerMode === 'list' && (
            <>
              <div className="text-2xl font-medium mb-1">Who's this?</div>
              <p className="text-xs mb-5" style={dimText}>
                Password-protected per profile, hashed on this device — real, but not a hosted account system. No backend to check it against, so Google/Apple sign-in isn't possible until this is a real hosted app.
              </p>
              {profileListLoading ? (
                <p className="text-sm" style={dimText}>Loading profiles…</p>
              ) : (
                <>
                  {profileList.length > 0 && (
                    <div className="space-y-1 mb-4">
                      {profileList.map(p => (
                        <button key={p.name} onClick={() => openUnlock(p.name)}
                          className="w-full text-left px-3 py-2 text-sm"
                          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setPickerMode('new'); setNewProfileName(''); setPickerPassword(''); setPickerPassword2(''); setPickerError(''); }}
                    className="w-full text-sm px-3 py-2" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    + New profile
                  </button>
                </>
              )}
            </>
          )}

          {pickerMode === 'new' && (
            <>
              <div className="text-2xl font-medium mb-1">New profile</div>
              <p className="text-xs mb-4" style={dimText}>Pick a name and a password — you'll need both to get back in.</p>
              <div className="space-y-2 mb-2">
                <input className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Name" autoFocus />
                <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={pickerPassword} onChange={e => setPickerPassword(e.target.value)} placeholder="Password" />
                <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={pickerPassword2} onChange={e => setPickerPassword2(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmNewProfile(); }}
                  placeholder="Confirm password" />
              </div>
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmNewProfile}>Create</BtnPrimary>
                <button onClick={() => setPickerMode('list')} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}

          {pickerMode === 'unlock' && (
            <>
              <div className="text-2xl font-medium mb-1">{pickerTarget}</div>
              <p className="text-xs mb-4" style={dimText}>Enter your password.</p>
              <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmUnlock(); }}
                placeholder="Password" autoFocus />
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmUnlock}>Unlock</BtnPrimary>
                <button onClick={() => setPickerMode('list')} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ ...rootVars, background: 'var(--bg)' }}>
        <span className="text-sm" style={{ fontFamily: MONO, color: 'var(--dim)' }}>Loading...</span>
      </div>
    );
  }

  const today = todayStr();
  const last7Days = getLast7Days();

  const totalCaloriesToday = meals.entries
    .filter(e => e.date === today)
    .reduce((s, e) => s + (parseFloat(e.calories) || 0), 0);

  const todaysMeals = meals.entries.filter(e => e.date === today);

  const last7DaysCalories = last7Days.slice().reverse().map(date => ({
    date,
    total: meals.entries.filter(e => e.date === date).reduce((s, e) => s + (parseFloat(e.calories) || 0), 0),
  }));

  const habitsToday = routine.logs[today] || [];

  const weekDaysSet = new Set(last7Days);
  const workoutsThisWeek = new Set(gym.workouts.filter(w => weekDaysSet.has(w.date)).map(w => w.date)).size;

  const workoutsByDate = (() => {
    const map = {};
    gym.workouts.forEach(w => { (map[w.date] = map[w.date] || []).push(w); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const personalBests = (() => {
    const map = {};
    gym.workouts.forEach(w => {
      const wt = parseFloat(w.weight) || 0;
      if (wt > 0 && (!map[w.exercise] || wt > map[w.exercise])) map[w.exercise] = wt;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  const todayIdx = (new Date(today + 'T00:00:00').getDay() + 6) % 7;

  const thisMonth = today.slice(0, 7);
  const spentThisMonth = budget.transactions
    .filter(t => t.type === 'expense' && t.date.slice(0, 7) === thisMonth)
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const billsThisMonthPaid = budget.billPayments[thisMonth] || [];
  const totalBills = budget.bills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const paidBills = budget.bills
    .filter(b => billsThisMonthPaid.includes(b.id))
    .reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const remainingBills = totalBills - paidBills;

  const weeklyPlanTotal = budget.weeklyPlan.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const goal = budget.goal;
  const daysLeft = Math.max(1, Math.ceil((new Date(goal.targetDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000));
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const goalRemaining = Math.max(0, (Number(goal.target) || 0) - (Number(goal.saved) || 0));
  const weeklyNeeded = goalRemaining / weeksLeft;
  const paycheckTxs = budget.transactions.filter(t => t.category === 'Paycheck').sort((a, b) => a.date.localeCompare(b.date));
  const weeksLogged = paycheckTxs.length;
  const firstLogDate = paycheckTxs[0]?.date;
  const weeksElapsedSinceFirstLog = firstLogDate
    ? Math.max(1, Math.floor((new Date(today + 'T00:00:00') - new Date(firstLogDate + 'T00:00:00')) / (7 * 86400000)) + 1)
    : 0;
  const budgetOnTrack = weeksLogged === 0 ? null : weeksLogged >= weeksElapsedSinceFirstLog;
  const budgetPctDone = Math.min(100, Math.round((Number(goal.saved) || 0) / (Number(goal.target) || 1) * 100));


  const isAllEmpty = gym.workouts.length === 0 && meals.entries.length === 0 && budget.transactions.length === 0 && Object.keys(routine.logs).length === 0;

  const quote = getDailyQuote(today);
  const mealSuggestions = estimateCalorieOptions(mName);
  const filteredMealBook = MEAL_BOOK.filter(m => {
    if (mBookFilter !== 'all' && m.type !== mBookFilter) return false;
    if (mBookSearch.trim() && !m.name.toLowerCase().includes(mBookSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ ...rootVars, background: 'var(--bg)', color: 'var(--text)', fontFamily: SANS }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&family=Cormorant+Garamond:wght@500;600;700&display=swap');
        input, select { color: var(--text); }
        input::placeholder { color: var(--dim); opacity: 0.7; }
      `}</style>
      <Header theme={theme} setTheme={setTheme} tab={tab} setTab={setTab} profile={profile} onSwitchProfile={() => { setProfile(null); setPickerMode('list'); }} notifsEnabled={notifsEnabled} onToggleNotifs={toggleNotifications} />
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-3 pt-2 pb-20 md:pb-8">

        {tab === 'home' && (
          <div>
            <div className="mb-3">
              <div className="text-lg font-medium">Today's readout</div>
              <div className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>{fmtDate(today)}</div>
            </div>

            <Panel title="Daily transmission">
              <p className="text-sm italic leading-relaxed mb-1">"{quote.text}"</p>
              <p className="text-xs" style={dimText}>— {quote.author}</p>
            </Panel>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <Meter
                label="Calories"
                value={totalCaloriesToday}
                max={meals.calorieGoal || 1}
                displayValue={`${Math.round(totalCaloriesToday)}`}
                displayMax={`${meals.calorieGoal} cal`}
                accentVar="--accent" barVar="--accent"
              />
              <Meter
                label={`${goal.name} fund`}
                value={Number(goal.saved) || 0}
                max={Number(goal.target) || 1}
                displayValue={fmtMoney(goal.saved)}
                displayMax={fmtMoney(goal.target)}
                accentVar="--accent2" barVar="--accent2"
              />
              <Meter
                label="Habits today"
                value={habitsToday.length}
                max={routine.habits.length || 1}
                displayMax={routine.habits.length}
                accentVar="--accent2" barVar="--accent2"
              />
              <Meter
                label="Workouts (7d)"
                value={workoutsThisWeek}
                max={7}
                accentVar="--accent" barVar="--accent"
              />
            </div>

            <div className="md:grid md:grid-cols-2 md:gap-2">
              <div>
                <div className="mb-2 text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>Jump to</div>
                <NavCard
                  icon={Dumbbell}
                  title="Gym"
                  subtitle={`${workoutsThisWeek}/7 days trained this week · today: ${gym.split[todayIdx] ? gym.split[todayIdx].type : '—'}`}
                  onClick={() => setTab('gym')}
                />
                <NavCard
                  icon={ListChecks}
                  title="Routine"
                  subtitle={`${habitsToday.length}/${routine.habits.length} habits done today`}
                  onClick={() => setTab('routine')}
                />
                <NavCard
                  icon={UtensilsCrossed}
                  title="Meals"
                  subtitle={`${Math.round(totalCaloriesToday)} / ${meals.calorieGoal} cal today`}
                  onClick={() => setTab('meals')}
                />
                <NavCard
                  icon={Wallet}
                  title="Budget"
                  subtitle={`${fmtMoney(remainingBills)} in bills left this month`}
                  onClick={() => setTab('budget')}
                />
              </div>
              <div>
                {isAllEmpty && (
                  <Panel title="Get started">
                    <p className="text-sm" style={dimText}>Nothing logged yet. Tap a card to add your first gym session, habit check, meal, or expense.</p>
                  </Panel>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'gym' && (
          <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel title="Weekly split">
              <div className="space-y-1">
                {gym.split.map((s, i) => (
                  <div
                    key={s.day}
                    className="flex items-center justify-between px-2 py-1.5"
                    style={{ border: `1px solid ${i === todayIdx ? 'var(--accent)' : 'var(--border)'}`, background: i === todayIdx ? 'var(--field)' : 'var(--panel)' }}
                  >
                    <span className="text-sm w-10" style={{ fontFamily: MONO, color: i === todayIdx ? 'var(--accent)' : 'var(--dim)' }}>{s.day}</span>
                    <input
                      className="flex-1 bg-transparent text-sm px-2 py-1 focus:outline-none"
                      style={{ color: 'var(--text)' }}
                      value={s.type}
                      onChange={e => updateSplitDay(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </Panel>

            {personalBests.length > 0 && (
              <Panel title="Personal bests">
                <div className="space-y-1">
                  {personalBests.map(([ex, wt]) => (
                    <div key={ex} className="flex justify-between text-sm">
                      <span>{ex}</span>
                      <span style={{ fontFamily: MONO, color: 'var(--accent)' }}>{wt} lb</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="History">
              {workoutsByDate.length === 0 ? (
                <p className="text-sm" style={dimText}>No lifts logged yet. Add your first one on the right.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {workoutsByDate.map(([date, list]) => (
                    <div key={date}>
                      <div className="text-xs uppercase tracking-widest mb-1" style={{ fontFamily: MONO, ...dimText }}>{fmtDate(date)}</div>
                      <div className="space-y-1">
                        {list.map(w => (
                          <div key={w.id} className="flex items-center justify-between px-2 py-1.5" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
                            <div className="text-sm">
                              {w.muscle && <span className="text-[10px] mr-1 px-1.5 py-0.5" style={{ fontFamily: MONO, border: '1px solid var(--accent)', color: 'var(--accent)' }}>{w.muscle}</span>}
                              {w.exercise} <span style={dimText}>— {w.sets || '–'}×{w.reps || '–'} @ {w.weight || '–'}lb</span>
                            </div>
                            <button onClick={() => deleteWorkout(w.id)} style={dimText}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div>
            <Panel title={`Exercises for today — ${gym.split[todayIdx] ? gym.split[todayIdx].type : '—'} day`}>
              {getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').length === 0 ? (
                <p className="text-sm" style={dimText}>Rest day — nothing scheduled. Pick "Add lift" below manually if you're training anyway.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').map(name => (
                    <button
                      key={name}
                      onClick={() => handleExerciseChange(name)}
                      className="text-xs px-2 py-1"
                      style={{
                        fontFamily: MONO,
                        border: `1px solid ${gExercise === name ? 'var(--accent)' : 'var(--border)'}`,
                        background: gExercise === name ? 'var(--accent)' : 'var(--field)',
                        color: gExercise === name ? 'var(--bg)' : 'var(--text)',
                      }}
                    >{name}</button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Log a set">
              <div className="mb-2">
                <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Muscle group tag (optional)</label>
                <div className="flex flex-wrap gap-1">
                  {MUSCLE_GROUPS.map(mg => (
                    <button key={mg} onClick={() => setGMuscle(gMuscle === mg ? '' : mg)}
                      className="text-[10px] px-2 py-1"
                      style={{
                        fontFamily: MONO,
                        border: `1px solid ${gMuscle === mg ? 'var(--accent)' : 'var(--border)'}`,
                        background: gMuscle === mg ? 'var(--accent)' : 'transparent',
                        color: gMuscle === mg ? 'var(--bg)' : 'var(--dim)',
                      }}>{mg}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Exercise</label>
                  <select className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gExercise} onChange={e => handleExerciseChange(e.target.value)}>
                    <option value="" disabled>Select an exercise…</option>
                    {getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {ALL_EXERCISES.filter(name => !getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').includes(name)).length > 0 && (
                      <optgroup label="Other days">
                        {ALL_EXERCISES.filter(name => !getExercisesForType(gym.split[todayIdx] ? gym.split[todayIdx].type : '').includes(name)).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Sets</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gSets} onChange={e => setGSets(e.target.value)} placeholder="3" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Reps</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gReps} onChange={e => setGReps(e.target.value)} placeholder="10" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Weight (lb)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gWeight} onChange={e => setGWeight(e.target.value)} placeholder="135" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Date</label>
                  <input type="date" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={gDate} onChange={e => setGDate(e.target.value)} />
                </div>
              </div>
              <BtnPrimary onClick={handleAddWorkout}>Add lift</BtnPrimary>
              <p className="text-xs mt-2" style={dimText}>Sets/reps/weight auto-fill from your last log of the selected exercise — tweak and log again for each set.</p>
            </Panel>
          </div>
          </div>
        )}

        {tab === 'routine' && (
          <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel
              title="Daily schedule"
              right={
                <button onClick={() => downloadICS(routine.schedule)} className="flex items-center gap-1 text-[11px] px-2 py-1" style={{ fontFamily: MONO, border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                  <Download size={12} /> Export to calendar
                </button>
              }
            >
              <div className="space-y-1 mb-2 max-h-96 overflow-y-auto">
                {routine.schedule.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
                    <input
                      className="w-20 bg-transparent text-xs focus:outline-none flex-shrink-0"
                      style={{ fontFamily: MONO, color: 'var(--accent)' }}
                      value={s.time}
                      onChange={e => updateScheduleRow(s.id, 'time', e.target.value)}
                      placeholder="8:00 AM"
                    />
                    <input
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                      style={{ color: 'var(--text)' }}
                      value={s.label}
                      onChange={e => updateScheduleRow(s.id, 'label', e.target.value)}
                    />
                    <button onClick={() => deleteScheduleRow(s.id)} className="flex-shrink-0" style={dimText}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <BtnPrimary onClick={addScheduleRow}>Add block</BtnPrimary>
                <span className="text-xs flex items-center gap-1" style={dimText}>
                  <CalendarDays size={12} /> Export makes each block a daily repeating reminder — re-export after edits.
                </span>
              </div>
            </Panel>
          </div>

          <div>
            <Panel title="Today's vibe">
              <div className="flex gap-1.5">
                {MOODS.map((m, i) => (
                  <button key={i} onClick={() => setMood(today, i)}
                    className="flex-1 py-2 text-center"
                    style={{
                      background: routine.moodLog[today] === i ? 'var(--field)' : 'transparent',
                      border: `1px solid ${routine.moodLog[today] === i ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <div className="text-lg">{m}</div>
                    <div className="text-[9px] mt-0.5" style={dimText}>{MOOD_LABELS[i]}</div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Today's checklist">
              {routine.habits.length === 0 ? (
                <p className="text-sm mb-2" style={dimText}>No habits yet. Add one below.</p>
              ) : (
                <div className="mb-3">
                  {CATEGORIES.map(cat => {
                    const inCat = routine.habits.filter(h => (h.category || 'personal') === cat.id);
                    if (!inCat.length) return null;
                    return (
                      <div key={cat.id} className="mb-3">
                        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: MONO, color: cat.color }}>{cat.icon} {cat.label}</div>
                        <div className="space-y-1">
                          {inCat.map(h => {
                            const done = habitsToday.includes(h.id);
                            const streak = streakFor(h.id, routine.logs);
                            return (
                              <div key={h.id} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
                                <button onClick={() => toggleHabit(h.id, today)} className="flex items-center gap-2 flex-1 text-left">
                                  <span className="w-4 h-4 flex-shrink-0" style={{ background: done ? cat.color : 'transparent', border: `1px solid ${done ? cat.color : 'var(--border)'}` }} />
                                  <span className="text-sm" style={{ color: done ? 'var(--dim)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{h.name}</span>
                                </button>
                                <div className="flex items-center gap-2">
                                  {streak > 0 && <span className="text-xs" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{streak}d</span>}
                                  <button onClick={() => deleteHabit(h.id)} style={dimText}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-1 mb-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setNewHabitCategory(cat.id)}
                    className="text-[10px] px-2 py-1"
                    style={{
                      fontFamily: MONO,
                      border: `1px solid ${newHabitCategory === cat.id ? cat.color : 'var(--border)'}`,
                      background: newHabitCategory === cat.id ? cat.color : 'transparent',
                      color: newHabitCategory === cat.id ? '#000' : 'var(--dim)',
                    }}>{cat.icon} {cat.label}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-sm px-3 py-2 focus:outline-none"
                  style={inputStyle}
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  placeholder="New habit"
                  onKeyDown={e => { if (e.key === 'Enter') handleAddHabit(); }}
                />
                <BtnPrimary onClick={handleAddHabit}><Plus size={16} /></BtnPrimary>
              </div>
            </Panel>

            <Panel title="Last 7 days">
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ fontFamily: MONO }}>
                  <thead>
                    <tr>
                      <td></td>
                      {last7Days.map(d => (
                        <td key={d} className="text-center pb-1" style={dimText}>
                          {new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {routine.habits.map(h => (
                      <tr key={h.id}>
                        <td className="pr-2 py-1 truncate" style={{ maxWidth: '5.5rem', ...dimText }}>{h.name}</td>
                        {last7Days.map(d => {
                          const on = (routine.logs[d] || []).includes(h.id);
                          return (
                            <td key={d} className="text-center py-1">
                              <span className="inline-block w-3 h-3" style={{ background: on ? 'var(--accent2)' : 'var(--field)', border: on ? 'none' : '1px solid var(--border)' }} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
          </div>
        )}

        {tab === 'meals' && (
          <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel
              title="Daily goal"
              right={
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="w-20 text-sm px-2 py-1 text-right"
                    style={inputStyle}
                    value={meals.calorieGoal}
                    onChange={e => setCalorieGoal(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                  <span className="text-xs" style={dimText}>cal</span>
                </div>
              }
            >
              <Meter
                label="Today"
                value={totalCaloriesToday}
                max={meals.calorieGoal || 1}
                displayValue={`${Math.round(totalCaloriesToday)} cal`}
                displayMax={`${meals.calorieGoal} cal`}
                accentVar="--accent" barVar="--accent"
              />
            </Panel>

            <Panel title="Add meal">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Meal</label>
                  <input className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={mName} onChange={e => setMName(e.target.value)} placeholder="Chicken and rice" autoComplete="off" />
                  {mealSuggestions.length > 0 && (
                    <div className="mt-1" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
                      {mealSuggestions.map(s => (
                        <button key={s.name}
                          onClick={() => { setMName(s.name.replace(/\b\w/g, c => c.toUpperCase())); setMCalories(String(s.calories)); }}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-left"
                          style={{ borderBottom: '1px solid var(--border)' }}
                        >
                          <span className="text-xs capitalize" style={{ color: 'var(--text)' }}>{s.name}</span>
                          <span className="text-xs flex-shrink-0 ml-2" style={{ fontFamily: MONO, color: 'var(--accent2)' }}>~{s.calories} cal</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Calories</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={mCalories} onChange={e => setMCalories(e.target.value)} placeholder="600" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Type</label>
                  <select className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={mType} onChange={e => setMType(e.target.value)}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Date</label>
                  <input type="date" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={mDate} onChange={e => setMDate(e.target.value)} />
                </div>
              </div>
              <BtnPrimary onClick={handleAddMeal}>Add meal</BtnPrimary>
            </Panel>

            <Panel title="Today's meals">
              {todaysMeals.length === 0 ? (
                <p className="text-sm" style={dimText}>Nothing logged today yet.</p>
              ) : (
                <div className="space-y-1">
                  {todaysMeals.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-2 py-1.5" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
                      <div className="text-sm">
                        {m.name} <span className="capitalize" style={dimText}>({m.type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{m.calories}</span>
                        <button onClick={() => deleteMeal(m.id)} style={dimText}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div>
            <Panel title="Meal book">
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 text-sm px-3 py-2 focus:outline-none"
                  style={inputStyle}
                  value={mBookSearch}
                  onChange={e => setMBookSearch(e.target.value)}
                  placeholder="Search meals…"
                />
              </div>
              <div className="flex gap-1 mb-2 flex-wrap">
                {['all', 'breakfast', 'lunch', 'dinner', 'snack'].map(f => (
                  <button
                    key={f}
                    onClick={() => setMBookFilter(f)}
                    className="text-xs px-2 py-1 capitalize"
                    style={{
                      fontFamily: MONO,
                      border: `1px solid ${mBookFilter === f ? 'var(--accent)' : 'var(--border)'}`,
                      background: mBookFilter === f ? 'var(--accent)' : 'transparent',
                      color: mBookFilter === f ? 'var(--bg)' : 'var(--dim)',
                    }}
                  >{f}</button>
                ))}
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredMealBook.length === 0 ? (
                  <p className="text-sm" style={dimText}>No meals match that search.</p>
                ) : (
                  filteredMealBook.map(m => (
                    <button
                      key={m.name}
                      onClick={() => { setMName(m.name); setMCalories(String(m.calories)); setMType(m.type); }}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-left"
                      style={{ background: 'var(--field)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-sm">{m.name} <span className="text-xs capitalize" style={dimText}>({m.type})</span></span>
                      <span className="text-sm flex-shrink-0" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{m.calories} cal</span>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs mt-2" style={dimText}>Tap a meal to fill the form above, then hit "Add meal" to log it.</p>
            </Panel>

            <Panel title="Last 7 days">
              <div className="space-y-1">
                {last7DaysCalories.map(d => (
                  <div key={d.date} className="flex justify-between text-sm">
                    <span style={dimText}>{fmtDate(d.date)}</span>
                    <span style={{ fontFamily: MONO }}>{Math.round(d.total)} cal</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          </div>
        )}

        {tab === 'budget' && (
          <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <Meter
              label={`${goal.name} fund`}
              value={Number(goal.saved) || 0}
              max={Number(goal.target) || 1}
              displayValue={fmtMoney(goal.saved)}
              displayMax={fmtMoney(goal.target)}
              accentVar="--accent2" barVar="--accent2"
            />
            <Meter
              label="Weeks left"
              value={weeksLeft}
              max={weeksLeft || 1}
              displayMax={weeksLeft}
              accentVar="--accent" barVar="--accent"
            />
            <div className="p-3" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
              <div className="text-xs uppercase tracking-widest mb-2 truncate" style={{ fontFamily: MONO, ...dimText }}>Per week needed</div>
              <div className="text-xl font-medium" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmtMoney(weeklyNeeded)}</div>
            </div>
            <div className="p-3" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
              <div className="text-xs uppercase tracking-widest mb-2 truncate" style={{ fontFamily: MONO, ...dimText }}>Status</div>
              <div className="text-xl font-medium" style={{ fontFamily: MONO, color: budgetPctDone >= 100 ? 'var(--accent2)' : budgetOnTrack === null ? 'var(--dim)' : budgetOnTrack ? 'var(--accent2)' : 'var(--danger)' }}>
                {budgetPctDone >= 100 ? 'Done' : budgetOnTrack === null ? '—' : budgetOnTrack ? 'On track' : 'Behind'}
              </div>
            </div>
          </div>

          <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel title="Savings goal">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Goal</label>
                  <input className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.name} onChange={e => updateGoal('name', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Target ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.target} onChange={e => updateGoal('target', e.target.value === '' ? 0 : Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Saved so far ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.saved} onChange={e => updateGoal('saved', e.target.value === '' ? 0 : Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Target date</label>
                  <input type="date" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.targetDate} onChange={e => updateGoal('targetDate', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Save per week ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.weeklySavingsAmount || ''} onChange={e => updateWeeklySavingsAmount(e.target.value)} placeholder="e.g. 100" />
                </div>
              </div>
              <Meter
                label={`${goal.name} fund`}
                value={Number(goal.saved) || 0}
                max={Number(goal.target) || 1}
                displayValue={fmtMoney(goal.saved)}
                displayMax={fmtMoney(goal.target)}
                accentVar="--accent2" barVar="--accent2"
              />
              {Number(goal.weeklySavingsAmount) > 0 ? (
                (() => {
                  const remaining = Math.max(0, (Number(goal.target) || 0) - (Number(goal.saved) || 0));
                  const wk = Math.ceil(remaining / Number(goal.weeklySavingsAmount));
                  const projected = new Date(Date.now() + wk * 7 * 86400000);
                  return (
                    <div className="p-3 mt-2" style={{ background: 'var(--field)', border: '1px solid var(--accent2)' }}>
                      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: 'var(--accent2)', lineHeight: 1 }}>
                        {wk === 0 ? 'Goal met' : `${wk} ${wk === 1 ? 'week' : 'weeks'}`}
                      </div>
                      <div className="text-xs mt-1" style={dimText}>
                        at {fmtMoney(goal.weeklySavingsAmount)}/wk → {goal.name} funded by <span style={{ color: 'var(--text)' }}>{fmtDate(projected.toISOString().slice(0, 10))}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs mt-2" style={dimText}>
                  Set a weekly amount above to see how long {goal.name} will take. This is separate from the weekly plan below — your actual plan can save faster, slower, or nothing some weeks, that's fine.
                </p>
              )}
            </Panel>

            <Panel title="Debt payoff (optional, runs before savings)">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Amount owed ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.debtAmount || 0} onChange={e => updateGoal('debtAmount', e.target.value === '' ? 0 : Number(e.target.value))} disabled={goal.debtCleared} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Pay per week ($)</label>
                  <input type="number" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.debtWeeklyPayment || ''} onChange={e => updateGoal('debtWeeklyPayment', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="e.g. 50" disabled={goal.debtCleared} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest mb-1 block" style={dimText}>Start paying on</label>
                  <input type="date" className="w-full text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={goal.debtStartDate || today} onChange={e => updateGoal('debtStartDate', e.target.value)} disabled={goal.debtCleared} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => updateGoal('debtCleared', !goal.debtCleared)}
                    className="w-full text-sm px-3 py-2"
                    style={{ border: `1px solid ${goal.debtCleared ? 'var(--accent2)' : 'var(--border)'}`, color: goal.debtCleared ? 'var(--accent2)' : 'var(--dim)' }}>
                    {goal.debtCleared ? '✓ Cleared' : 'Mark cleared'}
                  </button>
                </div>
              </div>
              {goal.debtCleared ? (
                <p className="text-xs" style={{ color: 'var(--accent2)' }}>No debt in the way — savings go straight to your goal.</p>
              ) : goal.debtAmount > 0 && goal.debtWeeklyPayment > 0 ? (
                (() => {
                  const weeksNeeded = Math.ceil(Number(goal.debtAmount) / Number(goal.debtWeeklyPayment));
                  const start = new Date((goal.debtStartDate || today) + 'T00:00:00');
                  const payoffDate = new Date(start.getTime() + weeksNeeded * 7 * 86400000);
                  return (
                    <div className="p-3 mt-1" style={{ background: 'var(--field)', border: '1px solid var(--accent)' }}>
                      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{weeksNeeded} {weeksNeeded === 1 ? 'week' : 'weeks'}</div>
                      <div className="text-xs mt-1" style={dimText}>
                        at {fmtMoney(goal.debtWeeklyPayment)}/wk starting {fmtDate(goal.debtStartDate || today)} → debt-free by <span style={{ color: 'var(--text)' }}>{fmtDate(payoffDate.toISOString().slice(0, 10))}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs" style={dimText}>
                  {goal.debtAmount > 0 ? 'Set a weekly payment amount to see how long it\'ll take.' : 'No debt entered — this section stays out of the way until you add one.'}
                </p>
              )}
              {goal.debtAmount > 0 && !goal.debtCleared && (
                <p className="text-xs mt-2" style={dimText}>Any "saving" line in your weekly plan below also pays this down first, on top of the plan above.</p>
              )}
            </Panel>

            <Panel
              title="Weekly plan"
              right={
                <button
                  onClick={logWeeklyPlan}
                  className="text-xs px-2 py-1"
                  style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
                >
                  Log this week
                </button>
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Weekly income</span>
                <input
                  type="number"
                  className="w-24 text-sm px-2 py-1 text-right"
                  style={inputStyle}
                  value={budget.weeklyIncome}
                  onChange={e => setWeeklyIncome(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                {budget.weeklyPlan.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      className="flex-1 text-sm px-2 py-1 focus:outline-none"
                      style={inputStyle}
                      value={p.category}
                      onChange={e => updatePlanCategory(p.id, e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-20 text-sm px-2 py-1 text-right"
                      style={inputStyle}
                      value={p.amount}
                      onChange={e => updatePlanAmount(p.id, e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                    <button onClick={() => deletePlanLine(p.id)} style={dimText}><Trash2 size={14} /></button>
                  </div>
                ))}
                {budget.weeklyPlan.length === 0 && (
                  <p className="text-sm" style={dimText}>No categories yet — add your own below.</p>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <input
                  className="flex-1 text-sm px-2 py-1 focus:outline-none"
                  style={inputStyle}
                  value={planCategory}
                  onChange={e => setPlanCategory(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addPlanLine(planCategory, planAmount); setPlanCategory(''); setPlanAmount(''); } }}
                  placeholder="New category"
                />
                <input
                  type="number"
                  className="w-20 text-sm px-2 py-1 text-right"
                  style={inputStyle}
                  value={planAmount}
                  onChange={e => setPlanAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addPlanLine(planCategory, planAmount); setPlanCategory(''); setPlanAmount(''); } }}
                  placeholder="$"
                />
                <button onClick={() => { addPlanLine(planCategory, planAmount); setPlanCategory(''); setPlanAmount(''); }}
                  style={{ color: 'var(--accent)' }}><Plus size={16} /></button>
              </div>
              <div className="flex justify-between text-xs mt-2 pt-2" style={{ ...dimText, borderTop: '1px solid var(--border)' }}>
                <span>Planned total</span>
                <span style={{ fontFamily: MONO }}>{fmtMoney(weeklyPlanTotal)}</span>
              </div>
            </Panel>
          </div>

          <div>
            <Panel title="Milestones">
              <div className="space-y-2">
                {(goal.debtAmount > 0 || goal.debtCleared) && (
                  <div className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: `1px solid ${goal.debtCleared ? 'var(--accent2)' : 'var(--border)'}` }}>
                    <span className="text-sm">💳 Debt cleared</span>
                    <span className="text-xs" style={{ fontFamily: MONO, color: goal.debtCleared ? 'var(--accent2)' : 'var(--dim)' }}>{goal.debtCleared ? 'DONE' : 'pending'}</span>
                  </div>
                )}
                {[0.25, 0.5, 0.75, 1].map(frac => {
                  const target = Math.round((Number(goal.target) || 0) * frac);
                  const reached = (Number(goal.saved) || 0) >= target;
                  return (
                    <div key={frac} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: `1px solid ${reached ? 'var(--accent)' : 'var(--border)'}` }}>
                      <span className="text-sm">{frac === 1 ? '🎯' : '🌱'} {Math.round(frac * 100)}% of {goal.name}</span>
                      <span className="text-xs" style={{ fontFamily: MONO, color: reached ? 'var(--accent)' : 'var(--dim)' }}>{reached ? fmtMoney(target) + ' ✓' : fmtMoney(target)}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Monthly bills">
              <div className="space-y-1 mb-2">
                {budget.bills.map(b => {
                  const paid = billsThisMonthPaid.includes(b.id);
                  const isEditing = editingBillId === b.id;
                  if (isEditing) {
                    return (
                      <div key={b.id} className="flex items-center gap-2 px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--accent)' }}>
                        <input
                          className="flex-1 text-sm px-2 py-1 focus:outline-none"
                          style={inputStyle}
                          value={editBillName}
                          onChange={e => setEditBillName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditBill(); if (e.key === 'Escape') setEditingBillId(null); }}
                          autoFocus
                        />
                        <input
                          type="number"
                          className="w-20 text-sm px-2 py-1 focus:outline-none"
                          style={inputStyle}
                          value={editBillAmount}
                          onChange={e => setEditBillAmount(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditBill(); if (e.key === 'Escape') setEditingBillId(null); }}
                        />
                        <button onClick={saveEditBill} className="text-xs px-2 py-1" style={{ border: '1px solid var(--accent2)', color: 'var(--accent2)' }}>Save</button>
                        <button onClick={() => setEditingBillId(null)} style={dimText}>✕</button>
                      </div>
                    );
                  }
                  return (
                    <div key={b.id} onDoubleClick={() => startEditBill(b)} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--border)' }}>
                      <button onClick={() => toggleBillPaid(b.id, thisMonth)} onDoubleClick={e => { e.stopPropagation(); startEditBill(b); }} className="flex items-center gap-2 flex-1 text-left">
                        <span className="w-4 h-4 flex-shrink-0" style={{ background: paid ? 'var(--accent2)' : 'transparent', border: `1px solid ${paid ? 'var(--accent2)' : 'var(--border)'}` }} />
                        <span className="text-sm" style={{ color: paid ? 'var(--dim)' : 'var(--text)', textDecoration: paid ? 'line-through' : 'none' }}>{b.name}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ fontFamily: MONO }} onDoubleClick={e => { e.stopPropagation(); startEditBill(b); }}>{fmtMoney(b.amount)}</span>
                        <button onClick={() => deleteBill(b.id)} style={dimText}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] mb-2" style={dimText}>Double-tap a bill to edit its name or amount.</p>
              <div className="flex gap-2 mb-2">
                <input className="flex-1 text-sm px-3 py-2 focus:outline-none" style={inputStyle} value={billName} onChange={e => setBillName(e.target.value)} placeholder="Bill name" />
                <input
                  type="number"
                  className="w-24 text-sm px-2"
                  style={inputStyle}
                  value={billAmount}
                  onChange={e => setBillAmount(e.target.value)}
                  placeholder="$"
                />
                <BtnPrimary onClick={handleAddBill}><Plus size={16} /></BtnPrimary>
              </div>
              <div className="flex justify-between text-xs pt-2 mb-1" style={{ ...dimText, borderTop: '1px solid var(--border)' }}>
                <span>Paid {fmtMoney(paidBills)} of {fmtMoney(totalBills)}</span>
                <span style={{ fontFamily: MONO, color: remainingBills > 0 ? 'var(--danger)' : 'var(--accent2)' }}>{fmtMoney(remainingBills)} left</span>
              </div>
            </Panel>

            <Panel
              title="Monthly cap (optional)"
              right={
                <input
                  type="number"
                  className="w-24 text-sm px-2 py-1 text-right"
                  style={inputStyle}
                  value={budget.monthlyBudget}
                  onChange={e => setMonthlyBudget(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              }
            >
              {budget.monthlyBudget > 0 ? (
                <Meter
                  label="Spent this month"
                  value={spentThisMonth}
                  max={budget.monthlyBudget}
                  displayValue={fmtMoney(spentThisMonth)}
                  displayMax={fmtMoney(budget.monthlyBudget)}
                  accentVar={spentThisMonth > budget.monthlyBudget ? '--danger' : '--accent2'}
                  barVar={spentThisMonth > budget.monthlyBudget ? '--danger' : '--accent2'}
                />
              ) : (
                <p className="text-sm" style={dimText}>Optional: set an overall monthly spending cap to track against.</p>
              )}
            </Panel>
          </div>
          </div>
          </div>
        )}

      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
