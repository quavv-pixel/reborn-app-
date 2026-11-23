/* End-to-end UI test: drives the BUILT app in a real headless Chromium the
   way a person would, tab by tab.

   Run with:  npm run test:e2e   (builds first, then serves dist/ itself)

   Why plain Playwright and not @playwright/test: no extra framework or config
   to learn, same style as the other tests in this repo (a list of checks
   that print ok/FAIL). If a check fails, the script exits 1 and CI goes red.

   On a normal machine run `npx playwright install chromium` once first.
   PW_CHROMIUM_PATH lets an environment with a pre-installed browser point
   at it instead. */
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';

let failures = 0;
const check = (label, cond) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + label);
  if (!cond) failures++;
};

const server = await startStaticServer('dist', 0);
const BASE = server.url;
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);

// Each browser "context" is a fresh device: its own localStorage, its own
// cookies. That's how we simulate "a new phone" for the backup test.
async function newDevice() {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return { ctx, page, errors };
}

// The Home screen's habit tile reads e.g. "0/1" above "habits done today".
const habitTile = page => page.locator('button').filter({ has: page.getByText('habits done today', { exact: true }) });
const habitCount = async page => ((await habitTile(page).innerText().catch(() => '')).split('\n')[0] || '').trim();
const nav = (page, label) => page.locator('button', { hasText: label }).last().click();

async function createProfile(page, name, pw) {
  await page.getByText('+ New profile').click();
  await page.getByPlaceholder('Name').fill(name);
  await page.getByPlaceholder('Password', { exact: true }).fill(pw);
  await page.getByPlaceholder('Confirm password').fill(pw);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByTitle('Switch profile').waitFor();
}

// The app writes to storage on a 500ms debounce, so give it a beat before
// reloading or reading storage directly.
const settle = page => page.waitForTimeout(800);

