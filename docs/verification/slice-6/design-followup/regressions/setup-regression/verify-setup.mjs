import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.dirname(new URL(import.meta.url).pathname);
const captures = fs.mkdtempSync('/private/tmp/parity-setup-');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, locale: 'de-DE', reducedMotion: 'reduce' });
const page = await context.newPage();
const report = { checks: [], screenshots: [], errors: [], requests: [], limitations: 'Synthetic HTTP responses; live persistence, RLS and lost-response verification in separate live-integration/live-browser reports. Chromium, no physical mobile keyboard or screen reader.' };
page.on('pageerror', error => report.errors.push(error.message));
let mode = 'error', release, listFailure = false;
await context.route('**/rest/v1/rpc/setup_meter', async route => {
  report.requests.push(JSON.parse(route.request().postData()));
  if (mode === 'pending') await new Promise(resolve => { release = resolve; });
  await route.fulfill({ status: mode === 'success' ? 200 : 503, contentType: 'application/json', body: mode === 'success' ? JSON.stringify('60000000-0000-4000-8000-000000000001') : JSON.stringify({ message: 'Synthetic network failure' }) });
});
await context.route('**/rest/v1/meters?**', route => route.fulfill({ status: listFailure ? 503 : 200, contentType: 'application/json', body: listFailure ? JSON.stringify({ message: 'Synthetic list failure' }) : '[]' }));
async function open() {
  await page.goto(`${base}/design/integration?view=empty`);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: /Zähler hinzufügen/ }).click();
}
async function top() {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.locator('.meter-setup-dialog').evaluate(el => el.scrollTop = 0);
}
async function shot(name) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: document overflow`);
  if (!await page.getByRole('dialog').count()) {
    await page.screenshot({ path: path.join(captures, `${name}.png`), fullPage: true }); report.screenshots.push(name); return;
  }
  const overflow = await page.locator('[role=dialog]').last().evaluate(dialog => {
    const bounds = dialog.getBoundingClientRect();
    const offenders = [...dialog.querySelectorAll('input,button,label,p,h1,h2,h3,dd,dt')].filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || (el.tagName !== 'INPUT' && el.scrollWidth > el.clientWidth + 2));
    });
    return offenders.map(el => el.textContent || el.getAttribute('aria-label') || el.id);
  });
  assert.deepEqual(overflow, [], `${name}: clipped controls/text`);
  const fragments = await page.locator('[role=dialog]').last().evaluate(dialog => {
    const bounds = dialog.getBoundingClientRect(), bad = [];
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('.sr-only')) continue;
      if (!node.parentElement?.closest('p,label,h1,h2,h3,dt,dd,button')) continue;
      for (const match of node.textContent.matchAll(/\S+/g)) {
        const range = document.createRange(); range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
        for (const rect of range.getClientRects()) if (rect.width && (rect.left < bounds.left + 1 || rect.right > bounds.right - 1)) bad.push(match[0]);
      }
    }
    return bad;
  });
  assert.deepEqual(fragments, [], `${name}: text fragments outside dialog contour`);
  await page.screenshot({ path: path.join(captures, `${name}.png`) });
  report.screenshots.push(name);
}
async function fill(type = 'electricity') {
  await page.getByLabel('Name', { exact: true }).fill(type === 'gas' ? 'Heizung' : 'Wohnung Strom');
  if (type === 'gas') { await page.getByRole('combobox').click(); await page.getByRole('option', { name: 'Gas', exact: true }).click(); }
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByLabel('Anbieter (optional)').fill('Stadtwerke Beispiel');
  await page.getByLabel('Beginn des Abrechnungszeitraums').fill('2025-03-01');
  await page.getByLabel('Ende des Abrechnungszeitraums (optional)').fill('2025-07-01');
  await page.getByLabel('Grundpreis', { exact: true }).fill('12,50');
  await page.getByLabel('Arbeitspreis', { exact: true }).fill('32,456');
  await page.getByLabel('Abschlag', { exact: true }).fill('0');
  if (type === 'gas') await page.getByLabel('Umrechnungsfaktor', { exact: true }).fill('10,756');
}
try {
  await page.goto(`${base}/design/integration?view=empty`);
  await page.getByText('Dein erster Zähler', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(captures, 'desktop-empty.png'), fullPage: true }); report.screenshots.push('desktop-empty');
  await page.getByRole('button', { name: /Zähler hinzufügen/ }).click();
  await shot('desktop-identity');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByText('Bitte einen Namen mit mindestens 2 Zeichen eingeben.').waitFor();
  await page.waitForFunction(() => document.activeElement?.id === 'setup-name');
  await shot('desktop-validation');
  await fill(); await top(); await shot('desktop-period-top'); await page.getByRole('button', { name: 'Weiter', exact: true }).scrollIntoViewIfNeeded(); await shot('desktop-period-bottom');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByLabel('Datum der Anfangsablesung').fill('2025-03-01');
  await page.getByLabel('Anfangszählerstand').fill('12.345,6789');
  await shot('desktop-review');
  mode = 'pending'; await page.getByRole('button', { name: 'Zähler anlegen', exact: true }).dblclick({ delay: 30 });
  await page.getByRole('button', { name: 'Wird gespeichert…', exact: true }).waitFor();
  assert(await page.getByLabel('Anfangszählerstand').isDisabled());
  await shot('desktop-pending'); mode = 'error'; release();
  await page.getByRole('alert').waitFor(); await page.getByRole('button', { name: 'Speicherung prüfen', exact: true }).scrollIntoViewIfNeeded(); await shot('desktop-retry');
  assert.equal(report.requests.length, 1);
  const first = report.requests[0];
  assert.equal(first.p_payload.reading_value, 12345.6789);
  assert.equal(first.p_payload.arbeitspreis, 32.456);
  await page.reload();
  await page.getByRole('button', { name: /Zähler hinzufügen/ }).click();
  await page.getByRole('button', { name: 'Speicherung prüfen', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Anfangszählerstand').inputValue(), '12.345,6789');
  mode = 'success'; await page.getByRole('button', { name: 'Speicherung prüfen', exact: true }).click();
  await page.getByText('Dein Zähler ist eingerichtet', { exact: true }).waitFor();
  assert.deepEqual(report.requests[1], first);
  await shot('desktop-success');
  listFailure = true;
  await page.getByRole('button', { name: 'Zur Übersicht', exact: true }).click();
  await page.getByRole('button', { name: 'Übersicht neu laden', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Zähler hinzufügen/ }).count(), 0);
  assert.equal(await page.getByText('Dein erster Zähler', { exact: true }).count(), 0);
  await shot('desktop-overview-reload-error');
  listFailure = false;
  await page.getByRole('button', { name: 'Übersicht neu laden', exact: true }).click();
  await page.getByRole('button', { name: /Zähler hinzufügen/ }).waitFor();
  report.checks.push('Saved setup with failed overview response: explicit recovery message, setup CTA hidden, successful list retry restores overview');
  report.checks.push('Desktop: empty entry, step validation/focus, arbitrary period, explicit zero, full decimal precision, pending double click lock, retained retry after reload, stable request and explicit success dismissal');
  await page.setViewportSize({ width: 390, height: 844 }); await open();
  await fill('gas'); await top(); await shot('mobile-gas-period-top'); await page.getByRole('button', { name: 'Weiter', exact: true }).scrollIntoViewIfNeeded(); await shot('mobile-gas-period-bottom');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByLabel('Datum der Anfangsablesung').fill('2025-03-01');
  await page.getByLabel('Anfangszählerstand').fill('2345,6789');
  await shot('mobile-gas-review');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Eingaben verwerfen?' }).waitFor();
  await shot('mobile-discard');
  await page.getByRole('button', { name: 'Weiter einrichten', exact: true }).click();
  assert.equal(await page.getByLabel('Anfangszählerstand').inputValue(), '2345,6789');
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  assert.equal(await page.getByLabel('Umrechnungsfaktor').inputValue(), '10,756');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await page.setViewportSize({ width: 320, height: 740 });
  await top();
  await shot('mobile-gas-200percent');
  await page.getByRole('button', { name: 'Weiter', exact: true }).scrollIntoViewIfNeeded();
  await shot('mobile-gas-200percent-bottom');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await top();
  await shot('mobile-review-200percent');
  await page.getByRole('button', { name: 'Zähler anlegen', exact: true }).scrollIntoViewIfNeeded();
  await shot('mobile-review-200percent-bottom');
  await page.evaluate(() => document.documentElement.style.fontSize = '');
  await page.setViewportSize({ width: 390, height: 450 });
  await page.getByRole('button', { name: 'Zähler anlegen', exact: true }).scrollIntoViewIfNeeded();
  await shot('mobile-reduced-height');
  report.checks.push('Mobile gas: explicit factor, m³, preserved back/continue, Escape discard confirmation, 320px + 200% text, reduced-height viewport, reduced motion');
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await browser.close();
  fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
  for (const name of report.screenshots) fs.copyFileSync(path.join(captures, `${name}.png`), path.join(out, 'screenshots', `${name}.png`));
  fs.writeFileSync(path.join(out, 'browser-check.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks, screenshots: report.screenshots.length }));
