import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.dirname(new URL(import.meta.url).pathname);
const source = fs.readFileSync('src/app/foundation.tokens.css', 'utf8');
const names = [...source.matchAll(/^\s*(--(?:ref-color|sys-color|cmp)-[\w-]+):/gm)].map(m => m[1]);
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const report = { palette: [], before: [], beforeSource: 'Optional raw CSS snapshot, injected without build transforms', passed: false };
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3010';
const inspect = async () => page.evaluate(names => {
  const probe = document.createElement('span'); document.body.append(probe);
  const output = names.map(name => {
    probe.style.color = `oklch(from var(${name}) l c h / alpha)`;
    const oklch = getComputedStyle(probe).color;
    probe.style.color = `rgb(from var(${name}) r g b / alpha)`;
    const srgb = getComputedStyle(probe).color;
    const values = srgb.slice(11, -1).split(/[\s/]+/).filter(Boolean).map(Number);
    const hex = '#' + values.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    return { name, oklch, hex, opacity: values[3] ?? 1 };
  });
  probe.remove(); return output;
}, names);
try {
  await page.goto(`${base}/design/tokens`);
  await page.getByRole('heading', { name: 'Token-System', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  report.palette = await inspect();
  for (const name of ['background-disabled', 'background-highlight', 'border-weak']) {
    const token = report.palette.find(t => t.name === `--sys-color-${name}`);
    const parts = token.oklch.slice(6, -1).split(' ');
    const [lightness, chroma, hue] = parts.map(Number);
    // CSS serializes powerless hues as none at very low chroma.
    assert(lightness > .7); assert(chroma <= .0081);
    assert(parts[2] === 'none' || Math.abs(hue - 104.574367) < .1);
  }
  for (const name of ['content-primary', 'content-secondary', 'content-tertiary', 'content-disabled']) {
    const token = report.palette.find(t => t.name === `--sys-color-${name}`);
    const parts = token.oklch.slice(6, -1).split(' ');
    assert(parts[2] === 'none' && Number(parts[1]) <= .02 || Math.abs(Number(parts[2]) - 264) < .1);
  }
  for (const [role, hue] of [['error', 26], ['warning', 75], ['success', 148], ['info', 255]]) {
    for (const suffix of ['', '-knockout']) {
      const token = report.palette.find(t => t.name === `--sys-color-background-utility-${role}${suffix}`);
      assert(Math.abs(Number(token.oklch.slice(6, -1).split(' ')[2]) - hue) < .1);
    }
  }
  await page.screenshot({ path: path.join(out, 'neutral-after-1280.png') });
  // Optional historical comparison without changing application files.
  if (process.env.BEFORE_TOKENS) {
    const style = await page.addStyleTag({ content: fs.readFileSync(process.env.BEFORE_TOKENS, 'utf8') });
    report.before = await inspect();
    await page.screenshot({ path: path.join(out, 'neutral-before-1280.png') });
    await style.evaluate(el => el.remove());
  }
  report.passed = true;
} finally {
  await browser.close(); fs.writeFileSync(path.join(out, 'neutral-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: report.passed, colors: report.palette.length, changed: report.palette.filter(t => report.before.some(b => b.name === t.name && b.hex !== t.hex)).map(t => ({ name: t.name, hex: t.hex, oklch: t.oklch })) }, null, 2));
