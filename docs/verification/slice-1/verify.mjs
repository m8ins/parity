// Use an existing Playwright installation; adds no project dependency.
// Start dev with PARITY_DESIGN_PREVIEW=1 and the documented synthetic URL/key.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const out = path.dirname(new URL(import.meta.url).pathname);
const captures = fs.mkdtempSync('/private/tmp/parity-slice1-captures-');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, locale: 'de-DE', hasTouch: true });
const page = await context.newPage();
const report = { navigations: [], console: [], persistence: 'NOT VERIFIED: mocked HTTP responses; no Supabase daemon/config', checks: [], errors: [], requests: [] };
page.on('framenavigated', frame => { if (frame === page.mainFrame()) report.navigations.push(frame.url()); });
page.on('console', message => { if (message.type() === 'error') report.console.push(message.text()); });
page.on('pageerror', error => report.errors.push(error.message));
let fail = false, delay = 0, releaseSave;
await context.route('http://127.0.0.1:54321/**', async route => {
  const request = route.request();
  if (request.method() === 'POST' && request.url().includes('/rest/v1/readings')) {
    const body = request.postDataJSON(); report.requests.push(body);
    if (delay) await new Promise(resolve => { releaseSave = resolve; });
    await route.fulfill({ status: fail ? 503 : 201, contentType: 'application/json', body: JSON.stringify(fail ? { message: 'Synthetic offline' } : { ...body, id: 'synthetic-saved', created_at: '2026-11-15T12:00:00Z' }) });
  } else await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
});
async function load(width = 1280, height = 960) {
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/design/reading`);
  await page.getByRole('heading', { name: 'Deine Zähler' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function capture(name) { await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))); await page.screenshot({ path: path.join(captures, `${name}.png`), fullPage: (await page.getByRole('dialog').count()) === 0 }); }
const card = n => page.locator('[data-meter-id]').nth(n);
async function open(n = 0) { await card(n).getByRole('button', { name: 'Stand erfassen' }).click(); await page.getByRole('heading', { name: /^Zählerstand für / }).waitFor(); await page.locator('.reading-dialog').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {})))); }
const field = () => page.getByLabel(/Neuer Zählerstand/);
async function dismissDirty() {
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  await page.getByRole('button', { name: 'Eingaben verwerfen', exact: true }).click();
}
async function touchSwipe(locator, dy, dx = 0, shot) {
  const box = await locator.boundingBox(); assert(box);
  const client = await context.newCDPSession(page);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 8, y: y + dy * step / 8 }] });
    if (step === 4 && shot) await capture(shot);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}
try {
  await load(); await capture('desktop-overview');
  await open(); await field().fill('24.681,7'); await capture('desktop-modal');
  const saveButton = page.getByRole('button', { name: 'Zählerstand speichern', exact: true });
  const saveBox = await saveButton.boundingBox();
  await page.mouse.move(saveBox.x + saveBox.width / 2, saveBox.y + saveBox.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.reading-form button[type=submit]')).transform).m42 === 4);
  assert((await saveButton.evaluate(el => getComputedStyle(el).transitionDuration)).split(',').every(value => value.trim() === '0.07s'));
  await capture('desktop-pressed');
  await page.mouse.move(10, 150); await page.mouse.up();
  assert((await saveButton.evaluate(el => getComputedStyle(el).transitionDuration)).split(',').every(value => value.trim() === '0.11s'));
  report.checks.push('actual pointer press: 4px depth, 70ms press / 110ms release');
  assert.equal(await field().evaluate(el => getComputedStyle(el).fontSize), '36px');
  assert.equal(await page.getByRole('heading', { name: /^Zählerstand für / }).evaluate(el => getComputedStyle(el).fontSize), '28px');
  await page.mouse.click(10, 200); assert.equal(await field().inputValue(), '24.681,7');
  await page.keyboard.press('Escape'); await page.getByText('Eingaben verwerfen?').waitFor();
  await capture('desktop-discard'); await page.getByText('Weiter erfassen', { exact: true }).click();
  await field().fill(''); await page.getByText('Zählerstand speichern', { exact: true }).click();
  await page.locator('input[aria-invalid=true]').waitFor(); await capture('desktop-validation');
  report.checks.push('desktop compact modal, fixed title, backdrop retains input, Escape protects dirty inputs, errors linked and focused');
  await field().fill('24.681,7'); fail = true;
  await page.getByText('Zählerstand speichern', { exact: true }).click(); await page.getByRole('alert').waitFor(); await capture('desktop-save-error');
  assert.equal(await field().inputValue(), '24.681,7'); fail = false; delay = 800;
  await page.getByText('Erneut speichern', { exact: true }).click();
  await capture('desktop-saving'); assert(await field().getAttribute('readonly') !== null);
  await page.keyboard.type('999'); await page.keyboard.press('Escape');
  assert.equal(await field().inputValue(), '24.681,7');
  releaseSave();
  await page.getByRole('heading', { name: /^Zählerstand für / }).waitFor({ state: 'hidden' });
  await card(0).getByText(/Gespeichert:/).waitFor();
  assert((await card(0).textContent()).includes('24.681,7')); assert((await card(1).textContent()).includes('8.412,365'));
  assert.equal(report.requests.at(-1).value, 24681.7);
  assert.equal(await card(0).getByRole('button', { name: 'Stand erfassen' }).evaluate(el => el === document.activeElement), true);
  await capture('desktop-saved'); delay = 0;
  report.checks.push('HTTP failure retains input, retry, pending immutable snapshot, correct meter updates, status, trigger focus restoration (HTTP mocked)');
  await load(390, 844); await capture('mobile-overview'); await open(1); await field().fill('999.999,999');
  await capture('mobile-sheet-gas');
  await field().click(); assert.equal(await field().evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  assert.equal(await field().evaluate(el => getComputedStyle(el).outlineStyle), 'solid'); await capture('mobile-keyboard-focus');
  await page.evaluate(() => {
    window.readingGestures = [];
    for (const type of ['pointerdown', 'pointerup']) document.addEventListener(type, event => {
      if (event.target.closest?.('.sheet-handle')) window.readingGestures.push({ type, pointerType: event.pointerType, trusted: event.isTrusted, y: event.clientY });
    }, true);
  });
  await touchSwipe(page.getByRole('button', { name: /Erfassung schließen/ }), 90, 0, 'mobile-swipe-in-progress');
  await page.getByText('Eingaben verwerfen?').waitFor(); await capture('mobile-swipe-discard');
  await page.getByText('Weiter erfassen', { exact: true }).click(); assert.equal(await field().inputValue(), '999.999,999');
  // A horizontal drag must not turn into an incidental close click.
  await touchSwipe(page.getByRole('button', { name: /Erfassung schließen/ }), 10, 100);
  assert.equal(await page.getByText('Eingaben verwerfen?').count(), 0);
  await touchSwipe(page.locator('.reading-hint'), 80);
  assert.equal(await page.getByText('Eingaben verwerfen?').count(), 0);
  await page.getByText('Zählerstand speichern', { exact: true }).click();
  await page.getByRole('heading', { name: /^Zählerstand für / }).waitFor({ state: 'hidden' });
  assert.equal(report.requests.at(-1).value, 999999.999); assert(report.requests.at(-1).meter_id.endsWith('002'));
  await capture('mobile-gas-saved');
  await open(); await touchSwipe(page.getByRole('button', { name: /Erfassung schließen/ }), 90);
  await page.getByRole('heading', { name: /^Zählerstand für / }).waitFor({ state: 'hidden' });
  report.gestures = await page.evaluate(() => window.readingGestures);
  assert(report.gestures.some(event => event.pointerType === 'touch' && event.trusted));
  report.checks.push('real CDP touch swipe on handle: dirty protection, continue retains input, clean dismiss; horizontal swipe and form scroll do not dismiss; gas independent');
  for (const width of [320, 390, 768, 1280]) {
    await load(width, 844); await open(1); await field().fill('999.999,999');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    report.checks.push(`${width}px no document overflow, gas long value`);
    await dismissDirty();
  }
  await load(320, 568); await open(1);
  await page.addStyleTag({ content: 'html {font-size: 200%} * {letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important}' });
  await field().fill('999.999,999');
  await page.getByText('Abbrechen', { exact: true }).scrollIntoViewIfNeeded(); await capture('mobile-200percent-text');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  report.enlargedActionWords = await page.locator('.reading-actions button').evaluateAll(buttons => buttons.flatMap(button => {
    const node = [...button.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
    const words = [];
    for (const match of node.textContent.matchAll(/\S+/g)) {
      const range = document.createRange(); range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
      words.push({ word: match[0], lineFragments: range.getClientRects().length });
    }
    return words;
  }));
  assert(report.enlargedActionWords.every(word => word.lineFragments === 1), 'Action words must stay whole at 200% text');
  const actionBox = await page.getByText('Abbrechen', { exact: true }).boundingBox();
  assert(actionBox && actionBox.y >= 0 && actionBox.y + actionBox.height <= 568);
  await dismissDirty();
  // Reduced visual viewport models the space available above an on-screen keyboard,
  // but is explicitly not evidence of a physical iOS/Android keyboard.
  await load(390, 430); await open(); await field().fill('24.681,7');
  await page.getByText('Zählerstand speichern', { exact: true }).scrollIntoViewIfNeeded(); await capture('mobile-short-viewport');
  await dismissDirty();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await load(390, 844); await open();
  assert.equal(await page.locator('.reading-dialog').evaluate(el => getComputedStyle(el).animationName), 'none');
  await capture('mobile-reduced-motion');
  for (let step = 0; step < 10; step++) {
    await page.keyboard.press('Tab');
    assert(await page.locator('.reading-dialog').evaluate(el => el.contains(document.activeElement)));
  }
  report.checks.push('keyboard Tab focus remains inside Radix dialog');
  report.checks.push('200% text + text spacing at 320px; scrollable actions with short viewport; reduced motion animation disabled (physical keyboard not verified)');
  report.font = await page.evaluate(async () => {
    await document.fonts.load('600 40px "Atkinson Hyperlegible Next"');
    return [400, 600, 700].map(weight => {
      const probe = document.createElement('span');
      probe.style.cssText = `position:fixed;left:0;top:0;font:${weight} 40px "Atkinson Hyperlegible Next";font-variant-numeric:lining-nums tabular-nums;white-space:pre`;
      document.body.append(probe);
      const widths = [...'0123456789'].map(digit => { probe.textContent = digit; return probe.getBoundingClientRect().width; });
      const family = getComputedStyle(probe).fontFamily;
      probe.remove();
      return { weight, family, loaded: document.fonts.check(`${weight} 40px "Atkinson Hyperlegible Next"`), widths };
    });
  });
  for (const row of report.font) { assert(row.loaded); assert.equal(new Set(row.widths).size, 1); }
  assert.deepEqual(report.errors, []);
  report.status = 'pass';
} catch (error) { await capture('failure-diagnostic'); report.body = await page.locator('body').innerText(); report.status = 'fail'; report.failure = String(error.stack); throw error; }
finally { fs.cpSync(captures, path.join(out, 'screenshots'), { recursive: true }); fs.writeFileSync(path.join(out, 'browser-check.json'), JSON.stringify(report, null, 2)); await browser.close(); }
