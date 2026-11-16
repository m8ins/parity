// Menu styling below is a visual proposal injected only into this browser.
// Production menu recipes are deliberately unchanged until the proposal is chosen.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
const page=await browser.newPage({viewport:{width:1000,height:900},locale:'de-DE',reducedMotion:'reduce'});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3002';
const out=path.dirname(new URL(import.meta.url).pathname),tmp=fs.mkdtempSync('/private/tmp/parity-refinements-');
const proposal=`
[data-radix-select-viewport], [data-slot=dropdown-menu-content], [data-slot=dropdown-menu-sub-content] { padding: var(--ref-space-1) 0 !important; }
:is([data-slot=select-item], [data-slot^=dropdown-menu-][role^=menuitem]) { border-radius: 0 !important; outline: none !important; box-shadow: none !important; }
:is([data-slot=select-item], [data-slot^=dropdown-menu-][role^=menuitem])[data-highlighted] { background: color-mix(in oklch, var(--sys-color-text) 8%, var(--sys-color-surface)) !important; color: var(--sys-color-text) !important; }
html[data-keyboard=true] :is([data-slot=select-item], [data-slot^=dropdown-menu-][role^=menuitem])[data-highlighted] { text-decoration: underline; text-underline-offset: .2em; text-decoration-thickness: 2px; }
`;
const shots=[];
async function shot(name){const target=name.startsWith('dropdown-')?page.getByRole('menu'):name.startsWith('select-')?page.getByRole('listbox'):page;await target.screenshot({path:path.join(tmp,`${name}.png`)});shots.push(name)}
try{
 await page.goto(`${base}/design/integration?view=empty`);
 await page.getByRole('button',{name:/Zähler hinzufügen/}).click();
 await page.getByLabel('Name',{exact:true}).fill('Wohnung Strom');
 await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'setup-type');
 assert.equal(await page.getByRole('combobox').getAttribute('tabindex'),'0');
 assert(await page.getByRole('combobox').evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)>0));
 await page.keyboard.press('Shift+Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'setup-name');
 assert.equal(await page.getByRole('button',{name:'Abbrechen',exact:true}).getAttribute('data-variant'),'ghost');
 await shot('setup-ghost-cancel');
 await page.keyboard.press('Tab');await page.keyboard.press('ArrowDown');
 await page.getByRole('option',{name:'Gas',exact:true}).hover();await shot('select-hover-before');
 await page.addStyleTag({content:proposal});await page.evaluate(()=>document.documentElement.dataset.keyboard='false');await shot('select-hover-proposal');
 await page.getByRole('option',{name:'Gas',exact:true}).click();
 assert.equal(await page.getByRole('combobox').textContent(),'Gas');
 await page.goto(`${base}/design/integration?view=overview`);
 await page.getByRole('button',{name:/verwalten$/}).first().click();
 await page.getByRole('menuitem').first().hover();await shot('dropdown-hover-before');
 await page.addStyleTag({content:proposal});await page.evaluate(()=>document.documentElement.dataset.keyboard='false');await shot('dropdown-hover-proposal');
 fs.writeFileSync(path.join(out,'refinements.json'),JSON.stringify({checks:['Chromium: name -> Tab -> select -> Shift+Tab -> name, explicit tabindex0','Keyboard opens select; gas chosen','Cancel ghost; shared production menu styling unchanged'],proposal:'Flat full-row tinted highlight, no inner outline/rounding; keyboard highlight also underlined',limitations:'Safari not automated; explicit tabindex0 is the targeted Safari correction. Menu proposal is browser-injected only.',screenshots:shots},null,2)+'\n');
}finally{await browser.close();fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});for(const name of shots)fs.copyFileSync(path.join(tmp,`${name}.png`),path.join(out,'screenshots',`${name}.png`))}
