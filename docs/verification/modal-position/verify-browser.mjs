import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const page = await browser.newPage({ locale: 'de-DE' });
const results = [];
const out = new URL('.', import.meta.url).pathname;
async function check(stage, width, height, textSize) {
  await page.getByRole('dialog').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  const geometry = await page.getByRole('dialog').evaluate(el => {
    const r = el.getBoundingClientRect(), css = getComputedStyle(el);
    return { x: r.x, y: r.y, width: r.width, height: r.height, top: css.top, bottom: css.bottom, left: css.left, translate: css.translate, transform: css.transform, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  });
  results.push({ stage, viewport: { width, height }, textSize, ...geometry });
  await page.screenshot({ path: `${out}${width}-${height}-${textSize}-${stage}.png` });
  assert(geometry.x >= -1 && geometry.y >= -1 && geometry.x + geometry.width <= width + 1 && geometry.y + geometry.height <= height + 1, `Dialog outside viewport: ${JSON.stringify(results.at(-1))}`);
}
try {
  for (const [width, height, textSize] of [[390,844,100],[320,568,100],[844,390,100],[320,568,200],[1440,1000,100]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${process.env.PREVIEW_URL || 'http://127.0.0.1:3021'}/design/integration?view=detail`);
    await page.getByRole('tab', { name: 'Konditionen', exact: true }).click();
    await page.evaluate(size => document.documentElement.style.fontSize = `${size}%`, textSize);
    await page.getByRole('button', { name: 'Konditionen ändern', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    await check('edit', width, height, textSize);
    await page.getByLabel('Abschlag', { exact: true }).fill('120');
    await page.getByRole('button', { name: 'Änderung prüfen', exact: true }).click();
    await check('review', width, height, textSize);
    await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await check('discard', width, height, textSize);
  }
} finally {
  fs.writeFileSync(`${out}browser.json`, JSON.stringify(results, null, 2) + '\n');
  await browser.close();
}
console.log(`Passed ${results.length} modal viewport checks.`);
