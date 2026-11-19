// Synthetic UI checks; HTTP responses here do not prove persistence.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
const page = await context.newPage();
const out = path.dirname(new URL(import.meta.url).pathname), captures = fs.mkdtempSync('/private/tmp/parity-billing-');
const report = { synthetic: true, errors: [], checks: [], screenshots: [] };
page.on('pageerror', error => report.errors.push(error.message));
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3005';
let mode = 'success', calls = [], release;
await page.route('**/rest/v1/**', async route => {
  const body = route.request().postDataJSON(); calls.push(body);
  if (mode === 'pending') await new Promise(resolve => { release = resolve; });
  if (mode === 'error') return route.abort('failed');
  if (mode === 'conflict') return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: '40001', message: 'Concurrent change' }) });
  if (route.request().url().includes('save_billing_settlement')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: body.p_period_id, meter_id: 'synthetic', ...body.p_expected_period, settlement_amount: body.p_amount, settlement_date: body.p_date, created_at: '', updated_at: '' }) });
  if (route.request().url().includes('continue_billing_period')) {
    const p = body.p_payload;
    const previous = { ...p.expected_periods.find(item => item.id === p.period_id), meter_id: 'synthetic', period_end: p.period_start };
    const contract = { id: 'synthetic-next', meter_id: 'synthetic', period_start: p.period_start, period_end: p.period_end, provider: p.provider, created_at: '', updated_at: '' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ confirmed: true, previous, contract, rates: [] }) });
  }
  throw new Error(`Unexpected synthetic access: ${route.request().url()}`);
});
async function open(scenario = 'electricity', period) {
  await page.goto(`${base}/design/integration?view=understand&scenario=${scenario}${period ? `&period=${period}` : ''}`);
  await page.evaluate(() => document.fonts.ready); await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
  await page.getByRole('tab', { name: 'Verwalten', exact: true }).click();
}
async function shot(name, bottom = false) {
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) await dialog.evaluate((el, bottom) => { el.scrollTop = bottom ? el.scrollHeight : 0; }, bottom);
  await page.waitForTimeout(180);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: document overflow`);
  const bad = await page.locator((await dialog.count()) ? '[role=dialog]' : '.detail-page').evaluateAll(roots => roots.flatMap(root => [...root.querySelectorAll('p,h2,dt,dd,summary,button,label,input,[role=combobox]')].filter(el => {
    if (el.closest('details:not([open])') && el.tagName !== 'SUMMARY') return false;
    const r = el.getBoundingClientRect(), bounds = root.getBoundingClientRect();
    return r.width && (r.left < bounds.left - 1 || r.right > bounds.right + 1 || (el.tagName !== 'INPUT' && el.scrollWidth > el.clientWidth + 2));
  }).map(el => el.textContent)));
  assert.deepEqual(bad, [], `${name}: clipped text/controls`);
  await page.screenshot({ path: path.join(captures, `${name}.png`), fullPage: !(await dialog.count()) }); report.screenshots.push(name);
}
async function continuation(start = '2026-02-01') {
  await page.getByRole('button', { name: 'Neuer Zeitraum / Wechsel', exact: true }).click();
  await page.getByLabel('Beginn', { exact: true }).fill(start);
  await page.getByRole('button', { name: 'Konditionen prüfen', exact: true }).click();
}
async function review() { await page.getByRole('button', { name: 'Weiter zur Prüfung', exact: true }).click(); }
async function settlement(kind = 'Erstattung') {
  await page.getByRole('button', { name: 'Abrechnung erfassen', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.matches('[role=dialog] h2'));
  const refund = page.getByRole('radio', { name: 'Erstattung', exact: true });
  await refund.focus(); await page.keyboard.press('ArrowRight');
  assert(await page.getByRole('radio', { name: 'Nachzahlung', exact: true }).isChecked());
  await page.getByRole('radio', { name: kind === 'Ausgeglichen' ? 'Erstattung' : kind, exact: true }).check();
  await page.getByLabel('Betrag', { exact: true }).fill(kind === 'Ausgeglichen' ? '0' : '15,37');
  await page.getByLabel('Abrechnungsdatum', { exact: true }).fill('2026-11-01');
}
try {
  await open();
  await page.getByRole('button', { name: 'Neuer Zeitraum / Wechsel', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement?.matches('[role=dialog] h2'));
  assert(await page.getByRole('heading', { name: /Neuer Zeitraum für/ }).evaluate(el => el === document.activeElement));
  await page.keyboard.press('Tab'); assert(await page.getByLabel('Beginn', { exact: true }).evaluate(el => el === document.activeElement));
  await shot('desktop-period-dates');
  await page.getByLabel('Beginn', { exact: true }).fill('2026-02-01');
  await page.getByRole('button', { name: 'Konditionen prüfen', exact: true }).click();
  assert.equal(await page.getByLabel('Arbeitspreis (ct/kWh)', { exact: true }).inputValue(), '30'); await shot('desktop-period-conditions');
  await review(); await shot('desktop-period-review');
  await page.getByText('Ab 1. Apr. 2026', { exact: true }).click(); await shot('desktop-future-conditions');
  await page.getByRole('checkbox').check(); mode = 'pending';
  await page.getByRole('button', { name: 'Zeitraum beginnen', exact: true }).dblclick();
  await page.getByRole('button', { name: 'Wird gespeichert …', exact: true }).waitFor(); await shot('desktop-period-pending');
  assert.equal(calls.length, 1); await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog').count(), 1);
  mode = 'error'; release(); await page.getByRole('button', { name: 'Speicherung prüfen', exact: true }).waitFor(); await shot('desktop-period-error');
  const sent = calls[0]; await page.reload(); await page.getByRole('tab', { name: 'Verwalten', exact: true }).click(); await page.getByRole('button', { name: 'Neuer Zeitraum / Wechsel', exact: true }).click();
  mode = 'success'; await page.getByRole('button', { name: 'Speicherung prüfen', exact: true }).click();
  await page.getByRole('heading', { name: 'Zeitraum angelegt', exact: true }).waitFor(); assert.deepEqual(calls[1], sent); await shot('desktop-period-success');
  await context.clearCookies(); await page.evaluate(() => sessionStorage.clear());
  report.checks.push('Keyboard heading/input focus, dated initial conditions, visible future schedule, pending/double-click/escape, error and exact retry after reload');
  await open(); await continuation('2027-02-01'); await review(); await shot('desktop-gap-review');
  assert((await page.getByText(/Es bleibt eine Lücke/).textContent()).includes('1. Jan. 2027'));
  await open('electricity', 'period-previous'); await page.getByRole('button', { name: 'Neuer Zeitraum / Wechsel', exact: true }).click(); await shot('desktop-existing-successor');
  await open('gas-open'); await page.getByRole('button', { name: 'Abrechnung erfassen', exact: true }).click(); await shot('desktop-settlement-open-end');
  for (const kind of ['Erstattung', 'Nachzahlung', 'Ausgeglichen']) {
    await open(); await settlement(kind); await shot(`desktop-settlement-${kind}`);
    await page.getByRole('button', { name: 'Abrechnung speichern', exact: true }).click();
    await page.getByRole('heading', { name: 'Abrechnung gespeichert', exact: true }).waitFor();
    const amount = calls.at(-1).p_amount; assert.equal(Math.sign(amount), { Erstattung: 1, Nachzahlung: -1, Ausgeglichen: 0 }[kind]);
    await page.getByRole('button', { name: 'Fertig', exact: true }).click();
    await page.getByRole('tab', { name: 'Verstehen', exact: true }).click(); await shot(`desktop-outcome-${kind}`);
  }
  report.checks.push('Confirmed gap and unchanged old end, existing successor, open-end prerequisite, positive/negative/zero actual results and immediate overview update');
  await open(); await settlement(); mode = 'conflict'; await page.getByRole('button', { name: 'Abrechnung speichern', exact: true }).click(); await page.getByRole('button', { name: 'Aktuellen Stand laden', exact: true }).waitFor(); await shot('desktop-settlement-conflict'); mode = 'success';
  await page.setViewportSize({ width: 390, height: 844 });
  await open('gas'); await continuation(); await shot('mobile-gas-conditions'); await review(); await shot('mobile-gas-review');
  await open('gas'); await settlement('Nachzahlung'); await shot('mobile-settlement');
  await page.setViewportSize({ width: 320, height: 760 });
  await open('large'); await page.addStyleTag({ content: 'html{font-size:200%} *{letter-spacing:.12em!important;word-spacing:.16em!important} p{line-height:1.5!important}' });
  await continuation(); await shot('mobile-200percent-conditions-top'); await shot('mobile-200percent-conditions-bottom', true);
  await review(); await shot('mobile-200percent-review-top'); await shot('mobile-200percent-review-bottom', true);
  await open('large'); await page.addStyleTag({ content: 'html{font-size:200%} *{letter-spacing:.12em!important;word-spacing:.16em!important} p{line-height:1.5!important}' });
  await settlement(); await shot('mobile-200percent-settlement-top'); await shot('mobile-200percent-settlement-bottom', true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open('gas'); await continuation(); await shot('mobile-reduced-motion');
  const duration = await page.getByRole('dialog').evaluate(el => getComputedStyle(el).animationDuration); assert(['0s', '0.01ms', '1e-05s'].includes(duration));
  report.checks.push('Mobile gas, long names and full numeric precision, 320px/200% text plus text spacing, reachable actions and reduced motion');
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close(); fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true }); fs.cpSync(captures, path.join(out, 'screenshots'), { recursive: true });
  fs.writeFileSync(path.join(out, 'browser-check.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
