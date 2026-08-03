// Week rotation and list building. Pure functions, no DOM and no storage, so
// `npm test` can import them straight into Node.

// Monday-anchored week counter. 2024-01-01 was itself a Monday, so flooring the
// day difference by 7 from that epoch rolls the number over every Monday.
export function weekIndex(d = new Date()) {
  const epoch = Date.UTC(2024, 0, 1);
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((now - epoch) / (7 * 86400000));
}

// "March 3" for the Monday that starts the week containing `d`.
export function weekLabel(d = new Date()) {
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() - day);
  return mon.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/**
 * The three recipes on offer for a given week.
 *
 * Deterministic: the same week index and cooked list always produce the same
 * three, so reloading the page mid-week doesn't reshuffle what you were
 * looking at. Anything already cooked is skipped until you've cooked
 * everything, at which point the whole book comes back into rotation rather
 * than the page going empty.
 */
export function pickOptions(book, wi, cooked = [], count = 3) {
  if (!book.length) return [];
  const cookedSet = new Set(cooked);
  const pool = book.filter(r => !cookedSet.has(r.p));
  const src = pool.length >= count ? pool : book;
  const out = [];
  for (let i = 0; i < count; i++) {
    const pick = src[(wi * count + i) % src.length];
    // Modular stepping can land on the same recipe twice when the pool is
    // smaller than `count`; only offer distinct recipes.
    if (!out.some(r => r.p === pick.p)) out.push(pick);
  }
  return out;
}

// True once every recipe has been cooked and the rotation has wrapped around.
export function hasWrapped(book, cooked = []) {
  const cookedSet = new Set(cooked);
  return book.length > 0 && book.filter(r => !cookedSet.has(r.p)).length < 3;
}

/**
 * Merge the shopping terms for the chosen recipes into one list.
 *
 * An ingredient shared by two recipes is listed once with a count, so you buy
 * one pack of tortillas instead of reading the same line twice. Sorted by how
 * many recipes need it, then alphabetically.
 */
export function buildList(book, pickedPages = []) {
  const counts = new Map();
  for (const pg of pickedPages) {
    const recipe = book.find(r => r.p === pg);
    if (!recipe) continue;
    for (const item of recipe.items) counts.set(item, (counts.get(item) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// The text the "Copy for Claude" button puts on the clipboard.
export function claudeMessage(book, pickedPages = []) {
  const names = pickedPages
    .map(pg => book.find(r => r.p === pg))
    .filter(Boolean)
    .map(r => `${r.t} (p.${r.p})`);
  const list = buildList(book, pickedPages)
    .map(([item, n]) => (n > 1 ? `${item} x${n}` : item));
  return `Load my Instacart cart at ALDI for this week. Recipes: ${names.join(", ")}. Ingredients: ${list.join(", ")}.`;
}
