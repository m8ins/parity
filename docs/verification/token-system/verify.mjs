import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.dirname(new URL(import.meta.url).pathname);
const source = fs.readFileSync('src/app/foundation.tokens.css', 'utf8');
const definitions = Object.fromEntries([...source.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(m => [m[1], m[2]]));
function resolve(name, stack = []) {
  assert(definitions[name], `Missing token ${name}`);
  assert(!stack.includes(name), `Cycle ${[...stack, name].join(' → ')}`);
  for (const match of definitions[name].matchAll(/var\((--[\w-]+)\)/g)) resolve(match[1], [...stack, name]);
}
for (const name of Object.keys(definitions)) resolve(name);
for (const [name, value] of Object.entries(definitions)) {
  if (name.startsWith('--cmp-')) assert(/^var\(--sys-color-[\w-]+\)$/.test(value), `${name} must reference a semantic color`);
}
for (const variant of ['default', 'primary', 'secondary', 'ghost', 'danger'])
  for (const channel of ['background', 'content', 'border'])
    for (const state of ['', '-hover', '-active', '-disabled']) assert(definitions[`--cmp-button-${variant}-${channel}${state}`]);
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const report = { graph: 'No missing references or cycles; complete button matrices; components reference semantics', contrasts: [], states: [], screenshots: [], errors: [] };
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, locale: 'de-DE' });
page.on('pageerror', error => report.errors.push(error.message));
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3010';
try {
  await page.goto(`${base}/design/tokens`);
  await page.getByRole('heading', { name: 'Token-System', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => {
    // CSS conversion avoids Canvas fingerprint-protection noise in Brave.
    const conversionProbe = document.createElement('span'); document.body.append(conversionProbe);
    function rgb(color) {
      conversionProbe.style.color = `rgb(from ${color} r g b)`;
      const resolved = getComputedStyle(conversionProbe).color;
      if (!resolved.startsWith('color(srgb ')) throw new Error(`Unexpected conversion: ${resolved}`);
      return resolved.slice(11, -1).split(/\s+/).slice(0, 3).map(value => Math.max(0, Math.min(1, Number(value))) * 255);
    }
    function luminance(values) { return values.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0); }
    function contrast(a, b) { const x = luminance(rgb(a)), y = luminance(rgb(b)); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
    const probe = document.createElement('span'); document.body.append(probe);
    function color(token) { probe.style.color = `var(${token})`; return getComputedStyle(probe).color; }
    const pairs = [];
    for (const role of ['error', 'warning', 'success', 'info']) {
      pairs.push([role, `--sys-color-content-utility-${role}`, `--sys-color-background-utility-${role}`]);
      pairs.push([`${role}-knockout`, '--sys-color-content-on-knockout', `--sys-color-background-utility-${role}-knockout`]);
    }
    for (const role of ['primary', 'secondary', 'tertiary']) for (const surface of ['default', 'surface-1', 'surface-2']) pairs.push([`${role}/${surface}`, `--sys-color-content-${role}`, `--sys-color-background-${surface}`]);
    pairs.push(['form placeholder', '--cmp-form-placeholder', '--cmp-form-background']);
    for (const variant of ['default', 'primary', 'secondary', 'danger']) for (const state of ['', '-hover', '-active', '-disabled']) pairs.push([`button/${variant}${state}`, `--cmp-button-${variant}-content${state}`, `--cmp-button-${variant}-background${state}`]);
    pairs.push(['link visited', '--cmp-link-visited', '--sys-color-background-default']);
    const results = pairs.map(([name, fg, bg]) => ({ name, ratio: contrast(color(fg), color(bg)) }));
    probe.remove(); conversionProbe.remove(); return results;
  });
  report.contrasts = metrics;
  for (const metric of metrics) assert(metric.ratio >= 4.5, `${metric.name}: ${metric.ratio.toFixed(2)} < 4.5`);
  for (const variant of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']) {
    const button = page.locator(`[data-preview="${variant}"]`);
    const tokenVariant = { default: 'primary', outline: 'default', destructive: 'danger' }[variant] || variant;
    for (const state of ['', '-hover', '-active']) {
      await page.mouse.move(0, 0);
      if (state) await button.hover();
      if (state === '-active') await page.mouse.down();
      const result = await button.evaluate((el, { tokenVariant, state }) => {
        const style = getComputedStyle(el), probe = document.createElement('span'); el.append(probe);
        const expected = channel => { probe.style.color = `var(--cmp-${tokenVariant === 'link' ? `link-${({ '': 'default', '-hover': 'hover', '-active': 'active' })[state]}` : `button-${tokenVariant}-${channel}${state}`})`; return getComputedStyle(probe).color; };
        const actual = { color: style.color, background: style.backgroundColor, border: style.borderTopColor };
        const target = { color: expected('content') };
        if (tokenVariant !== 'link') Object.assign(target, { background: expected('background'), border: expected('border') });
        probe.remove(); return { actual, target };
      }, { tokenVariant, state });
      if (state === '-active') await page.mouse.up();
      for (const key of Object.keys(result.target)) assert.equal(result.actual[key], result.target[key], `${variant}${state}/${key}`);
      report.states.push(`${variant}${state || '-normal'}`);
    }
  }
  for (const variant of ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']) {
    const tokenVariant = { default: 'primary', outline: 'default', destructive: 'danger', link: 'ghost' }[variant] || variant;
    const disabled = page.locator(`button[data-variant="${variant}"]:disabled`);
    const state = await disabled.evaluate((el, tokenVariant) => {
      const style = getComputedStyle(el), probe = document.createElement('span'); el.append(probe);
      const expected = channel => { probe.style.color = `var(--cmp-button-${tokenVariant}-${channel}-disabled)`; return getComputedStyle(probe).color; };
      const pairs = [[style.backgroundColor, expected('background')], [style.color, expected('content')], [style.borderTopColor, expected('border')]];
      probe.remove(); return pairs;
    }, tokenVariant);
    for (const [actual, target] of state) assert.equal(actual, target, `${variant}-disabled`);
    report.states.push(`${variant}-disabled`);
  }
  await page.locator('input').first().focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('input').nth(1).evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
  assert.equal(await page.locator('input').nth(1).evaluate(el => getComputedStyle(el).borderTopColor), await page.locator('[data-utility=error]').evaluate(el => getComputedStyle(el).borderTopColor));
  await page.screenshot({ path: path.join(out, 'tokens-1280.png'), fullPage: true }); report.screenshots.push('tokens-1280.png');
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['overview', 'detail', 'login']) {
      await page.goto(`${base}/design/integration?view=${view}`);
      if (view === 'login') await page.getByText('Bei Parity anmelden', { exact: true }).waitFor();
      else await page.locator(view === 'overview' ? '[data-meter-id]' : '.detail-heading h1').first().waitFor();
      if (view !== 'login') await page.waitForFunction(() => document.querySelector('.recharts-area-curve')?.getBoundingClientRect().width > 0);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(out, `${view}-${width}.png`), fullPage: true });
      report.screenshots.push(`${view}-${width}.png`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${view}/${width} overflows`);
    }
  }
  await page.goto(`${base}/design/tokens`); await page.getByRole('heading', { name: 'Token-System', exact: true }).waitFor(); await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(out, 'tokens-390.png'), fullPage: true }); report.screenshots.push('tokens-390.png');
  await page.setViewportSize({ width: 320, height: 844 }); await page.addStyleTag({ content: 'html { font-size: 200% }' });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('[data-preview=default]').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await browser.close(); fs.writeFileSync(path.join(out, 'browser-check.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
