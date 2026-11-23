// The app shell: owns all state + storage, then hands each tab what it needs.
// Tabs live in src/tabs/, shared UI in src/components/, plain helpers in src/lib/.
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useDebouncedStorage } from './lib/useDebouncedStorage.js';
import { hashPassword, loadProfileList, pKey, saveProfileList } from './lib/profiles.js';
import { getState as cloudState, verifyAccountPassword } from './sync/cloud.js';
import { defaultTargetDate, getLast7Days, loadKey, todayStr, uid } from './lib/utils.js';
import { DEFAULT_BILLS, DEFAULT_HABITS, DEFAULT_SCHEDULE, DEFAULT_SPLIT, DEFAULT_WEEKLY_PLAN, EXERCISES_BY_MUSCLE, cheerFor, getDailyQuote, getExercisesForType, muscleForExercise } from './lib/constants.js';
import { armRealPush, backendAvailable, bootstrapToken, syncSchedule } from './push';
import { parseTimeLabel } from './lib/ics.js';
import { mergeRemindersIntoHabits, scheduleFromHabits } from './lib/habits.js';
import ProfilePicker from './components/ProfilePicker.jsx';
import { BottomNav, Header } from './components/ui.jsx';
const HomeTab = lazy(() => import('./tabs/HomeTab.jsx'));
const GymTab = lazy(() => import('./tabs/GymTab.jsx'));
const RoutineTab = lazy(() => import('./tabs/RoutineTab.jsx'));
const BudgetTab = lazy(() => import('./tabs/BudgetTab.jsx'));
const NotesTab = lazy(() => import('./tabs/NotesTab.jsx'));

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
        setPickerThemeState(deviceTheme);
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


  function openUnlock(name) {
    setPickerTarget(name);
    setPickerPassword('');
    setPickerError('');
    setPickerMode('unlock');
  }
  // Forgotten-password support: a profile opened (password proven) while
  // signed in is stamped with that account's id. Later, that same account —
  // after re-entering its account password — may set a new profile password.
  // Someone who only creates their OWN account on this phone can't reset
  // your profiles, because they aren't stamped with their id.
  function linkToAccount(name) {
    const user = cloudState().user;
    if (!user) return;
    setProfileList(list => {
      const entry = list.find(p => p.name === name);
      if (!entry || entry.owner === user.id) return list;
      const next = list.map(p => (p.name === name ? { ...p, owner: user.id } : p));
      saveProfileList(next);
      return next;
    });
  }
  async function confirmResetProfilePassword(accountPassword) {
    const entry = profileList.find(p => p.name === pickerTarget);
    if (!entry) return;
    const user = cloudState().user;
    if (!user) { setPickerError('Sign in to your account first (on the previous screen), then try again.'); return; }
    if (entry.owner !== user.id) {
      setPickerError('This profile isn\'t linked to the account you\'re signed in with, so its password can\'t be reset from here. (A profile gets linked the first time you open it while signed in.)');
      return;
    }
    if (!pickerPassword) { setPickerError('Choose a new profile password.'); return; }
    if (pickerPassword !== pickerPassword2) { setPickerError('New passwords don\'t match.'); return; }
    if (!(await verifyAccountPassword(accountPassword))) { setPickerError('That account password is wrong.'); return; }
    const salt = uid();
    const passHash = await hashPassword(pickerPassword, salt);
    const next = profileList.map(p => (p.name === entry.name ? { ...p, salt, passHash } : p));
    setProfileList(next);
    saveProfileList(next);
    setPickerError('');
    setProfile(entry.name);
    window.storage.set('device:last-profile', JSON.stringify(entry.name)).catch(() => {});
  }
  async function confirmUnlock() {
    const entry = profileList.find(p => p.name === pickerTarget);
    if (!entry) return;
    const hash = await hashPassword(pickerPassword, entry.salt);
    if (hash === entry.passHash) {
      linkToAccount(entry.name);
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
    const owner = cloudState().user && cloudState().user.id;
    const entry = owner ? { name: trimmed, passHash, salt, owner } : { name: trimmed, passHash, salt };
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

  // Tapping a muscle-group tag narrows the Exercise list to that muscle and
  // picks its first exercise (unless the current one already fits). Tapping
  // the same tag again clears it and shows every exercise.
  function selectMuscle(mg) {
    if (gMuscle === mg) { setGMuscle(''); return; }
    setGMuscle(mg);
    const list = EXERCISES_BY_MUSCLE[mg] || [];
    if (list.length && !list.includes(gExercise)) fillExercise(list[0]);
  }
  // Choosing an exercise directly fills in its muscle tag when none is set,
  // or switches the tag if the exercise belongs to a different muscle.
  function handleExerciseChange(name) {
    fillExercise(name);
    if (!gMuscle || !(EXERCISES_BY_MUSCLE[gMuscle] || []).includes(name)) setGMuscle(muscleForExercise(name));
  }
  // Selects an exercise and fills sets/reps/weight from your last log of it.
  function fillExercise(name) {
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
  const [newHabitTime, setNewHabitTime] = useState(''); // optional reminder time, "HH:MM"

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [planCategory, setPlanCategory] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [logConfirmed, setLogConfirmed] = useState(false);
  const [addSavingsAmount, setAddSavingsAmount] = useState('');
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
      let [g, r, b, th, n] = await Promise.all([
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
      ]);
      if (!n.notes) n.notes = [];

      if (!g.split) g.split = DEFAULT_SPLIT;
      if (!r.schedule) r.schedule = DEFAULT_SCHEDULE;
      r = mergeRemindersIntoHabits(r);
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
        setThemeState(th);
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

  // Habits and reminders are one list: a habit with a `time` is a reminder.
  // `schedule` is kept as a copy derived from the habits, because the
  // reminder bell, push server and calendar export all read it.
  function withSchedule(r) {
    return { ...r, schedule: scheduleFromHabits(r.habits) };
  }
  function addHabit(name, category, time) {
    const habit = { id: uid(), name, category: category || 'personal' };
    if (time) habit.time = time;
    updateRoutine(withSchedule({ ...routine, habits: [...routine.habits, habit] }));
  }
  function setHabitTime(id, time) {
    const habits = routine.habits.map(h => {
      if (h.id !== id) return h;
      const next = { ...h };
      if (time) next.time = time; else delete next.time;
      return next;
    });
    updateRoutine(withSchedule({ ...routine, habits }));
  }
  function deleteHabit(id) {
    const logs = { ...routine.logs };
    Object.keys(logs).forEach(d => { logs[d] = logs[d].filter(h => h !== id); });
    // Spread the existing routine first so other fields (moodLog) survive.
    updateRoutine(withSchedule({ ...routine, habits: routine.habits.filter(h => h.id !== id), logs }));
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
    addHabit(newHabitName.trim(), newHabitCategory, newHabitTime);
    setNewHabitName('');
    setNewHabitTime('');
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
  // Adds to the running total instead of requiring you to work out and
  // retype the whole new "Saved so far" number by hand each time. Follows
  // the same debt-first rule as logWeeklyPlan: an outstanding debt gets paid
  // down before anything counts toward the savings goal.
  // Savings go straight to the goal. (This used to pay down a debt amount
  // first; that section is no longer on screen, so it would have looked like
  // savings weren't going up.)
  function addToSavings(amountStr) {
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) return;
    updateBudget({ ...budget, goal: { ...budget.goal, saved: (Number(budget.goal.saved) || 0) + amount } });
    setAddSavingsAmount('');
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



  if (!profile) {
    return <ProfilePicker confirmResetProfilePassword={confirmResetProfilePassword} confirmDeleteProfile={confirmDeleteProfile} confirmExportProfile={confirmExportProfile} confirmNewProfile={confirmNewProfile} confirmRenameProfile={confirmRenameProfile} confirmUnlock={confirmUnlock} handleImportFile={handleImportFile} importFileRef={importFileRef} newProfileName={newProfileName} openUnlock={openUnlock} pickerError={pickerError} pickerMode={pickerMode} pickerPassword={pickerPassword} pickerPassword2={pickerPassword2} pickerTarget={pickerTarget} pickerTheme={pickerTheme} profileList={profileList} profileListLoading={profileListLoading} setNewProfileName={setNewProfileName} setPickerError={setPickerError} setPickerMode={setPickerMode} setPickerPassword={setPickerPassword} setPickerPassword2={setPickerPassword2} setPickerTheme={setPickerTheme} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <span className="text-sm" style={{ color: 'var(--dim)' }}>Loading…</span>
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
  // Home's wave scrolls faster as today's progress goes up (8s idle → 2s).
  const heroProgress = [
    Math.min(1, (Number(budget.goal.saved) || 0) / (Number(budget.goal.target) || 1)),
    Math.min(1, (routine.logs[today] || []).length / (routine.habits.length || 1)),
    Math.min(1, new Set(gym.workouts.filter(w => getLast7Days().includes(w.date)).map(w => w.date)).size / 7),
  ].reduce((a, b) => a + b, 0) / 3;
  const heroWaveDuration = 8 - heroProgress * 6;

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

  const quote = getDailyQuote(today);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        /* Home wave: the SVG is two tiles wide; scrolling it by half its width loops seamlessly. */
        @keyframes heroWaveScroll { to { transform: translateX(-50%); } }
        /* Mood toast: fade in, hold, fade out — 5s, matching the timer that removes it. */
        @keyframes cheerPop {
          0% { opacity: 0; transform: translateY(-10px); }
          6% { opacity: 1; transform: translateY(0); }
          88% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      {cheer && (
        <div className="fixed inset-x-0 z-50 flex justify-center px-6" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)', pointerEvents: 'none' }}>
          <div className="px-5 py-3 text-sm text-center" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 6px 24px rgba(0,0,0,.12)', color: 'var(--text)', maxWidth: 340, animation: 'cheerPop 5s ease forwards' }}>
            {cheer}
          </div>
        </div>
      )}
      <Header tab={tab} setTab={setTab} profile={profile} onSwitchProfile={() => { setProfile(null); setPickerMode('list'); window.storage.delete('device:last-profile').catch(() => {}); }} notifsEnabled={notifsEnabled} onToggleNotifs={toggleNotifications} realPushArmed={realPushArmed} />
      <main className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 pt-3 pb-28 md:pb-8">
        {/* Each tab's code downloads the first time you open it (faster start). */}
        <Suspense fallback={<p className="text-sm py-8 text-center" style={{ color: 'var(--dim)' }}>Loading…</p>}>

        {tab === 'home' && (
          <HomeTab goal={goal} gym={gym} habitsToday={habitsToday} heroWaveDuration={heroWaveDuration} isAllEmpty={isAllEmpty} profile={profile} quote={quote} routine={routine} setTab={setTab} today={today} todayIdx={todayIdx} workoutsThisWeek={workoutsThisWeek} />
        )}

        {tab === 'gym' && (
          <GymTab deleteWorkout={deleteWorkout} gDate={gDate} gExercise={gExercise} gMuscle={gMuscle} gReps={gReps} gSets={gSets} gWeight={gWeight} gym={gym} handleAddWorkout={handleAddWorkout} handleExerciseChange={handleExerciseChange} personalBests={personalBests} setGDate={setGDate} selectMuscle={selectMuscle} setGReps={setGReps} setGSets={setGSets} setGWeight={setGWeight} splitStripRef={splitStripRef} todayIdx={todayIdx} updateSplitDay={updateSplitDay} workoutsByDate={workoutsByDate} />
        )}

        {tab === 'routine' && (
          <RoutineTab deleteHabit={deleteHabit} habitsToday={habitsToday} handleAddHabit={handleAddHabit} last7Days={last7Days} newHabitCategory={newHabitCategory} newHabitName={newHabitName} newHabitTime={newHabitTime} routine={routine} setHabitTime={setHabitTime} setMood={setMood} setNewHabitCategory={setNewHabitCategory} setNewHabitName={setNewHabitName} setNewHabitTime={setNewHabitTime} today={today} toggleHabit={toggleHabit} />
        )}

        {tab === 'budget' && (
          <BudgetTab addPlanLine={addPlanLine} addSavingsAmount={addSavingsAmount} addToSavings={addToSavings} budget={budget} deletePlanLine={deletePlanLine} goal={goal} planAmount={planAmount} planCategory={planCategory} setAddSavingsAmount={setAddSavingsAmount} setPlanAmount={setPlanAmount} setPlanCategory={setPlanCategory} setWeeklyIncome={setWeeklyIncome} togglePlanDone={togglePlanDone} updateGoal={updateGoal} updatePlanAmount={updatePlanAmount} updatePlanCategory={updatePlanCategory} weeklyPlanTotal={weeklyPlanTotal} />
        )}

        {tab === 'notes' && (
          <NotesTab addNote={addNote} deleteNote={deleteNote} editNoteText={editNoteText} editingNoteId={editingNoteId} noteTag={noteTag} noteText={noteText} notesData={notesData} saveNoteEdit={saveNoteEdit} setEditNoteText={setEditNoteText} setEditingNoteId={setEditingNoteId} setNoteTag={setNoteTag} setNoteText={setNoteText} togglePinNote={togglePinNote} />
        )}

        </Suspense>
      </main>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
