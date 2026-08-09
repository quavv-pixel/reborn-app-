import React, { useState, useEffect, useRef } from 'react';
import { Home, Dumbbell, ListChecks, Wallet, Plus, Trash2, ChevronRight, CalendarDays, Download, Bell, BellOff, StickyNote, Pin, ShoppingCart, Check, Copy, Loader2, RefreshCw, X, Share2, BookOpen, ExternalLink } from 'lucide-react';
import { bootstrapToken, backendAvailable, armRealPush, syncSchedule } from './push';
import { BOOK } from './book';
import {
  weekIndex,
  weekLabel,
  pickOptions,
  buildList,
  claudeMessage,
  hasWrapped,
  toInstacartLineItems,
  instacartTitle,
} from './rotation';
import { callApi } from './apiClient';

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SANS = "'Inter', ui-sans-serif, sans-serif";
const DISPLAY = "'Cormorant Garamond', Georgia, serif"; // luxury wordmark/numbers
const WEEK_DISPLAY = "'Archivo Black', 'Arial Black', sans-serif"; // Weekly tab masthead, matches the original skinny-week look

// iOS-style shapes: soft rounded corners + a bit more breathing room than the
// original sharp-edged layout, applied globally regardless of which color
// theme is active. RADIUS is for card-level containers (Panel, Meter, the
// grouped nav list); RADIUS_SM matches the global input/select/button rule
// below so small chips, fields, and list rows all read as one consistent shape.
const RADIUS = 14;
const RADIUS_SM = 10;

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
  webslinger: {
    label: 'Web-Slinger',
    bg: '#0A0808', panel: '#150F10', field: '#1F1517', border: '#33191D',
    text: '#F3E9E6', dim: '#9C7A7E', accent: '#E8232F', accent2: '#FF4FA3', danger: '#FF7A45',
  },
  chillzone: {
    label: 'Chill Zone',
    bg: '#100C1E', panel: '#1B1730', field: '#241F3D', border: '#322B52',
    text: '#EDE9F7', dim: '#8D85AC', accent: '#C084FC', accent2: '#FFB86B', danger: '#FF6B81',
  },
  arcade: {
    label: 'Arcade',
    bg: '#0D0B1A', panel: '#17142B', field: '#201C3B', border: '#2E2850',
    text: '#ECE9F9', dim: '#8480A8', accent: '#FF2E92', accent2: '#33D9E8', danger: '#FF5A36',
  },
  terminal: {
    label: 'Terminal',
    bg: '#050806', panel: '#0B120D', field: '#101A12', border: '#1C2E1F',
    text: '#D6F5DC', dim: '#5E8F68', accent: '#39FF6A', accent2: '#4DD8E8', danger: '#FF5C5C',
  },
  sakura: {
    label: 'Sakura',
    bg: '#FDF3F6', panel: '#FFFFFF', field: '#FBE8ED', border: '#F3D3DE',
    text: '#3B2530', dim: '#A98A95', accent: '#B03A5B', accent2: '#5C7A62', danger: '#C1543D',
  },
  ember: {
    label: 'Ember',
    bg: '#140D08', panel: '#1E140C', field: '#281B10', border: '#3A2716',
    text: '#F5E6D3', dim: '#A6876B', accent: '#E8792A', accent2: '#F0B429', danger: '#D94F4F',
  },
  ios: {
    label: 'iOS',
    bg: '#F2F2F7', panel: '#FFFFFF', field: '#E9E9EE', border: '#D1D1D6',
    text: '#000000', dim: '#8E8E93', accent: '#007AFF', accent2: '#34C759', danger: '#FF3B30',
  },
  twitch: {
    label: 'Twitch',
    bg: '#18181B', panel: '#1F1F23', field: '#26262C', border: '#35353D',
    text: '#EFEFF1', dim: '#ADADB8', accent: '#9147FF', accent2: '#FF3D9A', danger: '#FF4747',
  },
  aura: {
    label: 'Aura',
    bg: '#1A1230', panel: '#241A3D', field: '#2E2150', border: '#40325E',
    text: '#ECE7F7', dim: '#9A8CBB', accent: '#8B6CFF', accent2: '#C77DFF', danger: '#FF6B6B',
  },
  streak: {
    label: 'Streak',
    bg: '#0A0A0A', panel: '#151515', field: '#1D1D1D', border: '#2A2A2A',
    text: '#F2F2F2', dim: '#8A8A8A', accent: '#C6FF3D', accent2: '#FFD54A', danger: '#FF4D4D',
  },
  nova: {
    label: 'Nova',
    bg: '#060B14', panel: '#0D1524', field: '#131E33', border: '#1C2C46',
    text: '#E8EEF7', dim: '#7C8CA6', accent: '#3B9EFF', accent2: '#FF8A3D', danger: '#FF5C5C',
  },
  aldi: {
    label: 'Aldi',
    bg: '#EFEDE6', panel: '#FBFAF6', field: '#E8E3D6', border: '#CFCCC2',
    text: '#16233A', dim: '#4A5566', accent: '#F0531C', accent2: '#0A72B8', danger: '#CE1B24',
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
const NOTE_TAGS = [
  { id: 'General', color: '#8A857C' },
  { id: 'Money', color: '#3b82f6' },
  { id: 'Routine', color: '#a855f7' },
  { id: 'Gym', color: '#ef4444' },
  { id: 'Idea', color: '#f59e0b' },
];
function noteTagColor(tag) {
  return (NOTE_TAGS.find(t => t.id === tag) || NOTE_TAGS[0]).color;
}
const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'On Fire'];
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

// Brand-new profiles start completely BLANK — no pre-filled habits,
// schedule, split, or bills. Anyone who opens the link and creates a
// profile builds their own from nothing; nothing here may ever read as
// another person's routine, bills, or numbers.
const DEFAULT_HABITS = [];

const DEFAULT_SCHEDULE = [];

const DEFAULT_SPLIT = [
  { day: 'Mon', type: 'Rest' },
  { day: 'Tue', type: 'Rest' },
  { day: 'Wed', type: 'Rest' },
  { day: 'Thu', type: 'Rest' },
  { day: 'Fri', type: 'Rest' },
  { day: 'Sat', type: 'Rest' },
  { day: 'Sun', type: 'Rest' },
];

const DEFAULT_WEEKLY_PLAN = [];

// Empty by default (like DEFAULT_WEEKLY_PLAN above) — bills are exactly the
// kind of specific real numbers that must never be pre-filled for a
// stranger's brand-new profile. The "Add bill" form right below the list
// covers onboarding fine without seeding anything.
const DEFAULT_BILLS = [];

