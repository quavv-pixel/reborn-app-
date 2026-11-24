/* End-to-end test of accounts + cloud sync: two simulated phones, the real
   @supabase/supabase-js library, and a fake Supabase server (fake-supabase.mjs).

   Run with: npm run test:e2e:sync
   That builds the app into .e2e-build/ with VITE_SUPABASE_URL pointing at the
   fake server, so nothing here ever touches your real Supabase project. */
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.mjs';
import { startFakeSupabase } from './fake-supabase.mjs';

export const FAKE_PORT = 54329;
let failures = 0;
const check = (label, cond) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + label);
  if (!cond) failures++;
};

const fake = await startFakeSupabase(FAKE_PORT);
const site = await startStaticServer('.e2e-build', 0);
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const control = (path, body) => fetch(fake.url + path, { method: 'POST', body: JSON.stringify(body || {}) }).then(r => r.json());
const cloudRows = email => fetch(`${fake.url}/__test__/rows?email=${encodeURIComponent(email)}`).then(r => r.json());

async function newDevice() {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(site.url);
  return { ctx, page, errors };
}
const panel = page => page.getByTestId('account-panel');
// The Home screen's habit tile reads e.g. "0/1" above "habits done today".
// Home's "Jump to → Routine" row reads e.g. "0/1 habits done today".
const habitTile = page => page.getByText(/^\d+\/\d+ habits done today$/);
const habitCount = async page => (((await habitTile(page).innerText().catch(() => '')).match(/^(\d+\/\d+)/) || [])[1] || '');
// Tabs load on demand now, so wait for the "Loading…" placeholder to go.
const nav = async (page, label) => {
  await page.locator('button', { hasText: label }).last().click();
  await page.locator('main').getByText('Loading…').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
};
const pendingUploads = page => page.evaluate(() =>
  Object.values(JSON.parse(localStorage.getItem('ops-log:__sync_meta__') || '{}')).filter(x => x.dirty).length);
const waitSynced = page => page.waitForFunction(() =>
  Object.values(JSON.parse(localStorage.getItem('ops-log:__sync_meta__') || '{}')).every(x => !x.dirty), null, { timeout: 8000 });

async function unlock(page, name, pw) {
  await page.getByRole('button', { name }).click();
  await page.getByPlaceholder('Password', { exact: true }).fill(pw);
  await page.getByPlaceholder('Password', { exact: true }).press('Enter');
  await page.getByRole('button', { name: /unlock/i }).click().catch(() => {});
  await profileOpen(page).waitFor({ timeout: 5000 });
}
// "A profile is open" on ANY tab: the header's Switch-profile button shows.
// (The app reopens on whichever tab you were last on, not always Home.)
const profileOpen = page => page.getByTitle('Switch profile');

const EMAIL = 'tester@example.com';
const PASS = 'correct-horse-9';

