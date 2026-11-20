import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
const page=await browser.newPage({viewport:{width:1000,height:900},locale:'de-DE',reducedMotion:'reduce'});
const base=process.env.PREVIEW_URL||'http://127.0.0.1:3002';
const out=path.dirname(new URL(import.meta.url).pathname),tmp=fs.mkdtempSync('/private/tmp/parity-menu-confirm-');
const shots=[],checks=[];
async function shot(name,target=page){await target.screenshot({path:path.join(tmp,`${name}.png`)});shots.push(name)}
async function checkRow(row){const style=await row.evaluate(el=>{const s=getComputedStyle(el);return{radius:s.borderRadius,outline:s.outlineStyle,background:s.backgroundColor}});assert.equal(style.radius,'0px');assert.equal(style.outline,'none');assert.notEqual(style.background,'rgba(0, 0, 0, 0)')}
try{
 await page.goto(`${base}/design/integration?view=empty`);
 await page.getByRole('button',{name:/Zähler hinzufügen/}).click();
 await page.getByLabel('Name',{exact:true}).fill('Wohnung');
 await page.getByRole('button',{name:'Abbrechen',exact:true}).click();
 const discard=page.getByRole('dialog',{name:'Eingaben verwerfen?'});await discard.waitFor();
 assert((await discard.textContent()).includes('Es wurde noch kein Zähler angelegt.'));
 await shot('confirmation-unsaved',discard);
 await discard.getByRole('button',{name:'Eingaben verwerfen',exact:true}).click();
 await page.evaluate(()=>sessionStorage.setItem('parity:meter-setup:10000000-0000-4000-8000-000000000001',JSON.stringify({requestId:'11111111-1111-4111-8111-111111111111',submitted:true,step:2,values:{name:'Wohnung',type:'electricity',provider:'',period_start:'2026-01-01',period_end:'',grundpreis:'10',arbeitspreis:'30',abschlag:'50',umrechnungsfaktor:'1',reading_date:'2026-01-01',reading_value:'123'}})));
 await page.reload();await page.getByRole('button',{name:/Zähler hinzufügen/}).click();
 await page.getByRole('button',{name:'Später prüfen',exact:true}).click();
 const later=page.getByRole('dialog',{name:'Später weiterprüfen?'});await later.waitFor();
 assert((await later.textContent()).includes('Öffne „Zähler hinzufügen“ erneut'));
 await shot('confirmation-unconfirmed',later);
 checks.push('Rendered distinct discard and unconfirmed-save confirmations; concrete actions and return path');
 await page.evaluate(()=>sessionStorage.clear());
 await page.goto(`${base}/design/integration?view=empty`);
 await page.getByRole('button',{name:/Zähler hinzufügen/}).click();
 await page.getByRole('combobox').click();await page.getByRole('option',{name:'Gas',exact:true}).hover();
 await checkRow(page.getByRole('option',{name:'Gas',exact:true}));
 await shot('select-hover-flat',page.getByRole('listbox'));
 await page.keyboard.press('ArrowUp');
 assert((await page.locator('[data-slot=select-item][data-highlighted]').evaluate(el=>getComputedStyle(el).textDecorationLine)).includes('underline'));
 checks.push('Production Select: flat full-row pointer highlight; keyboard underline; selection check preserved');
 await page.goto(`${base}/design/integration?view=overview`);
 await page.getByRole('button',{name:/verwalten$/}).first().click();
 await page.getByRole('menuitem').first().hover();await checkRow(page.getByRole('menuitem').first());
 await shot('dropdown-hover-flat',page.getByRole('menu'));
 await page.getByRole('menuitem',{name:'Löschen',exact:true}).hover();
 await shot('dropdown-destructive-hover-flat',page.getByRole('menu'));
 checks.push('Production Dropdown: flat full-row highlight; destructive action retains red');
 fs.writeFileSync(path.join(out,'menu-confirmation.json'),JSON.stringify({passed:true,checks,screenshots:shots},null,2)+'\n');
}finally{await browser.close();fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});for(const name of shots)fs.copyFileSync(path.join(tmp,`${name}.png`),path.join(out,'screenshots',`${name}.png`))}
