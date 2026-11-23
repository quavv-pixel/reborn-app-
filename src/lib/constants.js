// Fonts, themes, defaults, quotes and the exercise library — plain data, no React.
// One font family everywhere (Inter, falling back to the phone's own system
// font). The old monospace / serif / poster fonts are gone; these names stay
// so nothing that imports them breaks.
export const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const MONO = SANS;
export const DISPLAY = SANS;
export const WEEK_DISPLAY = SANS;

// iOS-style shapes: soft rounded corners + a bit more breathing room than the
// original sharp-edged layout, applied globally regardless of which color
// theme is active. RADIUS is for card-level containers (Panel, Meter, the
// grouped nav list); RADIUS_SM matches the global input/select/button rule
// below so small chips, fields, and list rows all read as one consistent shape.
export const RADIUS = 14;
export const RADIUS_SM = 10;

// Colors now live in src/index.css: one natural palette, light + dark.

export const CATEGORIES = [
  { id: 'work', label: 'Work', icon: '⚡', color: '#f59e0b' },
  { id: 'gym', label: 'Gym', icon: '🏋️', color: '#ef4444' },
  { id: 'health', label: 'Health', icon: '🥗', color: '#22c55e' },
  { id: 'finance', label: 'Finance', icon: '💰', color: '#3b82f6' },
  { id: 'personal', label: 'Personal', icon: '🎮', color: '#a855f7' },
  { id: 'sleep', label: 'Sleep', icon: '🌙', color: '#6366f1' },
];
export const MOODS = ['😤', '😕', '😐', '🙂', '🔥'];
export const NOTE_TAGS = [
  { id: 'General', color: '#8A857C' },
  { id: 'Money', color: '#3b82f6' },
  { id: 'Routine', color: '#a855f7' },
  { id: 'Gym', color: '#ef4444' },
  { id: 'Idea', color: '#f59e0b' },
];
export function noteTagColor(tag) {
  return (NOTE_TAGS.find(t => t.id === tag) || NOTE_TAGS[0]).color;
}
export const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'On Fire'];
export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

// Brand-new profiles start completely BLANK — no pre-filled habits,
// schedule, split, or bills. Anyone who opens the link and creates a
// profile builds their own from nothing; nothing here may ever read as
// another person's routine, bills, or numbers.
export const DEFAULT_HABITS = [];

export const DEFAULT_SCHEDULE = [];

export const DEFAULT_SPLIT = [
  { day: 'Mon', type: 'Rest' },
  { day: 'Tue', type: 'Rest' },
  { day: 'Wed', type: 'Rest' },
  { day: 'Thu', type: 'Rest' },
  { day: 'Fri', type: 'Rest' },
  { day: 'Sat', type: 'Rest' },
  { day: 'Sun', type: 'Rest' },
];

export const DEFAULT_WEEKLY_PLAN = [];

// Empty by default (like DEFAULT_WEEKLY_PLAN above) — bills are exactly the
// kind of specific real numbers that must never be pre-filled for a
// stranger's brand-new profile. The "Add bill" form right below the list
// covers onboarding fine without seeding anything.
export const DEFAULT_BILLS = [];

// One pool per mood (matches MOODS order: Rough, Low, Okay, Good, On Fire).
// The line shown is picked from the day's date, so the same mood gets a
// different message tomorrow.
export const CHEER_MESSAGES = [
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

export function cheerFor(moodIdx, dateStr) {
  const pool = CHEER_MESSAGES[moodIdx] || CHEER_MESSAGES[2];
  let h = 0;
  for (const ch of String(dateStr)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

export const QUOTES = [
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
export const EXERCISE_LIBRARY = {
  push: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Chest Fly', 'Lateral Raise', 'Tricep Pushdown', 'Dips', 'Close-Grip Bench Press', 'Arnold Press', 'Cable Crossover', 'Skull Crushers', 'Push-ups', 'Pec Deck', 'Landmine Press'],
  pull: ['Deadlift', 'Pull-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Face Pull', 'Bicep Curl', 'Hammer Curl', 'Chin-ups', 'T-Bar Row', 'Shrugs', 'Reverse Fly', 'Preacher Curl', 'Cable Curl'],
  legs: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Walking Lunges', 'Calf Raise', 'Hip Thrust', 'Front Squat', 'Bulgarian Split Squat', 'Hack Squat', 'Goblet Squat', 'Glute Bridge', 'Standing Calf Raise'],
  'full body': ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-ups', 'Kettlebell Swing', "Farmer's Carry", 'Clean and Press', 'Burpees', 'Thrusters', 'Turkish Get-up'],
  rest: [],
};
// Exercises for each muscle-group tag on the Gym tab. Tapping a tag narrows
// the Exercise list to these and picks the first one. Each exercise is listed
// under the muscle it mainly works (an exercise can appear in more than one).
export const EXERCISES_BY_MUSCLE = {
  Chest: ['Bench Press', 'Incline Dumbbell Press', 'Chest Fly', 'Cable Crossover', 'Pec Deck', 'Push-ups', 'Dips', 'Close-Grip Bench Press'],
  Back: ['Deadlift', 'Pull-ups', 'Chin-ups', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'T-Bar Row', 'Face Pull', 'Reverse Fly', 'Shrugs'],
  Shoulders: ['Overhead Press', 'Arnold Press', 'Lateral Raise', 'Landmine Press', 'Face Pull', 'Reverse Fly', 'Shrugs'],
  Arms: ['Bicep Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Tricep Pushdown', 'Skull Crushers', 'Close-Grip Bench Press', 'Dips'],
  Legs: ['Squat', 'Front Squat', 'Hack Squat', 'Goblet Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Leg Extension', 'Walking Lunges', 'Bulgarian Split Squat', 'Hip Thrust', 'Glute Bridge', 'Calf Raise', 'Standing Calf Raise'],
  Core: ['Plank', 'Crunches', 'Hanging Leg Raise', 'Russian Twist', 'Ab Wheel Rollout', 'Cable Crunch', 'Side Plank', 'Mountain Climbers'],
  Cardio: ['Running', 'Cycling', 'Rowing Machine', 'Jump Rope', 'Stair Climber', 'Elliptical', 'Incline Walk', 'Burpees'],
  'Full Body': EXERCISE_LIBRARY['full body'],
};

export const ALL_EXERCISES = [...new Set([...Object.values(EXERCISE_LIBRARY).flat(), ...Object.values(EXERCISES_BY_MUSCLE).flat()])];

// The muscle tag that fits an exercise best (first group that lists it),
// used to fill in the tag automatically when you pick an exercise first.
export function muscleForExercise(name) {
  for (const [muscle, list] of Object.entries(EXERCISES_BY_MUSCLE)) {
    if (list.includes(name)) return muscle;
  }
  return '';
}

export function getExercisesForType(type) {
  const key = (type || '').trim().toLowerCase();
  if (EXERCISE_LIBRARY[key]) return EXERCISE_LIBRARY[key];
  // Custom/unrecognized day label — offer everything rather than nothing.
  return ALL_EXERCISES;
}

export function getDailyQuote(dateStr) {
  // Walk the pool with a prime stride keyed to the day number: every quote
  // appears exactly once before any repeats (full cycle = QUOTES.length
  // days), and consecutive days land far apart in the list. 9973 is prime,
  // so it's coprime with any realistic pool size.
  const day = Math.floor(Date.parse(dateStr + 'T00:00:00Z') / 86400000);
  const idx = ((day * 9973) % QUOTES.length + QUOTES.length) % QUOTES.length;
  return QUOTES[idx];
}