// One pool per mood (matches MOODS order: Rough, Low, Okay, Good, On Fire).
// The line shown is picked from the day's date, so the same mood gets a
// different message tomorrow.
const CHEER_MESSAGES = [
  [ // 😤 Rough
    "Rough days don't last. People who keep showing up do.",
    "It's okay to have a bad day — you still opened the app. That counts.",
    "Storms pass. You've survived 100% of your worst days so far.",
    "Today is heavy. Carry it slowly — no need to run.",
    "Even at your lowest, you're still moving. That's strength.",
    "Bad day, not a bad life. Tomorrow gets a fresh page.",
    "Breathe. One small win today is enough.",
    "The comeback is always stronger than the setback.",
  ],
  [ // 😕 Low
    "Low battery is fine — recharge, don't quit.",
    "Small steps still move you forward. Take one.",
    "You don't need a perfect day, just a decent next hour.",
    "Feeling low and still logging it? That's self-awareness. Respect.",
    "Be as kind to yourself as you'd be to a friend today.",
    "Slow progress is still progress. Keep it gentle.",
    "One good meal, one short walk — watch the day turn.",
    "You've pushed through worse. This one's manageable.",
  ],
  [ // 😐 Okay
    "Okay is a fine place to start. Now stack one small win.",
    "Neutral day = blank canvas. Paint one good thing on it.",
    "Steady counts. Not every day needs fireworks.",
    "An okay day done right becomes a good one by dinner.",
    "Consistency on the 'meh' days is what builds streaks.",
    "You showed up. That's the hardest part — build from there.",
    "Nudge the day: one habit checked, and it tips your way.",
    "Average days are where champions are quietly made.",
  ],
  [ // 🙂 Good
    "Good day energy — spend it on something future-you will thank you for.",
    "You're in rhythm. Protect it: one more habit checked.",
    "Feeling good looks great on you. Keep the streak alive.",
    "Ride the wave — good days are for building momentum.",
    "This is what consistency feels like. Remember it.",
    "Good mood + small effort = great day. You're halfway there.",
    "Days like this are proof the routine is working.",
    "Solid. Now finish strong — tomorrow's you is watching.",
  ],
  [ // 🔥 On Fire
    "ON FIRE! Days like this are why you grind. Go get it all.",
    "Unstoppable energy — point it at your biggest goal today.",
    "This is peak you. Log it, remember it, repeat it.",
    "Whatever you're doing — bottle it. It's working.",
    "Full send. Today's the day the streak fears you.",
    "You didn't find motivation. You built it. Burn bright.",
    "Big energy days build big results. Don't waste a minute.",
    "That fire? Earned. Now light up every box on the list.",
  ],
];