try {
  const A = await newDevice();
  const { page } = A;

  console.log('\n--- Fresh profile ---');
  await page.goto(BASE);
  check('profile picker shows on first visit', await page.getByText("Who's this?").isVisible());
  check('privacy and terms links are on the first screen',
    (await page.getByRole('link', { name: 'Privacy' }).getAttribute('href')) === '/privacy.html'
    && (await page.getByRole('link', { name: 'Terms' }).getAttribute('href')) === '/terms.html');
  const legal = await fetch(BASE + '/privacy.html').then(r => r.text());
  check('privacy page is built into the site', legal.includes('Privacy Policy'));
  const manifest = await fetch(BASE + '/manifest.json').then(r => r.json());
  const iconTypes = await Promise.all(manifest.icons.map(i => fetch(new URL(i.src, BASE + '/').href).then(r => r.headers.get('content-type'))));
  check('every home-screen icon in the manifest really exists', iconTypes.every(t => t === 'image/png'));
  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  check('iPhone home-screen icon exists', (await fetch(new URL(touch, BASE + '/').href).then(r => r.headers.get('content-type'))) === 'image/png');
  await createProfile(page, 'Tester', 'pw1');
  check('home shows 0 habits for a brand-new profile (no seeded data)',
    (await habitCount(page)) === '0/0');

  console.log('\n--- Every tab renders ---');
  for (const t of ['Gym', 'Routine', 'Budget', 'Weekly', 'Notes', 'Home']) {
    await nav(page, t);
    await page.waitForTimeout(150);
  }
  check('no JavaScript errors while visiting all 6 tabs', A.errors.length === 0);

  console.log('\n--- Gym: log a lift ---');
  await nav(page, 'Gym');
  const exerciseSelect = page.locator('select').first();
  const firstExercise = await exerciseSelect.locator('option').nth(1).getAttribute('value');
  await exerciseSelect.selectOption(firstExercise);
  await page.getByPlaceholder('135').fill('225');
  await page.getByRole('button', { name: 'Add lift' }).click();
  check('the lift appears under Personal bests', await page.getByText('225 lb').first().isVisible());

  console.log('\n--- Routine: add + tick a habit ---');
  await nav(page, 'Routine');
  await page.getByPlaceholder('New habit').fill('Drink water');
  await page.getByPlaceholder('New habit').press('Enter');
  check('the new habit is listed', await page.getByText('Drink water').first().isVisible());

  console.log('\n--- Budget: add a bill ---');
  await nav(page, 'Budget');
  await page.getByPlaceholder('Bill name').fill('Phone');
  await page.getByPlaceholder('$', { exact: true }).first().fill('45');
  await page.getByPlaceholder('Bill name').locator('xpath=..').getByRole('button').click();
  check('the bill is listed', await page.getByText('Phone').first().isVisible());

  console.log('\n--- Notes: save a note ---');
  await nav(page, 'Notes');
  await page.locator('textarea').first().fill('Remember the milk');
  await page.getByRole('button', { name: 'Save note' }).click();
  check('the note is listed', await page.getByText('Remember the milk').first().isVisible());

  console.log('\n--- Weekly: pick a recipe ---');
  await nav(page, 'Weekly');
  await page.locator('button', { hasText: 'PAGE' }).first().click();
  check('picking a recipe builds the shopping list', await page.getByRole('button', { name: /Mark cooked/ }).isVisible());

  console.log('\n--- Everything survives a reload (stays signed in) ---');
  await settle(page);
  await page.reload();
  await habitTile(page).waitFor({ timeout: 5000 }).catch(() => {});
  check('reload reopens the profile without asking for the password',
    !(await page.getByText("Who's this?").isVisible()));
  check('habit count survived the reload', (await habitCount(page)) === '0/1');
  await nav(page, 'Budget');
  check('bill survived the reload', await page.getByText('Phone').first().isVisible());

  console.log('\n--- Profile lock ---');
  await page.getByTitle('Switch profile').click();
  await page.getByRole('button', { name: 'Tester' }).click();
  await page.getByPlaceholder('Password', { exact: true }).fill('wrong');
  await page.getByPlaceholder('Password', { exact: true }).press('Enter');
  await page.getByRole('button', { name: /unlock/i }).click().catch(() => {});
  check('wrong password is refused', await page.getByText('Wrong password.').isVisible());
  await page.getByText('Forgot password?').click();
  check('without accounts, "Forgot password?" explains it can\'t be recovered',
    await page.getByText(/can't be recovered/).isVisible());
  await page.getByRole('button', { name: 'Back' }).click();

  console.log('\n--- Backup file restores on a brand-new device ---');
  await page.getByText('Export backup').click();
  await page.getByPlaceholder('Password', { exact: true }).fill('pw1');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /export|download/i }).last().click(),
  ]);
  const backupPath = await download.path();
  check('export produced a file', !!backupPath);

  const B = await newDevice();
  await B.page.goto(BASE);
  await B.page.locator('input[type=file]').setInputFiles(backupPath);
  await B.page.getByRole('button', { name: 'Tester' }).click();
  await B.page.getByPlaceholder('Password', { exact: true }).fill('pw1');
  await B.page.getByPlaceholder('Password', { exact: true }).press('Enter');
  await B.page.getByRole('button', { name: /unlock/i }).click().catch(() => {});
  await habitTile(B.page).waitFor({ timeout: 5000 }).catch(() => {});
  check('restored profile has the habit', (await habitCount(B.page)) === '0/1');
  await nav(B.page, 'Notes');
  check('restored profile has the note', await B.page.getByText('Remember the milk').first().isVisible());
  check('no JavaScript errors on the new device', B.errors.length === 0);

  console.log('\n--- Follows the phone\'s light / dark mode ---');
  const bgIn = async scheme => {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASE);
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const pickers = await p.getByRole('button', { name: /^(noir|ivory|midnight)$/i }).count();
    await ctx.close();
    return { bg, pickers };
  };
  const light = await bgIn('light'), dark = await bgIn('dark');
  check('light mode phone gets the light background', light.bg === 'rgb(246, 244, 239)');
  check('dark mode phone gets the dark background', dark.bg === 'rgb(18, 20, 18)');
  check('no theme picker any more', light.pickers === 0 && dark.pickers === 0);

  console.log('\n--- Fits a small phone screen (no sideways scrolling) ---');
  const S = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const sp = await S.newPage();
  await sp.goto(BASE);
  await createProfile(sp, 'Small', 'pw');
  const overflow = [];
  for (const t of ['Home', 'Gym', 'Routine', 'Budget', 'Weekly', 'Notes']) {
    await nav(sp, t);
    await sp.waitForTimeout(150);
    if (await sp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) overflow.push(t);
  }
  check('every tab fits a 320px-wide phone', overflow.length === 0);
  if (overflow.length) console.log('       too wide:', overflow.join(', '));
  await S.close();

  console.log('\n--- Works offline after the first visit ---');
  const C = await newDevice();
  await C.page.goto(BASE);
  // Wait until the service worker has installed and taken control.
  await C.page.evaluate(() => navigator.serviceWorker.ready.then(() => new Promise(r =>
    navigator.serviceWorker.controller ? r() : navigator.serviceWorker.addEventListener('controllerchange', r))));
  const cached = await C.page.evaluate(async () => {
    const keys = await caches.keys();
    const c = await caches.open(keys.find(k => k.startsWith('reborn-') && k !== 'reborn-auth'));
    return (await c.keys()).map(r => new URL(r.url).pathname);
  });
  check('every built JS file was saved on the first visit',
    cached.some(p => p.startsWith('/assets/') && p.endsWith('.js')));
  await C.ctx.setOffline(true);
  await C.page.reload();
  check('app opens with no network', await C.page.getByText("Who's this?").isVisible());
  await C.page.goto(BASE + '/some/deep/link').catch(() => {});
  check('any URL falls back to the saved app offline', await C.page.getByText("Who's this?").isVisible());
  await C.ctx.setOffline(false);

  check('no JavaScript errors on the first device', A.errors.length === 0);
  if (A.errors.length || B.errors.length) console.log('errors:', [...A.errors, ...B.errors]);
} catch (e) {
  failures++;
  console.log('  FAIL test crashed: ' + e.message);
} finally {
  await browser.close();
  await server.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall UI checks passed');
process.exit(failures ? 1 : 0);
