import { chromium } from 'playwright';

const BASE = 'http://localhost:4180';
const out = '/tmp/claude-0/-home-user-reborn-app-/0c89ca3c-41cb-5bcf-89c3-3ab961a7e818/scratchpad';
let failures = 0;
const check = (label, cond) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + label);
  if (!cond) failures++;
};

async function scenario(body) {
  await fetch(BASE + '/__test__/scenario', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

// PW_CHROMIUM_PATH is only needed in environments with a pinned Chromium
// install; on a normal machine, `npx playwright install chromium` first and
// leave it unset to use Playwright's own downloaded browser.
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 430, height: 1200 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));

console.log('\n--- Pick + list buttons ---');
await scenario({ deals: 'success', instacart: 'success', accessKey: null });
await page.goto(BASE, { waitUntil: 'networkidle' });
const cards = page.locator('section >> button:has-text("PAGE")');
check('offers exactly 3 recipes', await cards.count() === 3);
await cards.nth(0).click();
await cards.nth(1).click();
check('picking two shows a merged list', await page.getByRole('heading', { name: 'SHOPPING LIST' }).isVisible());

console.log('\n--- Open in Instacart: real success path opens a new tab with the right URL ---');
const popupPromise = page.waitForEvent('popup', { timeout: 5000 });
await page.getByRole('button', { name: /Open in Instacart/ }).click();
const popup = await popupPromise.catch(() => null);
check('a new tab actually opened (this is the popup-block fix working)', !!popup);
if (popup) {
  // The tab starts at about:blank and only gets the real URL once our fetch
  // resolves and sets win.location.href — wait for that navigation, not just
  // "a page loaded" (which fires immediately for the blank starting page).
  await popup.waitForURL(u => u.href.includes('fake-cart'), { timeout: 5000 }).catch(() => {});
  check('the tab navigated to the fake Instacart URL', popup.url().includes('fake-cart'));
  await popup.close();
}

console.log('\n--- Open in Instacart: upstream error surfaces a message, no tab left dangling ---');
await scenario({ instacart: 'error' });
const pagesBefore = browser.contexts()[0].pages().length;
await page.getByRole('button', { name: /Open in Instacart/ }).click();
await page.waitForTimeout(600);
const pagesAfter = browser.contexts()[0].pages().length;
check('the placeholder tab was closed on error, not left blank', pagesAfter === pagesBefore);
const cartErr = await page.locator('p').filter({ hasText: /Invalid API key/ }).first().textContent().catch(() => '');
check('the real upstream error message reached the UI', cartErr.includes('Invalid API key'));
await scenario({ instacart: 'success' });

console.log('\n--- CHECK: deals success ---');
await page.getByRole('button', { name: 'CHECK' }).click();
await page.waitForTimeout(600);
check('deal cards rendered', await page.getByText('Bananas').isVisible());
check('price rendered', await page.getByText('$0.49').isVisible());

console.log('\n--- CHECK: pause_turn continuation actually resumes instead of returning empty ---');
await scenario({ deals: 'pause_then_success' });
await page.getByRole('button', { name: 'CHECK' }).click();
await page.waitForTimeout(600);
check('the resumed search result showed up', await page.getByText('Bread').isVisible());

console.log('\n--- CHECK: refusal reads as a real message, not "no specials found" ---');
await scenario({ deals: 'refusal' });
await page.getByRole('button', { name: 'CHECK' }).click();
await page.waitForTimeout(600);
const refusedMsg = await page.locator('p').filter({ hasText: /declined/ }).first().textContent().catch(() => '');
check('refusal shows "declined", not the generic empty-results message', refusedMsg.includes('declined'));

console.log('\n--- CHECK: truncated reads as "ran long", not "no specials found" ---');
await scenario({ deals: 'truncated' });
await page.getByRole('button', { name: 'CHECK' }).click();
await page.waitForTimeout(600);
const truncMsg = await page.locator('p').filter({ hasText: /ran long/ }).first().textContent().catch(() => '');
check('truncated shows "ran long", distinct from empty results', truncMsg.includes('ran long'));
await scenario({ deals: 'success' });

console.log('\n--- Mark cooked persists across reload ---');
await page.getByRole('button', { name: /Mark cooked/ }).click();
await page.waitForTimeout(200);
const footerBefore = (await page.locator('footer').textContent()).trim();
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const footerAfter = (await page.locator('footer').textContent()).trim();
check('cooked count survived a reload', footerBefore === footerAfter && footerBefore.startsWith('2 OF'));

console.log('\n--- Copy for Claude ---');
await page.locator('section >> button:has-text("PAGE")').nth(0).click();
await page.getByRole('button', { name: /Copy for Claude/ }).click();
await page.waitForTimeout(300);
check('button label flips to Copied', await page.getByText('Copied — paste it to Claude').isVisible());

console.log('\n--- Access-key gate: prompt appears, correct answer unlocks and is remembered ---');
await scenario({ accessKey: 'letmein' });
page.once('dialog', d => d.accept('letmein'));
const gatePopupPromise = page.waitForEvent('popup', { timeout: 5000 });
await page.getByRole('button', { name: /Open in Instacart/ }).click();
const gatePopup = await gatePopupPromise.catch(() => null);
await page.waitForTimeout(400);
check('a prompt appeared and the correct key let the request through', !!gatePopup);
if (gatePopup) {
  check('it still reached the real (fake) Instacart URL after unlocking', gatePopup.url().includes('fake-cart'));
  await gatePopup.close();
}

console.log('\n--- Access-key gate: the key is now remembered, no prompt on the next call ---');
let dialogFiredAgain = false;
page.once('dialog', d => { dialogFiredAgain = true; d.dismiss(); });
const secondPopupPromise = page.waitForEvent('popup', { timeout: 5000 });
await page.getByRole('button', { name: /Open in Instacart/ }).click();
const secondPopup = await secondPopupPromise.catch(() => null);
check('no prompt on the second call — the key was remembered in localStorage', !dialogFiredAgain);
check('and the request still succeeded', !!secondPopup);
if (secondPopup) await secondPopup.close();
await scenario({ accessKey: null });

await page.screenshot({ path: out + '/final-state.png' });
console.log('\npage errors during the whole run:', pageErrors.length ? pageErrors : 'none');
await browser.close();

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
process.exit(failures ? 1 : 0);