function cheerFor(moodIdx, dateStr) {
  const pool = CHEER_MESSAGES[moodIdx] || CHEER_MESSAGES[2];
  let h = 0;
  for (const ch of String(dateStr)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

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
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "You will never always be motivated, so you must learn to be disciplined.", author: "Unknown" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "He who is not courageous enough to take risks will accomplish nothing in life.", author: "Muhammad Ali" },
  { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
  { text: "Strength does not come from winning. Your struggles develop your strengths.", author: "Arnold Schwarzenegger" },
  { text: "The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.", author: "Arnold Schwarzenegger" },
  { text: "If you don't find a way to make money while you sleep, you will work until you die.", author: "Warren Buffett" },
  { text: "The most important investment you can make is in yourself.", author: "Warren Buffett" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Rohn" },
  { text: "Success is nothing more than a few simple disciplines, practiced every day.", author: "Jim Rohn" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "You are the average of the five people you spend the most time with.", author: "Jim Rohn" },
  { text: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Some people want it to happen, some wish it would happen, others make it happen.", author: "Michael Jordan" },
  { text: "Obstacles don't have to stop you. If you run into a wall, figure out how to climb it.", author: "Michael Jordan" },
  { text: "Everything negative — pressure, challenges — is all an opportunity for me to rise.", author: "Kobe Bryant" },
  { text: "The moment you give up is the moment you let someone else win.", author: "Kobe Bryant" },
  { text: "Rest at the end, not in the middle.", author: "Kobe Bryant" },
  { text: "It's not about the number of hours you practice, it's about the intensity you bring to them.", author: "Kobe Bryant" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "It ain't about how hard you hit. It's about how hard you can get hit and keep moving forward.", author: "Rocky Balboa" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese proverb" },
  { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
  { text: "When the roots are deep, there is no reason to fear the wind.", author: "African proverb" },
  { text: "He who conquers himself is the mightiest warrior.", author: "Confucius" },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself.", author: "Marcus Aurelius" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  { text: "Nothing ever comes to one that is worth having except as a result of hard work.", author: "Booker T. Washington" },
  { text: "I am not afraid of storms, for I am learning how to sail my ship.", author: "Louisa May Alcott" },
  { text: "It is never too late to be what you might have been.", author: "George Eliot" },
  { text: "Courage is resistance to fear, mastery of fear — not absence of fear.", author: "Mark Twain" },
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
  { text: "Continuous improvement is better than delayed perfection.", author: "Mark Twain" },
  { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Attitude is a little thing that makes a big difference.", author: "Winston Churchill" },
  { text: "You may have to fight a battle more than once to win it.", author: "Margaret Thatcher" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
  { text: "No one can make you feel inferior without your consent.", author: "Eleanor Roosevelt" },
  { text: "It is hard to fail, but it is worse never to have tried to succeed.", author: "Theodore Roosevelt" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Comparison is the thief of joy.", author: "Theodore Roosevelt" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Adopt the pace of nature: her secret is patience.", author: "Ralph Waldo Emerson" },
  { text: "What you do speaks so loudly that I cannot hear what you say.", author: "Ralph Waldo Emerson" },
  { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll" },
  { text: "The harder the conflict, the greater the triumph.", author: "George Washington" },
  { text: "Genius is 1% inspiration and 99% perspiration.", author: "Thomas Edison" },
  { text: "Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time.", author: "Thomas Edison" },
  { text: "There is no substitute for hard work.", author: "Thomas Edison" },
  { text: "Never give up on a dream just because of the time it will take to accomplish it. The time will pass anyway.", author: "Earl Nightingale" },
  { text: "We become what we think about.", author: "Earl Nightingale" },
  { text: "Whatever the mind of man can conceive and believe, it can achieve.", author: "Napoleon Hill" },
  { text: "Strength and growth come only through continuous effort and struggle.", author: "Napoleon Hill" },
  { text: "Patience, persistence and perspiration make an unbeatable combination for success.", author: "Napoleon Hill" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney" },
  { text: "It's kind of fun to do the impossible.", author: "Walt Disney" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
  { text: "There is no elevator to success. You have to take the stairs.", author: "Zig Ziglar" },
  { text: "People often say that motivation doesn't last. Well, neither does bathing — that's why we recommend it daily.", author: "Zig Ziglar" },
  { text: "If you are not willing to risk the usual, you will have to settle for the ordinary.", author: "Jim Rohn" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Do not pray for an easy life, pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "Long-term consistency beats short-term intensity.", author: "Bruce Lee" },
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { text: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.", author: "Christian D. Larson" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "The price of anything is the amount of life you exchange for it.", author: "Henry David Thoreau" },
  { text: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
  { text: "It's hard to beat a person who never gives up.", author: "Babe Ruth" },
  { text: "Every strike brings me closer to the next home run.", author: "Babe Ruth" },
  { text: "If people knew how hard I had to work to gain my mastery, it would not seem so wonderful at all.", author: "Michelangelo" },
  { text: "The greater danger for most of us lies not in setting our aim too high and falling short, but in setting our aim too low and achieving our mark.", author: "Michelangelo" },
  { text: "Change your life today. Don't gamble on the future, act now, without delay.", author: "Simone de Beauvoir" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Don't live the same year 75 times and call it a life.", author: "Robin Sharma" },
];

// Exercise options per split-day type, so at the gym you pick from a list
// instead of typing. Matched case-insensitively against gym.split[today].type;
// unrecognized day types (custom labels) fall back to a combined list.
const EXERCISE_LIBRARY = {
  push: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Chest Fly', 'Lateral Raise', 'Tricep Pushdown', 'Dips', 'Close-Grip Bench Press', 'Arnold Press', 'Cable Crossover', 'Skull Crushers', 'Push-ups', 'Pec Deck', 'Landmine Press'],
  pull: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Face Pull', 'Bicep Curl', 'Hammer Curl', 'Chin-ups', 'T-Bar Row', 'Shrugs', 'Reverse Fly', 'Preacher Curl', 'Cable Curl'],
  legs: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Walking Lunges', 'Calf Raise', 'Hip Thrust', 'Front Squat', 'Bulgarian Split Squat', 'Hack Squat', 'Goblet Squat', 'Glute Bridge', 'Standing Calf Raise'],
  'full body': ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-ups', 'Kettlebell Swing', "Farmer's Carry", 'Clean and Press', 'Burpees', 'Thrusters', 'Turkish Get-up'],
  rest: [],
};
const ALL_EXERCISES = [...new Set(Object.values(EXERCISE_LIBRARY).flat())];

function getExercisesForType(type) {
  const key = (type || '').trim().toLowerCase();
  if (EXERCISE_LIBRARY[key]) return EXERCISE_LIBRARY[key];
  // Custom/unrecognized day label — offer everything rather than nothing.
  return ALL_EXERCISES;
}

function getDailyQuote(dateStr) {
  // Walk the pool with a prime stride keyed to the day number: every quote
  // appears exactly once before any repeats (full cycle = QUOTES.length
  // days), and consecutive days land far apart in the list. 9973 is prime,
  // so it's coprime with any realistic pool size.
  const day = Math.floor(Date.parse(dateStr + 'T00:00:00Z') / 86400000);
  const idx = ((day * 9973) % QUOTES.length + QUOTES.length) % QUOTES.length;
  return QUOTES[idx];
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

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// A perfectly seamless sine-wave path: for any integer `cycles`, the value
// and slope at x=0 and x=width match exactly, so two copies placed side by
// side and scrolled by exactly one width loop with no visible seam.
function wavePath(width, height, amplitude, cycles, points = 72) {
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
const HERO_WAVE_PATH = wavePath(600, 40, 12, 6);

/** Cold (blue) at progress 0 to hot (red) at progress 1, as an HSL string. */
function heatColor(progress) {
  const hue = 220 - Math.max(0, Math.min(1, progress)) * 220;
  return `hsl(${hue.toFixed(0)}, 85%, 58%)`;
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

// Dashboard-style "glass" card: the panel color shows through at reduced
// opacity over the page's ambient glow (see the root background) with a
// blur behind it, plus a soft glow in the accent color instead of a flat
// border. tint lets a card use --field instead of --panel for its base.
// Stippled dot-cloud texture (radial density fading at the edges), echoing
// the particle-visualization look from the reference dashboard screens.
// Deterministic (seeded PRNG) so it doesn't reshuffle on every re-render.
function DotCloud({ width = 320, height = 150, cols = 24, rows = 11, color = 'var(--accent)' }) {
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

function glassCard(radius, tint = '--panel') {
  return {
    background: `color-mix(in srgb, var(${tint}) 88%, transparent)`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--border)',
    borderRadius: radius,
    boxShadow: '0 4px 24px color-mix(in srgb, var(--accent) 10%, transparent)',
  };
}

function Panel({ title, children, right }) {
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
function Meter({ label, value, max, displayValue, displayMax, accentVar, barVar }) {
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
function NavCard({ icon: Icon, title, subtitle, onClick, divider }) {
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

function BtnPrimary({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-medium px-3 py-2 transition-opacity hover:opacity-90"
      style={{ background: 'var(--accent)', color: 'var(--bg)', ...style }}
    >{children}</button>
  );
}

function Header({ theme, setTheme, tab, setTab, profile, onSwitchProfile, notifsEnabled, onToggleNotifs, realPushArmed }) {
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

function BottomNav({ tab, setTab }) {
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
  const [pickerMode, setPickerMode] = useState('list'); // list | new | unlock | rename | delete | export
  const [pickerTarget, setPickerTarget] = useState(null); // profile name being unlocked
  const importFileRef = useRef(null);
  const [pickerPassword, setPickerPassword] = useState('');
  const [pickerPassword2, setPickerPassword2] = useState('');
  const [pickerError, setPickerError] = useState('');

  // Theme for the "Who's this?" screen, before any profile is open. Lives at
  // the device level (not per-profile, since no profile is picked yet) and
  // doubles as the starting theme for a brand-new profile — so switching it
  // here carries straight through once you're logged in, instead of always
  // resetting to Noir.
  const [pickerTheme, setPickerThemeState] = useState('noir');
  function setPickerTheme(key) {
    setPickerThemeState(key);
    writeDebounced('device:theme', key);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [list, deviceTheme, lastProfile] = await Promise.all([
        loadProfileList(),
        loadKey('device:theme', 'noir'),
        loadKey('device:last-profile', ''),
      ]);
      if (mounted) {
        setProfileList(list);
        setProfileListLoading(false);
        setPickerThemeState(THEMES[deviceTheme] ? deviceTheme : 'noir');
        // Stay signed in: reopen the profile that was open last time on THIS
        // device, instead of asking for the password on every app launch.
        // Tapping "Switch profile" clears this and brings the gate back.
        if (lastProfile && list.some(p => p.name === lastProfile)) {
          setProfile(lastProfile);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Keep the area OUTSIDE the app (iOS status bar, browser toolbar tint,
  // overscroll edges) matched to the active theme — otherwise iOS paints it
  // with the page's default background and it reads as a white strip on top.
  useEffect(() => {
    const active = profile ? (THEMES[theme] || THEMES.noir) : (THEMES[pickerTheme] || THEMES.noir);
    document.documentElement.style.background = active.bg;
    document.body.style.background = active.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', active.bg);
  }, [profile, theme, pickerTheme]);

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
      window.storage.set('device:last-profile', JSON.stringify(entry.name)).catch(() => {});
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
    window.storage.set('device:last-profile', JSON.stringify(trimmed)).catch(() => {});
  }

  // Both rename and delete are gated on the profile's own password — knowing
  // a name on the list must never be enough to take over or destroy it.
  async function passwordMatches(entry, password) {
    const hash = await hashPassword(password, entry.salt);
    return hash !== null && hash === entry.passHash;
  }
  async function confirmRenameProfile() {
    const entry = profileList.find(p => p.name === pickerTarget);
    if (!entry) return;
    const trimmed = newProfileName.trim();
    if (!trimmed) { setPickerError('Enter a new name.'); return; }
    if (trimmed !== entry.name && profileList.some(p => p.name === trimmed)) { setPickerError('That name is taken.'); return; }
    if (!(await passwordMatches(entry, pickerPassword))) { setPickerError('Wrong password.'); return; }
    if (trimmed !== entry.name) {
      // Move every stored key from the old namespace to the new one, raw, so
      // the data survives the rename byte-for-byte.
      const oldPrefix = `p:${entry.name}:`;
      const { keys } = await window.storage.list(oldPrefix);
      for (const k of keys) {
        const item = await window.storage.get(k);
        if (item && item.value !== undefined && item.value !== null) {
          await window.storage.set(`p:${trimmed}:${k.slice(oldPrefix.length)}`, item.value);
        }
        await window.storage.delete(k);
      }
      const next = profileList.map(p => (p.name === entry.name ? { ...p, name: trimmed } : p));
      setProfileList(next);
      saveProfileList(next);
    }
    setPickerMode('list');
    setPickerError('');
  }
  async function confirmDeleteProfile() {
    const entry = profileList.find(p => p.name === pickerTarget);
    if (!entry) return;
    if (!(await passwordMatches(entry, pickerPassword))) { setPickerError('Wrong password.'); return; }
    const { keys } = await window.storage.list(`p:${entry.name}:`);
    for (const k of keys) await window.storage.delete(k);
    const next = profileList.filter(p => p.name !== entry.name);
    setProfileList(next);
    saveProfileList(next);
    window.storage.delete('device:last-profile').catch(() => {});
    setPickerMode('list');
    setPickerError('');
  }

  // Backup / transfer. Browser storage is per-website, so a profile created on
  // one URL doesn't exist on another — and iOS can evict rarely-used sites'
  // storage entirely. Export writes the profile (including its password hash,
  // so the same password keeps guarding it) to a file; import re-creates it on
  // any device or URL. Export is password-gated like rename/delete.
  async function confirmExportProfile() {
    const entry = profileList.find(p => p.name === pickerTarget);
    if (!entry) return;
    if (!(await passwordMatches(entry, pickerPassword))) { setPickerError('Wrong password.'); return; }
    const prefix = `p:${entry.name}:`;
    const { keys } = await window.storage.list(prefix);
    const data = {};
    for (const k of keys) {
      const item = await window.storage.get(k);
      if (item && item.value !== undefined && item.value !== null) data[k.slice(prefix.length)] = item.value;
    }
    const payload = {
      format: 'reborn-profile-v1',
      exportedAt: new Date().toISOString(),
      name: entry.name,
      passHash: entry.passHash,
      salt: entry.salt,
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reborn-${entry.name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setPickerMode('list');
    setPickerError('');
  }
  async function handleImportFile(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.format !== 'reborn-profile-v1' || typeof parsed.name !== 'string'
        || typeof parsed.salt !== 'string' || typeof parsed.data !== 'object' || parsed.data === null) {
        setPickerError('That file is not a REBORN profile backup.');
        return;
      }
      const name = parsed.name.trim();
      if (!name) { setPickerError('The backup has no profile name.'); return; }
      if (profileList.some(p => p.name === name)) {
        setPickerError(`A profile named "${name}" already exists here — rename or delete it first, then import again.`);
        return;
      }
      for (const [k, v] of Object.entries(parsed.data)) {
        if (typeof v === 'string') await window.storage.set(`p:${name}:${k}`, v);
      }
      const next = [...profileList, { name, passHash: typeof parsed.passHash === 'string' ? parsed.passHash : null, salt: parsed.salt }];
      setProfileList(next);
      saveProfileList(next);
      setPickerError('');
    } catch (e) {
      setPickerError('Could not read that file.');
    }
  }

  const [gym, setGymState] = useState({ workouts: [], split: DEFAULT_SPLIT });
  const [routine, setRoutineState] = useState({ habits: DEFAULT_HABITS, logs: {}, schedule: DEFAULT_SCHEDULE });
  const [budget, setBudgetState] = useState({
    transactions: [],
    monthlyBudget: 0,
    weeklyIncome: 0,
    weeklyPlan: DEFAULT_WEEKLY_PLAN,
    bills: DEFAULT_BILLS,
    billPayments: {},
    goal: { name: 'Savings', target: 1000, saved: 0, targetDate: defaultTargetDate() },
  });

  const [notesData, setNotesState] = useState({ notes: [] });
  const [noteText, setNoteText] = useState('');
  const [noteTag, setNoteTag] = useState('General');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  // Weekly recipe rotation and shopping
  const [cooked, setCooked] = useState([]);
  const [picked, setPicked] = useState([]);
  const [copied, setCopied] = useState(false);
  const [openedClaude, setOpenedClaude] = useState(false);
  const [weeklyReady, setWeeklyReady] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartMsg, setCartMsg] = useState('');
  const [cartUrl, setCartUrl] = useState('');
  const [dealsStore, setDealsStore] = useState('');
  const [deals, setDeals] = useState([]);
  const [dealsState, setDealsState] = useState('idle'); // idle | loading | done | empty | error
  const [dealsMsg, setDealsMsg] = useState('');

  // Cheer-up toast shown for 5s after logging today's vibe.
  const [cheer, setCheer] = useState(null);
  const cheerTimer = useRef(null);
  useEffect(() => () => { if (cheerTimer.current) clearTimeout(cheerTimer.current); }, []);

  const [gExercise, setGExercise] = useState('');
  const [gMuscle, setGMuscle] = useState('');
  const [gSets, setGSets] = useState('3');
  const [gReps, setGReps] = useState('8');
  const [gWeight, setGWeight] = useState('');
  const [gDate, setGDate] = useState(todayStr());

  // ---- schedule reminders (browser notifications) ------------------------
  // Foreground notifications always work via the plain Notification API
  // below, but that only fires while this tab is open. If a self-hosted
  // backend (server/) is reachable at this origin — meaning the app was
  // opened via its printed http://host:port/?token=... link — real push
  // takes over instead: a service worker + Web Push that the OS can deliver
  // even with the app fully closed. See push.js and the self-hosted-pwa-
  // toolkit skill for how that's wired.
  const [notifsEnabled, setNotifsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [pushCapable, setPushCapable] = useState(false); // a backend token was found and answered
  const [realPushArmed, setRealPushArmed] = useState(false);
  const firedRef = useRef({}); // { "blockId:date:HH:MM": true } so each block fires once per day
  const splitStripRef = useRef(null); // the Gym tab's horizontal day-selector strip
  useEffect(() => {
    if (tab !== 'gym' || !splitStripRef.current) return;
    const todayIdx = (new Date(todayStr() + 'T00:00:00').getDay() + 6) % 7;
    const el = splitStripRef.current.children[todayIdx];
    if (el) el.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [tab]);

  useEffect(() => {
    bootstrapToken();
    backendAvailable().then(setPushCapable);
  }, []);

  useEffect(() => {
    if (!notifsEnabled || !pushCapable) { setRealPushArmed(false); return; }
    let cancelled = false;
    armRealPush().then((ok) => { if (!cancelled) setRealPushArmed(ok); });
    return () => { cancelled = true; };
  }, [notifsEnabled, pushCapable]);

  useEffect(() => {
    if (!realPushArmed) return;
    const rows = (routine.schedule || [])
      .map((s) => {
        const p = parseTimeLabel(s.time);
        return p ? { id: s.id, time: `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`, label: s.label } : null;
      })
      .filter(Boolean);
    syncSchedule(rows);
  }, [realPushArmed, routine.schedule]);

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
    // Real push already covers this when armed — firing both would double up.
    if (!notifsEnabled || !profile || realPushArmed) return;
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
  }, [notifsEnabled, profile, routine.schedule, realPushArmed]);

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

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [planCategory, setPlanCategory] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [logConfirmed, setLogConfirmed] = useState(false);
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
      const [g, r, b, th, n, cooked, weeklyStore] = await Promise.all([
        loadKey(pKey(profile, 'gym-data'), { workouts: [], split: DEFAULT_SPLIT }),
        loadKey(pKey(profile, 'routine-data'), { habits: DEFAULT_HABITS, logs: {}, schedule: DEFAULT_SCHEDULE, moodLog: {} }),
        loadKey(pKey(profile, 'budget-data'), {
          transactions: [],
          monthlyBudget: 0,
          weeklyIncome: 0,
          weeklyPlan: DEFAULT_WEEKLY_PLAN,
          bills: DEFAULT_BILLS,
          billPayments: {},
          goal: { name: 'Savings', target: 1000, saved: 0, targetDate: defaultTargetDate(), debtAmount: 0, debtCleared: false, weeklySavingsAmount: 0 },
        }),
        // A brand-new profile has no saved theme yet — start it on whatever
        // was showing on the "Who's this?" screen rather than always Noir.
        loadKey(pKey(profile, 'theme'), pickerTheme),
        loadKey(pKey(profile, 'notes-data'), { notes: [] }),
        loadKey(pKey(profile, 'weekly-cooked'), []),
        loadKey(pKey(profile, 'weekly-store'), ''),
      ]);
      if (!n.notes) n.notes = [];

      if (!g.split) g.split = DEFAULT_SPLIT;
      if (!r.schedule) r.schedule = DEFAULT_SCHEDULE;
      if (!r.habits || r.habits.length === 0) r.habits = DEFAULT_HABITS;
      if (!r.moodLog) r.moodLog = {};
      if (!b.weeklyPlan) b.weeklyPlan = DEFAULT_WEEKLY_PLAN;
      b.weeklyPlan = b.weeklyPlan.map(p => (p.done === undefined ? { ...p, done: false } : p));
      if (b.weeklyIncome === undefined) b.weeklyIncome = 0;
      if (!b.bills) b.bills = DEFAULT_BILLS;
      if (!b.billPayments) b.billPayments = {};
      if (!b.goal) b.goal = { name: 'Savings', target: 1000, saved: 0, targetDate: defaultTargetDate(), debtAmount: 0, debtCleared: false };
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
        setBudgetState(b);
        setNotesState(n);
        setCooked(Array.isArray(cooked) ? cooked.filter(n => typeof n === 'number') : []);
        setDealsStore(typeof weeklyStore === 'string' ? weeklyStore : '');
        setThemeState(THEMES[th] ? th : 'noir');
        setWeeklyReady(true);
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
  function updateNotes(next) {
    setNotesState(next);
    writeDebounced(pKey(profile, 'notes-data'), next);
  }
  function addNote() {
    const text = noteText.trim();
    if (!text) return;
    updateNotes({ ...notesData, notes: [{ id: uid(), text, tag: noteTag, pinned: false, createdAt: todayStr() }, ...notesData.notes] });
    setNoteText('');
  }
  function deleteNote(id) {
    updateNotes({ ...notesData, notes: notesData.notes.filter(nt => nt.id !== id) });
  }
  function togglePinNote(id) {
    updateNotes({ ...notesData, notes: notesData.notes.map(nt => nt.id === id ? { ...nt, pinned: !nt.pinned } : nt) });
  }
  function saveNoteEdit() {
    const text = editNoteText.trim();
    if (text) updateNotes({ ...notesData, notes: notesData.notes.map(nt => nt.id === editingNoteId ? { ...nt, text } : nt) });
    setEditingNoteId(null);
  }

  function updateWeekly(next) {
    setCooked(next);
    writeDebounced(pKey(profile, 'weekly-cooked'), next);
  }
  function markCooked() {
    const next = [...new Set([...cooked, ...picked])];
    updateWeekly(next);
    setPicked([]);
  }
  function resetCooked() {
    updateWeekly([]);
    setPicked([]);
  }
  async function copyForClaude() {
    const msg = claudeMessage(BOOK, picked);
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy this and paste it to Claude:', msg);
    }
  }
  async function openInClaude() {
    const msg = claudeMessage(BOOK, picked);
    // Open synchronously, before any await, so mobile Safari's popup blocker
    // doesn't silently eat the tab — same lesson as the Instacart button.
    const win = window.open('https://claude.ai/new?q=' + encodeURIComponent(msg), '_blank');
    if (win) win.opener = null;
    // Best-effort: if the ?q= prefill doesn't take, the text is on the
    // clipboard either way, so pasting it in still works.
    try {
      await navigator.clipboard.writeText(msg);
      setOpenedClaude(true);
      setTimeout(() => setOpenedClaude(false), 3000);
    } catch {
      /* clipboard blocked — the new tab still opened either way */
    }
  }
  async function shareList() {
    const items = buildList(BOOK, picked).map(([item]) => item);
    const text = `Shopping list:\n${items.map(i => `- ${i}`).join('\n')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Shopping list', text });
      } catch {
        // AbortError when the user cancels the share sheet — nothing to do.
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        window.prompt('Copy this:', text);
      }
    }
  }
  async function openInInstacart() {
    if (!picked.length) return;
    setCartBusy(true);
    setCartMsg('');
    setCartUrl('');
    const win = window.open('', '_blank');
    if (win) win.opener = null;
    try {
      const { ok, data } = await callApi('/api/instacart', {
        title: instacartTitle(BOOK, picked),
        line_items: toInstacartLineItems(BOOK, picked),
      });
      if (ok && data?.url) {
        if (win) {
          win.location.href = data.url;
        } else {
          setCartUrl(data.url);
        }
      } else {
        if (win) win.close();
        setCartMsg(data?.message || data?.error || 'Instacart request failed.');
      }
    } catch {
      if (win) win.close();
      setCartMsg('Couldn\'t reach Instacart. Are you online?');
    } finally {
      setCartBusy(false);
    }
  }
  const toggleRecipe = pg => setPicked(p => (p.includes(pg) ? p.filter(x => x !== pg) : [...p, pg]));


  function updateDealsStore(next) {
    setDealsStore(next);
    writeDebounced(pKey(profile, 'weekly-store'), next);
  }
  async function loadDeals() {
    setDealsState('loading');
    setDealsMsg('');
    try {
      const { ok, status, data } = await callApi('/api/deals', { store: dealsStore });
      if (!ok) {
        setDealsState('error');
        setDealsMsg(data?.message || data?.error || `Request failed (${status}).`);
        return;
      }
      if (data?.refused) {
        setDealsState('error');
        setDealsMsg('That search was declined — try a different phrasing for the area, or try again.');
        return;
      }
      const found = Array.isArray(data?.deals) ? data.deals : [];
      setDeals(found);
      if (found.length) {
        setDealsState('done');
      } else if (data?.truncated) {
        setDealsState('error');
        setDealsMsg('The search ran long and didn\'t finish — try again.');
      } else {
        setDealsState('empty');
      }
    } catch {
      setDealsState('error');
      setDealsMsg('Couldn\'t reach the ad. Try again in a moment.');
    }
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
    setCheer(cheerFor(moodIdx, date));
    if (cheerTimer.current) clearTimeout(cheerTimer.current);
    cheerTimer.current = setTimeout(() => setCheer(null), 5000);
  }
  function handleAddHabit() {
    if (!newHabitName.trim()) return;
    addHabit(newHabitName.trim(), newHabitCategory);
    setNewHabitName('');
  }
  // Keeps Today's checklist in step with the Daily schedule: every schedule
  // block with a label gets a matching habit (id 'hb-s-<blockId>') that is
  // renamed with the block and removed with it. Hand-added habits are never
  // touched.
  function syncHabitsToSchedule(habits, schedule) {
    const byBlock = new Map(
      schedule.filter(s => s.label && s.label.trim()).map(s => ['hb-s-' + s.id, s.label.trim()])
    );
    const kept = habits
      .filter(h => !String(h.id).startsWith('hb-s-') || byBlock.has(h.id))
      .map(h => (byBlock.has(h.id) && h.name !== byBlock.get(h.id) ? { ...h, name: byBlock.get(h.id) } : h));
    const present = new Set(kept.map(h => h.id));
    for (const [id, name] of byBlock) {
      if (!present.has(id)) kept.push({ id, name, category: 'personal' });
    }
    return kept;
  }
  function updateScheduleRow(id, field, value) {
    const schedule = routine.schedule.map(s => (s.id === id ? { ...s, [field]: value } : s));
    updateRoutine({ ...routine, schedule, habits: syncHabitsToSchedule(routine.habits, schedule) });
  }
  function addScheduleRow() {
    updateRoutine({ ...routine, schedule: [...routine.schedule, { id: uid(), time: '', label: '' }] });
  }
  function deleteScheduleRow(id) {
    const schedule = routine.schedule.filter(s => s.id !== id);
    updateRoutine({ ...routine, schedule, habits: syncHabitsToSchedule(routine.habits, schedule) });
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
    updateBudget({ ...budget, weeklyPlan: [...budget.weeklyPlan, { id: uid(), category: category.trim(), amount: Number(amount) || 0, done: false }] });
  }
  function deletePlanLine(id) {
    updateBudget({ ...budget, weeklyPlan: budget.weeklyPlan.filter(p => p.id !== id) });
  }
  function togglePlanDone(id) {
    const weeklyPlan = budget.weeklyPlan.map(p => (p.id === id ? { ...p, done: !p.done } : p));
    updateBudget({ ...budget, weeklyPlan });
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
  //
  // BUG FIX: the button gave zero visible feedback on click — nothing on
  // screen changed, so a user had no way to tell it worked and would often
  // click it again "to make sure," silently doubling every transaction each
  // extra click. Now a same-day re-click asks for confirmation instead of
  // logging again automatically, and a successful log shows a brief inline
  // confirmation on the button itself (see logConfirmed state below).
  function logWeeklyPlan() {
    const date = todayStr();
    if (budget.lastLoggedDate === date) {
      const ok = window.confirm("You already logged this week's plan today — log it again? This adds a second set of transactions.");
      if (!ok) return;
    }
    const incomeTx = { id: uid(), date, type: 'income', amount: budget.weeklyIncome, category: 'Paycheck' };
    const expenseTxs = budget.weeklyPlan.map(p => ({ id: uid(), date, type: 'expense', amount: p.amount, category: p.category }));
    const goalNameLower = (budget.goal.name || '').toLowerCase();
    // goalNameLower must be non-empty before the includes() check — an empty
    // string matches every category and would count ALL plan lines as savings.
    const savingsThisWeek = budget.weeklyPlan
      .filter(p => p.category.toLowerCase().includes('saving') || (goalNameLower && p.category.toLowerCase().includes(goalNameLower)))
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
      lastLoggedDate: date,
      goal: {
        ...budget.goal,
        saved: (Number(budget.goal.saved) || 0) + toGoal,
        debtAmount: newDebtRemaining,
        debtCleared: budget.goal.debtCleared || newDebtRemaining === 0 && debtRemaining > 0,
      },
    });
    setLogConfirmed(true);
    setTimeout(() => setLogConfirmed(false), 2500);
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
    const pth = THEMES[pickerTheme] || THEMES.noir;
    const pickerVars = {
      '--bg': pth.bg, '--panel': pth.panel, '--field': pth.field,
      '--border': pth.border, '--text': pth.text, '--dim': pth.dim,
      '--accent': pth.accent, '--accent2': pth.accent2, '--danger': pth.danger,
    };
    const pwInputStyle = { background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--text)' };
    return (
      <div className="min-h-screen flex flex-col" style={{ ...pickerVars, background: 'var(--bg)', color: 'var(--text)', fontFamily: SANS }}>
        <style>{`
          input, select, button { border-radius: ${RADIUS_SM}px; }
        `}</style>

        <div className="relative flex flex-col items-center justify-end overflow-hidden px-4 pb-6" style={{
          minHeight: '38vh',
          paddingTop: 'max(64px, env(safe-area-inset-top))',
          background: `radial-gradient(130% 110% at 50% -25%, color-mix(in srgb, var(--accent) 45%, transparent), transparent 68%)`,
        }}>
          <DotCloud width={420} height={300} cols={30} rows={17} color="color-mix(in srgb, var(--accent) 65%, white)" />
          <div className="relative text-center mb-7" style={{
            fontFamily: DISPLAY, fontSize: 44, fontWeight: 600, letterSpacing: 9, color: 'var(--accent)',
            textShadow: '0 0 32px color-mix(in srgb, var(--accent) 55%, transparent)',
          }}>
            REBORN
          </div>
          <div className="relative flex gap-1.5 overflow-x-auto w-full max-w-sm pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button key={key} onClick={() => setPickerTheme(key)} title={t.label}
                className="text-[10px] uppercase px-3 py-1.5 flex-shrink-0 rounded-full"
                style={{
                  fontFamily: MONO,
                  border: `1px solid ${pickerTheme === key ? 'var(--accent)' : 'var(--border)'}`,
                  background: pickerTheme === key ? 'var(--accent)' : 'color-mix(in srgb, var(--bg) 55%, transparent)',
                  color: pickerTheme === key ? 'var(--bg)' : 'var(--dim)',
                }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full max-w-sm mx-auto px-4 pt-6" style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>
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
                    <div className="space-y-2 mb-4">
                      {profileList.map(p => (
                        <button key={p.name} onClick={() => openUnlock(p.name)}
                          className="w-full text-left px-4 py-3 text-sm flex items-center justify-between"
                          style={glassCard(18, '--panel')}>
                          <span>{p.name}</span>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setPickerMode('new'); setNewProfileName(''); setPickerPassword(''); setPickerPassword2(''); setPickerError(''); }}
                    className="w-full text-sm px-4 py-3 rounded-full"
                    style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                    + New profile
                  </button>
                  <button onClick={() => { setPickerError(''); importFileRef.current && importFileRef.current.click(); }}
                    className="w-full text-xs mt-3" style={dimText}>
                    Import a profile from a backup file
                  </button>
                  <input ref={importFileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files && e.target.files[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
                  {pickerError && <p className="text-xs mt-2 text-center" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
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
              <div className="flex gap-4 mt-5 flex-wrap">
                <button onClick={() => { setNewProfileName(pickerTarget); setPickerPassword(''); setPickerError(''); setPickerMode('rename'); }}
                  className="text-xs" style={dimText}>Rename profile</button>
                <button onClick={() => { setPickerPassword(''); setPickerError(''); setPickerMode('export'); }}
                  className="text-xs" style={dimText}>Export backup</button>
                <button onClick={() => { setPickerPassword(''); setPickerError(''); setPickerMode('delete'); }}
                  className="text-xs" style={{ color: 'var(--danger, #f87171)' }}>Delete profile</button>
              </div>
            </>
          )}

          {pickerMode === 'export' && (
            <>
              <div className="text-2xl font-medium mb-1">Export {pickerTarget}</div>
              <p className="text-xs mb-4" style={dimText}>
                Downloads a backup file with everything in this profile. Open the app on another device or another link, tap "Import a profile from a backup file", and pick this file — your same password still protects it there.
              </p>
              <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmExportProfile(); }}
                placeholder="Password" autoFocus />
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmExportProfile}>Download backup</BtnPrimary>
                <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}

          {pickerMode === 'rename' && (
            <>
              <div className="text-2xl font-medium mb-1">Rename {pickerTarget}</div>
              <p className="text-xs mb-4" style={dimText}>Everything stays exactly as it is — only the name changes. Your password stays the same too.</p>
              <div className="space-y-2 mb-2">
                <input className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="New name" autoFocus />
                <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none" style={pwInputStyle}
                  value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmRenameProfile(); }}
                  placeholder="Password" />
              </div>
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <BtnPrimary onClick={confirmRenameProfile}>Rename</BtnPrimary>
                <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
              </div>
            </>
          )}

          {pickerMode === 'delete' && (
            <>
              <div className="text-2xl font-medium mb-1">Delete {pickerTarget}?</div>
              <p className="text-xs mb-4" style={{ color: 'var(--danger, #f87171)' }}>
                This permanently erases everything in this profile on this device — workouts, habits, budget, all of it. There is no undo.
              </p>
              <input type="password" className="w-full text-sm px-3 py-2 focus:outline-none mb-2" style={pwInputStyle}
                value={pickerPassword} onChange={e => setPickerPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmDeleteProfile(); }}
                placeholder="Password" autoFocus />
              {pickerError && <p className="text-xs mb-2" style={{ color: 'var(--danger, #f87171)' }}>{pickerError}</p>}
              <div className="flex gap-2">
                <button onClick={confirmDeleteProfile} className="text-sm font-medium px-3 py-2"
                  style={{ background: 'var(--danger, #f87171)', color: 'var(--bg)' }}>Delete forever</button>
                <button onClick={() => { setPickerError(''); setPickerMode('unlock'); }} className="text-sm px-3 py-2" style={dimText}>Back</button>
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


  const isAllEmpty = gym.workouts.length === 0 && budget.transactions.length === 0 && Object.keys(routine.logs).length === 0;

  // How full today's three Home stat tiles are on average (0-1) — drives the
  // hero wave's color (cold→hot) and speed (slower→faster) below. Deliberately
  // reuses numbers already on screen rather than tracking a separate streak.
  const heroProgress = [
    Math.min(1, (Number(goal.saved) || 0) / (Number(goal.target) || 1)),
    Math.min(1, habitsToday.length / (routine.habits.length || 1)),
    Math.min(1, workoutsThisWeek / 7),
  ].reduce((a, b) => a + b, 0) / 3;
  const heroWaveColor = heatColor(heroProgress);
  const heroWaveDuration = 8 - heroProgress * 6; // 8s idle → 2s at full progress

  const quote = getDailyQuote(today);

  return (
    <div className="min-h-screen" style={{
      ...rootVars,
      // Ambient glow behind the glass cards — two soft accent-colored blobs
      // fading into the flat page color, so the translucent panels above
      // actually have something to show through.
      background: 'radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 55%), '
        + 'radial-gradient(circle at 100% 15%, color-mix(in srgb, var(--accent2) 12%, transparent), transparent 50%), var(--bg)',
      backgroundAttachment: 'fixed',
      color: 'var(--text)', fontFamily: SANS,
    }}>
      <style>{`
        input, select { color: var(--text); }
        input::placeholder { color: var(--dim); opacity: 0.7; }
        input, select, button { border-radius: ${RADIUS_SM}px; }
        /* Hero wave: the SVG is a 2-tile-wide box (600 units for two 300-wide
           periods); scrolling it by exactly 50% of its own width loops with
           no visible seam. Actual speed is set per-render via the inline
           animation-duration below, driven by today's progress. */
        @keyframes heroWaveScroll { to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .hero-wave { animation: none !important; } }
        /* Cheer toast: quick fade/slide in, hold, fade out — total 5s, matching
           the setTimeout that removes it from the DOM. */
        @keyframes cheerPop {
          0% { opacity: 0; transform: translateY(-10px); }
          6% { opacity: 1; transform: translateY(0); }
          88% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      {cheer && (
        <div className="fixed inset-x-0 z-50 flex justify-center px-6" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)', pointerEvents: 'none' }}>
          <div className="px-5 py-3 text-sm text-center" style={{ ...glassCard(18), color: 'var(--text)', maxWidth: 340, animation: 'cheerPop 5s ease forwards' }}>
            {cheer}
          </div>
        </div>
      )}
      <Header theme={theme} setTheme={setTheme} tab={tab} setTab={setTab} profile={profile} onSwitchProfile={() => { setProfile(null); setPickerMode('list'); window.storage.delete('device:last-profile').catch(() => {}); }} notifsEnabled={notifsEnabled} onToggleNotifs={toggleNotifications} realPushArmed={realPushArmed} />
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-3 pt-2 pb-20 md:pb-8">

        {tab === 'home' && (
          <div>
            <div className="mb-3 p-4 relative overflow-hidden" style={{
              ...glassCard(RADIUS),
              background: 'radial-gradient(circle at 20% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), color-mix(in srgb, var(--panel) 88%, transparent)',
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>{greeting()}</span>
                <span className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, ...dimText }}>{fmtDate(today)}</span>
              </div>
              <div className="text-2xl font-medium mb-1">{profile}</div>
              <p className="text-sm mb-3" style={dimText}>{isAllEmpty ? "Let's get started." : "You're building momentum."}</p>
              <div className="w-full h-10 overflow-hidden">
                <svg
                  viewBox="0 0 600 40"
                  preserveAspectRatio="none"
                  className="hero-wave h-full"
                  style={{ width: '200%', animation: `heroWaveScroll ${heroWaveDuration}s linear infinite` }}
                >
                  <path
                    d={HERO_WAVE_PATH}
                    fill="none"
                    stroke={heroWaveColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.9"
                    style={{ filter: `drop-shadow(0 0 5px ${heroWaveColor})`, transition: 'stroke 1.5s ease' }}
                  />
                </svg>
              </div>
            </div>

            <Panel title="Daily transmission">
              <p className="text-sm italic leading-relaxed mb-1">"{quote.text}"</p>
              <p className="text-xs" style={dimText}>— {quote.author}</p>
            </Panel>

            <div className="grid grid-cols-3 gap-2 mb-3">
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
                <div className="mb-3" style={{ ...glassCard(RADIUS), overflow: 'hidden' }}>
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
                    divider
                  />
                  <NavCard
                    icon={Wallet}
                    title="Budget"
                    subtitle={`${fmtMoney(remainingBills)} in bills left this month`}
                    onClick={() => setTab('budget')}
                    divider
                  />
                  <NavCard
                    icon={ShoppingCart}
                    title="Weekly"
                    subtitle={`${picked.length} recipe${picked.length !== 1 ? 's' : ''} picked · ${cooked.length}/${BOOK.length} cooked`}
                    onClick={() => setTab('week')}
                  />
                </div>
              </div>
              <div>
                {isAllEmpty && (
                  <Panel title="Get started">
                    <p className="text-sm" style={dimText}>Nothing logged yet. Tap a card to add your first gym session, habit check, or expense.</p>
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
              {/* Horizontal day-selector strip — today gets an accent ring
                  and dot, matching the Mon-Sun day cards in the gaming
                  profile reference. Each card still holds the same editable
                  type input the old list rows had. */}
              <div ref={splitStripRef} className="flex gap-2 overflow-x-auto pb-1">
                {gym.split.map((s, i) => (
                  <div
                    key={s.day}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2.5"
                    style={{
                      width: 76,
                      border: `1px solid ${i === todayIdx ? 'var(--accent)' : 'var(--border)'}`,
                      background: i === todayIdx ? 'var(--field)' : 'var(--panel)',
                      borderRadius: RADIUS_SM,
                    }}
                  >
                    <span className="text-xs uppercase tracking-wide" style={{ fontFamily: MONO, color: i === todayIdx ? 'var(--accent)' : 'var(--dim)' }}>{s.day}</span>
                    <span className="w-1.5 h-1.5" style={{ borderRadius: '50%', background: i === todayIdx ? 'var(--accent)' : 'var(--border)' }} />
                    <input
                      className="w-full bg-transparent text-xs text-center focus:outline-none"
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
                          <div key={w.id} className="flex items-center justify-between px-2 py-1.5" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
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
                  <div key={s.id} className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
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
                              <div key={h.id} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
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
                              <span className="inline-block w-3 h-3" style={{ background: on ? 'var(--accent2)' : 'var(--field)', border: on ? 'none' : '1px solid var(--border)', borderRadius: 3 }} />
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
            <div className="p-3" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
              <div className="text-xs uppercase tracking-widest mb-2 truncate" style={{ fontFamily: MONO, ...dimText }}>Per week needed</div>
              <div className="text-xl font-medium" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmtMoney(weeklyNeeded)}</div>
            </div>
            <div className="p-3" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
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
                    <div className="p-3 mt-2" style={{ background: 'var(--field)', border: '1px solid var(--accent2)', borderRadius: RADIUS_SM }}>
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
                    <div className="p-3 mt-1" style={{ background: 'var(--field)', border: '1px solid var(--accent)', borderRadius: RADIUS_SM }}>
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
                  className="flex items-center gap-1 text-xs px-2 py-1"
                  style={{
                    border: `1px solid ${logConfirmed ? 'var(--accent2)' : 'var(--accent)'}`,
                    color: logConfirmed ? 'var(--accent2)' : 'var(--accent)',
                  }}
                >
                  {logConfirmed && <Check size={12} />}
                  {logConfirmed ? 'Logged' : 'Log this week'}
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
                    <button
                      onClick={() => togglePlanDone(p.id)}
                      title={p.done ? 'Done for this week — tap to undo' : 'Mark done for this week'}
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 20, height: 20,
                        background: p.done ? 'var(--accent)' : 'transparent',
                        border: `1.5px solid ${p.done ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: RADIUS_SM,
                      }}
                    >
                      {p.done && <Check size={13} color="#fff" strokeWidth={3} />}
                    </button>
                    <input
                      className="flex-1 text-sm px-2 py-1 focus:outline-none"
                      style={{ ...inputStyle, opacity: p.done ? 0.55 : 1, textDecoration: p.done ? 'line-through' : 'none' }}
                      value={p.category}
                      onChange={e => updatePlanCategory(p.id, e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-20 text-sm px-2 py-1 text-right"
                      style={{ ...inputStyle, opacity: p.done ? 0.55 : 1 }}
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
                  <div className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: `1px solid ${goal.debtCleared ? 'var(--accent2)' : 'var(--border)'}`, borderRadius: RADIUS_SM }}>
                    <span className="text-sm">💳 Debt cleared</span>
                    <span className="text-xs" style={{ fontFamily: MONO, color: goal.debtCleared ? 'var(--accent2)' : 'var(--dim)' }}>{goal.debtCleared ? 'DONE' : 'pending'}</span>
                  </div>
                )}
                {[0.25, 0.5, 0.75, 1].map(frac => {
                  const target = Math.round((Number(goal.target) || 0) * frac);
                  const reached = (Number(goal.saved) || 0) >= target;
                  return (
                    <div key={frac} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: `1px solid ${reached ? 'var(--accent)' : 'var(--border)'}`, borderRadius: RADIUS_SM }}>
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
                      <div key={b.id} className="flex items-center gap-2 px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--accent)', borderRadius: RADIUS_SM }}>
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
                    <div key={b.id} onDoubleClick={() => startEditBill(b)} className="flex items-center justify-between px-2 py-2" style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: RADIUS_SM }}>
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

        {tab === 'week' && (
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
        )}

        {tab === 'notes' && (
          <div className="md:grid md:grid-cols-2 md:gap-2 md:items-start">
          <div>
            <Panel title="New note">
              <textarea
                className="w-full text-sm px-3 py-2 focus:outline-none mb-2 resize-none"
                style={{ ...inputStyle, minHeight: 90 }}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Something about money, your routine, an idea — anything you don't want to forget."
              />
              <div className="flex gap-1.5 flex-wrap mb-3">
                {NOTE_TAGS.map(t => (
                  <button key={t.id} onClick={() => setNoteTag(t.id)}
                    className="text-xs px-2.5 py-1"
                    style={{
                      border: `1px solid ${noteTag === t.id ? t.color : 'var(--border)'}`,
                      background: noteTag === t.id ? `color-mix(in srgb, ${t.color} 18%, transparent)` : 'transparent',
                      color: noteTag === t.id ? t.color : 'var(--dim)',
                    }}>{t.id}</button>
                ))}
              </div>
              <BtnPrimary onClick={addNote}>Save note</BtnPrimary>
            </Panel>
          </div>

          <div>
            <Panel title={`Notes (${notesData.notes.length})`}>
              {notesData.notes.length === 0 ? (
                <p className="text-sm" style={dimText}>Nothing saved yet — jot something down on the left.</p>
              ) : (
                <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
                  {notesData.notes
                    .slice()
                    .sort((a, b) => (b.pinned === true) - (a.pinned === true))
                    .map(nt => (
                      <div key={nt.id} className="px-3 py-2" style={{ background: 'var(--field)', border: `1px solid ${nt.pinned ? 'var(--accent)' : 'var(--border)'}`, borderRadius: RADIUS_SM }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: MONO, color: noteTagColor(nt.tag) }}>
                            {nt.tag} · {fmtDate(nt.createdAt)}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => togglePinNote(nt.id)} title={nt.pinned ? 'Unpin' : 'Pin to top'}>
                              <Pin size={13} color={nt.pinned ? 'var(--accent)' : 'var(--dim)'} fill={nt.pinned ? 'var(--accent)' : 'none'} />
                            </button>
                            <button onClick={() => deleteNote(nt.id)} style={dimText}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {editingNoteId === nt.id ? (
                          <div>
                            <textarea
                              className="w-full text-sm px-2 py-1.5 focus:outline-none mb-1.5 resize-none"
                              style={{ ...inputStyle, minHeight: 60 }}
                              value={editNoteText}
                              onChange={e => setEditNoteText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button onClick={saveNoteEdit} className="text-xs px-2 py-1" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>Save</button>
                              <button onClick={() => setEditingNoteId(null)} className="text-xs px-2 py-1" style={dimText}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingNoteId(nt.id); setEditNoteText(nt.text); }} className="text-sm text-left w-full" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                            {nt.text}
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </Panel>
          </div>
          </div>
        )}

      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
