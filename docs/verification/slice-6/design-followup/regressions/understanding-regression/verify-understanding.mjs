import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'de-DE', timezoneId: 'Europe/Berlin' });
const page = await context.newPage();
const out = path.dirname(new URL(import.meta.url).pathname);
const captures = fs.mkdtempSync('/private/tmp/parity-understanding-');
const errors = [], shots = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
async function open(scenario, period) {
  await page.goto(`${base}/design/integration?view=understand&scenario=${scenario}${period ? `&period=${period}` : ''}`);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
  await page.getByRole('tab', { name: 'Verstehen', exact: true }).waitFor();
}
async function shot(name) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: document overflow`);
  const bad = await page.locator('.understand, .detail-heading, [role=tablist]').evaluateAll(roots => roots.flatMap(root => [...root.querySelectorAll('p,h1,h2,h3,dt,dd,summary,button')].filter(el => {
    if (el.closest('details:not([open])') && el.tagName !== 'SUMMARY') return false;
    const r = el.getBoundingClientRect();
    return r.width && (r.left < -1 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 2);
  }).map(el => el.textContent)));
  assert.deepEqual(bad, [], `${name}: clipped text/controls`);
  if ((await page.locator('.detail-heading h1').count()) && (await page.viewportSize()).width <= 390) {
    const width = await page.locator('.detail-heading h1').evaluate(el => el.getBoundingClientRect().width);
    assert(width >= (await page.viewportSize()).width * 0.6, `${name}: heading squeezed beside other controls`);
  }
  const axisProblems = await page.locator('.recharts-surface').evaluateAll(svgs => svgs.flatMap(svg => {
    const bounds = svg.getBoundingClientRect();
    const ticks = [...svg.querySelectorAll('.recharts-cartesian-axis-tick-value, .recharts-label')].filter(el => el.getBoundingClientRect().width);
    const outside = ticks.filter(el => { const r = el.getBoundingClientRect(); return r.left < bounds.left - 2 || r.right > bounds.right + 2 || r.top < bounds.top - 2 || r.bottom > bounds.bottom + 2; }).map(el => { const r=el.getBoundingClientRect(); return { text: el.textContent, x:r.x-bounds.x, y:r.y-bounds.y, width:r.width, height:r.height, svgWidth:bounds.width, svgHeight:bounds.height }; });
    const labels = [...svg.querySelectorAll('.recharts-cartesian-axis-tick-value')].map(el => el.getBoundingClientRect()).filter(r => r.width);
    const bottom = Math.max(...labels.map(r => r.top));
    const dates = labels.filter(r => r.top >= bottom - 1).sort((a,b) => a.left-b.left);
    return [...outside, ...dates.slice(1).filter((r,i) => dates[i].right > r.left + 1).map(() => 'overlapping x-axis labels')];
  }));
  assert.deepEqual(axisProblems, [], `${name}: clipped/overlapping SVG axis labels`);
  await page.screenshot({ path: path.join(captures, `${name}.png`), fullPage: true });
  shots.push(name);
}
await open('electricity');
await shot('desktop-default');
assert.equal(await page.locator('.understand details[open]').count(), 0);
await page.getByText('Monatswerte ansehen', { exact: true }).click();
await page.getByText('Wie wird gerechnet?', { exact: true }).click();
await page.getByText('Kosten und Abschlag', { exact: true }).click();
await page.locator('.understand > details > summary').filter({ hasText: /^Ablesungen$/ }).click();
await shot('desktop-electricity');
await open('gas', 'period-previous');
await page.getByText(/Erfasste Schlussabrechnung/).waitFor();
await page.getByText('Monatswerte ansehen', { exact: true }).click();
await page.getByText('Wie wird gerechnet?', { exact: true }).click();
await shot('desktop-gas-completed');
assert((await page.locator('.understand').innerText()).includes('328,00 €'));
// Keyboard period switch, recalculation and selected option.
await page.getByRole('combobox', { name: 'Abrechnungszeitraum' }).focus();
await page.keyboard.press('Space');
await page.getByRole('option').first().waitFor();
await page.getByRole('option').first().focus();
await page.keyboard.press('Enter');
await page.getByRole('heading', { name: /Voraussichtlich.*Erstattung/ }).waitFor();
checks.push('Keyboard period change replaces retrospective settlement with current estimate');
await page.getByRole('tab', { name: 'Verwalten', exact: true }).click();
await page.getByRole('button', { name: 'Details bearbeiten', exact: true }).waitFor();
await shot('desktop-management');
await page.getByRole('tab', { name: 'Konditionen', exact: true }).click();
await shot('desktop-rates');
await page.getByRole('tab', { name: 'Ablesungen', exact: true }).click();
await shot('desktop-readings');
checks.push('Existing management, rate and reading views remain reachable');
for (const scenario of ['none', 'one', 'missing', 'zero', 'short', 'large', 'gas-custom']) {
  await open(scenario);
  if (scenario === 'short') await page.getByText('Monatswerte ansehen', { exact: true }).click();
  await shot(`desktop-${scenario}`);
}
await page.setViewportSize({ width: 390, height: 844 });
for (const scenario of ['electricity', 'gas', 'short', 'large']) {
  await open(scenario, scenario === 'gas' ? 'period-previous' : undefined);
  await shot(`mobile-${scenario}`);
}
await page.setViewportSize({ width: 320, height: 568 });
await open('large');
await page.addStyleTag({ content: 'html{font-size:200%}*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}' });
await shot('mobile-large-200percent');
await open('gas', 'period-previous');
await page.addStyleTag({ content: 'html{font-size:200%}*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}' });
await page.getByText('Monatswerte ansehen', { exact: true }).click();
await page.getByText('Wie wird gerechnet?', { exact: true }).click();
await shot('mobile-gas-200percent');
checks.push('320px, 200% text plus spacing, local table scrolling, no document/text/control overflow');
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${base}/design/integration`);
await page.locator('[data-meter-id]').first().waitFor();
await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
await shot('desktop-cards');
await page.setViewportSize({ width: 390, height: 844 });
await shot('mobile-cards');
await context.close();
await browser.close();
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
for (const name of shots) fs.copyFileSync(path.join(captures, `${name}.png`), path.join(out, 'screenshots', `${name}.png`));
fs.writeFileSync(path.join(out, 'browser-check.json'), JSON.stringify({ errors, checks, shots, synthetic: true }, null, 2));
assert.deepEqual(errors, []);
console.log(`PASS: ${shots.length} captures, ${checks.length} interaction checks, no page errors`);
