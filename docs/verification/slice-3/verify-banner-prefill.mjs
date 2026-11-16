import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, locale: 'de-DE' });
const page = await context.newPage();
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const captures = fs.mkdtempSync('/private/tmp/parity-banner-prefill-');
const out = path.dirname(new URL(import.meta.url).pathname);
const report = { errors: [], colors: [], checks: [], screenshots: [] };
page.on('pageerror', e => report.errors.push(e.message));
async function settle() {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nextjs-portal{display:none}' });
}
async function shot(name) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
  await page.screenshot({ path: path.join(captures, `${name}.png`), fullPage: (await page.getByRole('dialog').count()) === 0 });
  report.screenshots.push(name);
}
for (const [scenario, period, expected] of [['electricity', '', 'due'], ['gas', 'period-previous', 'refund'], ['zero', '', 'neutral'], ['missing', '', 'neutral']]) {
  await page.goto(`${base}/design/integration?view=understand&scenario=${scenario}&period=${period}`);
  await settle();
  const banner = page.locator('.understand-result').first();
  await banner.waitFor();
  assert(await banner.evaluate((el, status) => el.classList.contains(`understand-result-${status}`), expected));
  const colors = await banner.evaluate(el => {
    const style = getComputedStyle(el), ctx = document.createElement('canvas').getContext('2d');
    const rgb = color => { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].slice(0,3); };
    const foreground = rgb(style.color), background = rgb(style.backgroundColor), border = rgb(style.borderTopColor);
    const lum = c => c.map(v => { const s=v/255; return s<=.04045?s/12.92:((s+.055)/1.055)**2.4; }).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    return { foreground, background, border, textContrast: contrast(foreground,background), borderContrast: contrast(border,background) };
  });
  assert(colors.textContrast >= 4.5);
  assert(colors.borderContrast >= 3);
  if (expected === 'refund') assert(colors.foreground[1] > colors.foreground[0] && colors.foreground[1] > colors.foreground[2]);
  if (expected === 'due') assert(colors.foreground[0] > colors.foreground[1]);
  report.colors.push({ scenario, expected, ...colors });
  await shot(`banner-${scenario}`);
}
await context.route('http://127.0.0.1:54321/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
await page.goto(`${base}/design/reading`); await settle();
const card = n => page.locator('[data-meter-id]').nth(n);
await card(0).getByRole('button', { name: 'Stand erfassen' }).click();
let input = page.getByLabel('Neuer Zählerstand (kWh)');
assert.equal(await input.inputValue(), '24.398,2');
assert.equal(await page.locator('.reading-last').count(), 0);
assert(await input.evaluate(el => el.selectionStart === 0 && el.selectionEnd === el.value.length));
await shot('reading-prefill-electricity');
await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
assert.equal(await page.getByRole('dialog').count(), 0);
await card(0).getByRole('button', { name: 'Stand erfassen' }).click();
await input.fill('24.681,7');
await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
await page.getByRole('heading', { name: 'Eingaben verwerfen?' }).waitFor();
await page.getByRole('button', { name: 'Eingaben verwerfen', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await card(1).getByRole('button', { name: 'Stand erfassen' }).click();
input = page.getByLabel('Neuer Zählerstand (m³)');
assert.equal(await input.inputValue(), '8.412,365');
await shot('reading-prefill-gas');
report.checks.push('German last value is actual selected input, no previous-value row; unchanged cancel closes, edits require discard confirmation; electricity and gas independent');
assert.deepEqual(report.errors, []);
await browser.close();
fs.mkdirSync(path.join(out, 'banner-prefill'), { recursive: true });
fs.cpSync(captures, path.join(out, 'banner-prefill/screenshots'), { recursive: true });
fs.writeFileSync(path.join(out, 'banner-prefill/browser-check.json'), JSON.stringify(report, null, 2));
console.log('PASS: four banner states and measured contrast, electricity/gas prefill and discard behavior');
