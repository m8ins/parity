// UI-only regression: synthetic preview, no writes or real account required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const page = await browser.newPage({ locale: 'de-DE', timezoneId: 'Europe/Berlin' });
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3021';
const out = new URL('.', import.meta.url).pathname;
const results = [];
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/rest/v1/**', route => {
  assert.equal(route.request().method(), 'GET', 'No writes during layout verification');
  return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
async function visit(view) {
  await page.goto(`${base}/design/integration?view=${view}`);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
}
async function check(name, width, height, textSize) {
  const dialog = page.getByRole('dialog').last();
  await dialog.waitFor();
  await dialog.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  const geometry = await dialog.evaluate(el => {
    const r = el.getBoundingClientRect(), css = getComputedStyle(el);
    return { x: r.x, y: r.y, width: r.width, height: r.height, radiusTop: css.borderTopLeftRadius, radiusBottom: css.borderBottomLeftRadius, animation: css.animationName, overflow: css.overflowY };
  });
  assert(geometry.x >= -1 && geometry.y >= -1 && geometry.x + geometry.width <= width + 1 && geometry.y + geometry.height <= height + 1, `${name}: outside viewport ${JSON.stringify(geometry)}`);
  if (width < 640) {
    assert.equal(geometry.x, 0, `${name}: flush left`);
    assert.equal(geometry.width, width, `${name}: full width`);
    assert(Math.abs(geometry.y + geometry.height - height) < 1, `${name}: bottom anchored`);
    assert.equal(geometry.radiusBottom, '0px');
  } else {
    assert(Math.abs(geometry.x + geometry.width / 2 - width / 2) < 1, `${name}: centered horizontally`);
    assert(Math.abs(geometry.y + geometry.height / 2 - height / 2) < 1, `${name}: centered vertically`);
  }
  assert.equal(geometry.overflow, 'auto');
  await dialog.evaluate(el => { el.scrollTop = el.scrollHeight; });
  const buttons = dialog.getByRole('button');
  const last = buttons.last();
  await last.scrollIntoViewIfNeeded();
  const bounds = await last.boundingBox();
  assert(bounds.y >= 0 && bounds.y + bounds.height <= height + 1, `${name}: last action reachable`);
  await dialog.evaluate(el => { el.scrollTop = 0; });
  await page.screenshot({ path: `${out}all-${width}-${height}-${textSize}-${name}.png` });
  results.push({ name, viewport: { width, height }, textSize, ...geometry });
}
async function close() {
  const dialog = page.getByRole('dialog').last();
  await dialog.locator('[data-slot=dialog-close]').click();
  await dialog.waitFor({ state: 'hidden' });
}
try {
  for (const [width, height, textSize] of [[390,844,100],[320,568,100],[320,568,200],[1440,1000,100]]) {
    await page.setViewportSize({ width, height });
    await visit('overview');
    await page.evaluate(size => document.documentElement.style.fontSize = `${size}%`, textSize);
    await page.getByRole('button', { name: 'Zähler hinzufügen', exact: true }).click();
    await check('setup', width, height, textSize);
    await page.getByLabel('Name', { exact: true }).fill('Neuer Zähler');
    await page.keyboard.press('Escape');
    await check('setup-discard', width, height, textSize);
    await page.getByRole('button', { name: 'Eingaben verwerfen', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    for (const action of ['Umbenennen', 'Entfernen']) {
      await page.getByRole('button', { name: /verwalten$/ }).first().click();
      await page.getByRole('menuitem', { name: action, exact: true }).click();
      await check(action === 'Umbenennen' ? 'rename' : 'delete', width, height, textSize);
      await close();
    }
    await page.getByRole('button', { name: 'Stand erfassen', exact: true }).first().click();
    await check('reading', width, height, textSize);
    await page.getByLabel(/Neuer Zählerstand/).fill('25000');
    await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await check('reading-discard', width, height, textSize);
    await page.getByRole('button', { name: 'Eingaben verwerfen', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await visit('detail');
    await page.evaluate(size => document.documentElement.style.fontSize = `${size}%`, textSize);
    await page.getByRole('tab', { name: 'Verwalten', exact: true }).click();
    await page.getByRole('button', { name: 'Ende ändern', exact: true }).click();
    await check('period-end', width, height, textSize); await close();
    await page.getByRole('button', { name: 'Abrechnung erfassen', exact: true }).click();
    await check('settlement', width, height, textSize); await close();
    await page.getByRole('button', { name: 'Neuen Zeitraum anlegen', exact: true }).click();
    await check('continuation', width, height, textSize);
    await page.getByRole('button', { name: 'Konditionen prüfen', exact: true }).click();
    await check('continuation-values', width, height, textSize);
    await page.getByRole('button', { name: 'Weiter zur Prüfung', exact: true }).click();
    await check('continuation-review', width, height, textSize);
  }
  // Header account control with an isolated synthetic browser session only.
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'preview@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: expires, role: 'authenticated' })).toString('base64url')}.synthetic`;
  const session = { access_token: token, refresh_token: 'synthetic', token_type: 'bearer', expires_at: expires, expires_in: 3600, user };
  await page.context().addCookies([{ name: 'sb-127-auth-token', value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`, url: base }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await visit('detail');
  await page.getByRole('button', { name: 'Konto öffnen', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Passwort ändern', exact: true }).click();
  await check('profile', 390, 844, 100);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await close();
  await page.getByRole('button', { name: 'Konto öffnen', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Passwort ändern', exact: true }).click();
  await check('profile-reduced-motion', 390, 844, 100);
  assert.equal(results.at(-1).animation, 'none');
  // Simulate keyboard geometry (not a physical keyboard) and viewport panning.
  await page.evaluate(() => {
    Object.defineProperties(window.visualViewport, {
      height: { configurable: true, value: 400 },
      offsetTop: { configurable: true, value: 100 },
    });
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.waitForFunction(() => document.querySelector('[role=dialog]').style.getPropertyValue('--dialog-viewport-height') === '400px');
  const keyboard = await page.getByRole('dialog').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, maxHeight: getComputedStyle(el).maxHeight };
  });
  assert(keyboard.top >= 100 && keyboard.bottom <= 500, 'Sheet fits simulated visual viewport above keyboard');
  results.push({ name: 'simulated-keyboard', ...keyboard });
  assert.deepEqual(errors, []);
  console.log(`Passed ${results.length} shared dialog checks.`);
} finally {
  fs.writeFileSync(`${out}all-dialogs.json`, JSON.stringify({ results, errors }, null, 2) + '\n');
  await browser.close();
}