try {
  console.log('\n--- Phone A: create an account, then a profile ---');
  const A = await newDevice();
  await panel(A.page).waitFor({ timeout: 5000 }).catch(() => {});
  check('account panel shows when sync is configured', await panel(A.page).isVisible());
  await panel(A.page).getByText('New here? Create an account').click();
  await A.page.getByPlaceholder('Email').fill(EMAIL);
  await A.page.getByPlaceholder(/Account password/).fill(PASS);
  await A.page.getByRole('button', { name: 'Create account' }).click();
  await panel(A.page).getByText(EMAIL).waitFor({ timeout: 5000 });
  check('signed in after creating the account', await panel(A.page).getByText(EMAIL).isVisible());

  await A.page.getByText('+ New profile').click();
  await A.page.getByPlaceholder('Name').fill('Me');
  await A.page.getByPlaceholder('Password', { exact: true }).fill('pw1');
  await A.page.getByPlaceholder('Confirm password').fill('pw1');
  await A.page.getByRole('button', { name: 'Create' }).click();
  await nav(A.page, 'Routine');
  await A.page.getByPlaceholder('New habit').fill('Stretch');
  await A.page.getByPlaceholder('New habit').press('Enter');
  await waitSynced(A.page);
  const rows = await cloudRows(EMAIL);
  check('profile list reached the cloud', rows.some(r => r.key === 'profiles-list' && r.value.includes('"Me"')));
  check('routine data reached the cloud', rows.some(r => r.key === 'p:Me:routine-data' && r.value.includes('Stretch')));
  check('device-only keys stayed on the phone', !rows.some(r => r.key.startsWith('device:')));

  console.log('\n--- Phone B: sign in and get everything ---');
  const B = await newDevice();
  await B.page.getByPlaceholder('Email').fill(EMAIL);
  await B.page.getByPlaceholder(/Account password/).fill('wrong-password');
  await B.page.getByRole('button', { name: 'Sign in' }).click();
  await panel(B.page).getByText(/Invalid login credentials/).waitFor({ timeout: 5000 }).catch(() => {});
  check('a wrong account password is refused with a clear message',
    await panel(B.page).getByText(/Invalid login credentials/).isVisible());
  await B.page.getByPlaceholder(/Account password/).fill(PASS);
  await Promise.all([
    B.page.waitForEvent('load', { timeout: 8000 }), // page reloads once the data arrives
    B.page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  await B.page.getByRole('button', { name: 'Me' }).waitFor({ timeout: 5000 });
  check('the profile from phone A appears on phone B', await B.page.getByRole('button', { name: 'Me' }).isVisible());
  await unlock(B.page, 'Me', 'pw1');
  check('the habit from phone A is on phone B', (await habitCount(B.page)) === '0/1');
  await B.page.waitForTimeout(2500);
  check('just opening the app does not re-upload anything', (await pendingUploads(B.page)) === 0);

  console.log('\n--- Phone B edits, phone A picks it up ---');
  await nav(B.page, 'Notes');
  await B.page.locator('textarea').first().fill('Written on phone B');
  await B.page.getByRole('button', { name: 'Save note' }).click();
  // Wait for the note to actually be IN the cloud — the app saves after a
  // short delay, so "nothing pending" right after the click proves nothing.
  for (let i = 0; i < 40 && !(await cloudRows(EMAIL)).some(r => r.value && r.value.includes('Written on phone B')); i++) {
    await B.page.waitForTimeout(250);
  }
  await A.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); // "app came back to the front"
  await A.page.getByText('Updated from your other device.').waitFor({ timeout: 5000 }).catch(() => {});
  check('phone A shows the "updated on another device" banner',
    await A.page.getByText('Updated from your other device.').isVisible());
  await A.page.getByRole('button', { name: 'Refresh' }).click();
  await A.page.getByTitle('Switch profile').waitFor();
  await nav(A.page, 'Notes');
  check('after Refresh, phone A shows phone B\'s note', await A.page.getByText('Written on phone B').isVisible());

  console.log('\n--- Forgot a profile password: reset with the account password ---');
  await B.page.getByTitle('Switch profile').click();
  await B.page.getByRole('button', { name: 'Me' }).click();
  await B.page.getByText('Forgot password?').click();
  await B.page.getByPlaceholder('Account password').fill('not-my-account-password');
  await B.page.getByPlaceholder('New profile password', { exact: true }).fill('newpw');
  await B.page.getByPlaceholder('Confirm new profile password').fill('newpw');
  await B.page.getByRole('button', { name: 'Reset password' }).click();
  await B.page.getByText('That account password is wrong.').waitFor({ timeout: 5000 }).catch(() => {});
  check('a wrong account password cannot reset a profile', await B.page.getByText('That account password is wrong.').isVisible());
  await B.page.getByPlaceholder('Account password').fill(PASS);
  await B.page.getByRole('button', { name: 'Reset password' }).click();
  await profileOpen(B.page).waitFor({ timeout: 5000 }).catch(() => {});
  check('the right account password resets it and opens the profile', await profileOpen(B.page).isVisible());
  await B.page.getByTitle('Switch profile').click();
  await unlock(B.page, 'Me', 'newpw');
  check('the new profile password works', await profileOpen(B.page).isVisible());

  console.log('\n--- ...but a stranger with their own account cannot ---');
  await B.page.getByTitle('Switch profile').click();
  await panel(B.page).getByRole('button', { name: 'Sign out', exact: true }).click();
  await panel(B.page).getByText('New here? Create an account').click();
  await B.page.getByPlaceholder('Email').fill('stranger@example.com');
  await B.page.getByPlaceholder(/Account password/).fill('stranger-pass-1');
  await B.page.getByRole('button', { name: 'Create account' }).click();
  await panel(B.page).getByText('stranger@example.com').waitFor({ timeout: 5000 });
  await B.page.getByRole('button', { name: 'Me' }).click();
  await B.page.getByText('Forgot password?').click();
  await B.page.getByPlaceholder('Account password').fill('stranger-pass-1');
  await B.page.getByPlaceholder('New profile password', { exact: true }).fill('hijack');
  await B.page.getByPlaceholder('Confirm new profile password').fill('hijack');
  await B.page.getByRole('button', { name: 'Reset password' }).click();
  await B.page.getByText(/isn't linked to the account/).waitFor({ timeout: 5000 }).catch(() => {});
  check('a different account is refused', await B.page.getByText(/isn't linked to the account/).isVisible());

  console.log('\n--- Payments switch: sync stops for unpaid accounts ---');
  await control('/__test__/config', { requirePayment: true });
  await nav(A.page, 'Routine');
  await A.page.getByPlaceholder('New habit').fill('Read');
  await A.page.getByPlaceholder('New habit').press('Enter');
  await A.page.waitForTimeout(3000);
  check('an unpaid upload is refused and kept on the phone', (await pendingUploads(A.page)) > 0);
  check('the refused change is still on the phone', await A.page.getByText('Read').first().isVisible());
  await A.page.getByTitle('Switch profile').click();
  check('account panel explains Pro is needed', await panel(A.page).getByText('Cloud sync is part of REBORN Pro').isVisible());
  const href = await panel(A.page).getByRole('link', { name: 'Upgrade to Pro' }).getAttribute('href');
  check('Upgrade link tells Stripe which account is paying', /client_reference_id=[0-9a-f-]{36}/.test(href) && href.includes('prefilled_email='));

  await control('/__test__/config', { markPaid: EMAIL });
  await panel(A.page).getByRole('button', { name: 'Sync now' }).click();
  await waitSynced(A.page);
  check('once paid, the queued change uploads', (await cloudRows(EMAIL)).some(r => r.value && r.value.includes('"Read"')));
  await panel(A.page).getByText('Pro ✓').waitFor({ timeout: 3000 }).catch(() => {});
  check('account panel shows Pro', await panel(A.page).getByText('Pro ✓').isVisible());

  console.log('\n--- Sign out & clear this device ---');
  A.page.once('dialog', d => d.accept());
  await Promise.all([
    A.page.waitForEvent('load', { timeout: 8000 }),
    panel(A.page).getByRole('button', { name: 'Sign out & clear this device' }).click(),
  ]);
  check('the device is empty afterwards', !(await A.page.getByRole('button', { name: 'Me' }).isVisible()));
  check('the account panel is back to "sign in"', await A.page.getByRole('button', { name: 'Sign in' }).isVisible());
  check('the data is still safe in the cloud', (await cloudRows(EMAIL)).some(r => r.key === 'p:Me:routine-data'));

  console.log('\n--- New account confirmed on ANOTHER device: this one signs itself in ---');
  await control('/__test__/config', { requireConfirm: true, requirePayment: false });
  const PC = await newDevice();
  await panel(PC.page).waitFor({ timeout: 5000 });
  await panel(PC.page).getByText('New here? Create an account').click();
  await PC.page.getByPlaceholder('Email').fill('pc-user@example.com');
  await PC.page.getByPlaceholder(/Account password/).fill('pc-pass-123');
  await PC.page.getByRole('button', { name: 'Create account' }).click();
  await panel(PC.page).getByText('Check your email').waitFor({ timeout: 5000 }).catch(() => {});
  check('after creating an account, the PC shows "Check your email"', await panel(PC.page).getByText('Check your email').isVisible());
  await panel(PC.page).getByRole('button', { name: /I've confirmed/ }).click();
  await panel(PC.page).getByText(/Not confirmed yet/).waitFor({ timeout: 5000 }).catch(() => {});
  check('"I\'ve confirmed" before tapping the link explains it isn\'t confirmed yet', await panel(PC.page).getByText(/Not confirmed yet/).isVisible());
  await control('/__test__/config', { confirm: 'pc-user@example.com' }); // the link was tapped on the phone
  await PC.page.evaluate(() => window.dispatchEvent(new Event('focus'))); // you switch back to the PC tab
  await panel(PC.page).getByText('pc-user@example.com').waitFor({ timeout: 8000 }).catch(() => {});
  check('the PC signs itself in once the email is confirmed anywhere', await panel(PC.page).getByRole('button', { name: 'Sign out', exact: true }).isVisible());
  await control('/__test__/config', { requireConfirm: false });

  const errs = [...A.errors, ...B.errors, ...PC.errors];
  check('no JavaScript errors on either phone', errs.length === 0);
  if (errs.length) console.log(errs);
} catch (e) {
  failures++;
  console.log('  FAIL test crashed: ' + e.message);
} finally {
  await browser.close();
  await site.close();
  await fake.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall sync checks passed');
process.exit(failures ? 1 : 0);
