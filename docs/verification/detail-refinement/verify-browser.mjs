// Synthetic UI checks only; persistence is covered separately.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.dirname(new URL(import.meta.url).pathname);
const capture = fs.mkdtempSync('/private/tmp/parity-detail-shots-');
const report = { synthetic: true, checks: [], screenshots: [], errors: [], passed: false };
const browser = await chromium.launch({ executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const page = await browser.newPage({ locale: 'de-DE', timezoneId: 'Europe/Berlin' });
page.on('pageerror', error => report.errors.push(error.message));
async function shot(name) {
  await page.screenshot({ path: path.join(capture, name + '.png'), fullPage: true });
  report.screenshots.push('screenshots/' + name + '.png');
}
async function fits() { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No document overflow'); }
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('http://127.0.0.1:3021/design/integration?view=detail');
    await page.getByRole('tab', { name: 'Monatswerte', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.recharts-area-curve').first().waitFor();
    await fits();
    assert.equal(await page.locator('.detail-heading').getByRole('button', { name: 'Ende ändern' }).count(), 0);
    assert.equal(await page.locator('.detail-heading').getByRole('button', { name: /umbenennen/ }).count(), 1);
    const switchBounds = await page.getByRole('tablist', { name: 'Verbrauchsansicht' }).boundingBox();
    const toolbarBounds = await page.locator('.understand-view-toolbar').boundingBox();
    assert(Math.abs(switchBounds.x + switchBounds.width - toolbarBounds.x - toolbarBounds.width) < 2, 'View switch aligns right');
    if (width >= 768) {
      const legend = await page.locator('.understand-view-toolbar .understand-legend').boundingBox();
      assert(Math.abs(legend.y + legend.height / 2 - switchBounds.y - switchBounds.height / 2) < 2, 'Legend and switch share a row');
    }
    await shot(`overview-${width}`);
    await page.getByRole('tab', { name: 'Monatswerte', exact: true }).click();
    assert(await page.getByRole('table').isVisible());
    assert(!(await page.locator('.understand-view-toolbar .understand-legend').isVisible()));
    assert.equal(await page.locator('.understand-chart').count(), 0);
    assert(await page.getByText(/Nur der durch Ablesungen abgedeckte Zeitraum/).isVisible());
    await fits(); await shot(`monthly-${width}`);
    await page.getByRole('tab', { name: 'Verwalten', exact: true }).click();
    assert(await page.getByRole('button', { name: 'Ende ändern', exact: true }).isVisible());
    assert.equal(await page.getByRole('button', { name: 'Name ändern', exact: true }).count(), 0);
    const action = await page.getByRole('button', { name: 'Neuen Zeitraum anlegen' }).boundingBox();
    const card = await page.locator('[data-slot=card]').boundingBox();
    assert(card.y > action.y + action.height + 8, 'Continuation action is separated from the card');
    await fits(); await shot(`manage-${width}`);
    await page.getByRole('button', { name: 'Details bearbeiten', exact: true }).click();
    await page.getByLabel('Anbieter', { exact: true }).fill('Ein Anbieter mit einem längeren Namen');
    await fits();
    await page.getByRole('button', { name: 'Details bearbeiten abbrechen' }).click();
    await page.getByRole('tab', { name: 'Konditionen', exact: true }).click();
    assert(await page.locator('.condition-intro').getByText('12,50 €/Monat', { exact: true }).isVisible());
    assert(await page.locator('.condition-intro').getByText('100,00 €/Monat', { exact: true }).isVisible());
    assert(await page.locator('.condition-intro').getByText('32,4 ct/kWh', { exact: true }).isVisible());
    await fits(); await shot(`conditions-${width}`);
    await page.getByRole('tab', { name: 'Ablesungen', exact: true }).click();
    assert(await page.getByRole('heading', { name: 'Ablesungen', exact: true }).isVisible());
    assert.equal(await page.getByRole('combobox', { name: 'Abrechnungszeitraum' }).count(), 0);
    assert.equal(await page.locator('[data-slot=card]').count(), 0);
    await fits(); await shot(`readings-${width}`);
    const trigger = page.getByRole('button', { name: /umbenennen/ });
    await trigger.click();
    const input = page.getByRole('textbox', { name: 'Zählername' });
    await input.fill('Sehr langer Zählername im Keller und in der Einliegerwohnung');
    await fits(); await shot(`rename-${width}`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.matches('.detail-name-trigger'));
    report.checks.push(`${width}px: chart/monthly switching, scoped period selection, management spacing, formatted conditions, unframed history, inline rename/Escape; no page overflow`);
  }
  await page.goto('http://127.0.0.1:3021/design/integration?view=detail');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addStyleTag({ content: 'html{font-size:200%}*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}' });
  for (const name of ['Verstehen', 'Verwalten', 'Konditionen', 'Ablesungen']) {
    await page.getByRole('tab', { name, exact: true }).click(); await fits(); await shot(`text-200-${name}`);
  }
  await page.getByRole('button', { name: /umbenennen/ }).click(); await fits(); await shot('text-200-rename');
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /umbenennen/ }).focus();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  assert(await page.getByRole('button', { name: /umbenennen/ }).evaluate(el => getComputedStyle(el).outlineStyle === 'solid'));
  report.checks.push('320px, 200% type plus extra text spacing: all main panels and inline editor fit; keyboard focus remains visible');
  assert.deepEqual(report.errors, []); report.passed = true;
} catch (error) { report.failure = String(error); await shot('failure'); throw error; }
finally {
  await browser.close(); fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
  for (const file of fs.readdirSync(capture)) fs.copyFileSync(path.join(capture, file), path.join(out, 'screenshots', file));
  fs.writeFileSync(path.join(out, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
