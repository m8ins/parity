import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = path.dirname(new URL(import.meta.url).pathname);
const captures = fs.mkdtempSync('/private/tmp/parity-1b-');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, locale: 'de-DE' });
const page = await context.newPage();
const report = { checks: [], screenshots: [], errors: [], contrasts: [], requests: [], limitations: 'Synthetic HTTP mocks only. No live authentication, persistence, RLS, physical keyboard or screen reader proof.' };
page.on('pageerror', error => report.errors.push(error.message));
let mode = 'error', release;
await context.route('http://127.0.0.1:54321/**', async route => {
  const request = route.request();
  report.requests.push({ method: request.method(), url: request.url().replace('http://127.0.0.1:54321','') });
  if (mode === 'pending' && request.method() !== 'GET') await new Promise(resolve => { release = resolve; });
  if (mode === 'success' && request.url().includes('/auth/v1/user')) return route.fulfill({ status:200,contentType:'application/json',body:JSON.stringify({id:'10000000-0000-4000-8000-000000000001',email:'demo@parity.example'}) });
  if (request.url().includes('/auth/v1/otp') && mode === 'code') return route.fulfill({ status:200,contentType:'application/json',body:'{}' });
  if (request.method() === 'GET') return route.fulfill({ status:200,contentType:'application/json',body: request.url().includes('/auth/') ? JSON.stringify({ id:'10000000-0000-4000-8000-000000000001',email:'demo@parity.example' }) : '[]' });
  await route.fulfill({ status:400,contentType:'application/json',body:JSON.stringify({code:'synthetic_error',message:'Synthetic failure'}) });
});
async function load(view, width=1280,height=960) {
  await page.setViewportSize({width,height});
  await page.goto(`${base}/design/integration?view=${view}`);
  await page.evaluate(()=>document.fonts.ready);
}
async function shot(name) {
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}: document overflow`);
  await page.screenshot({path:path.join(captures,`${name}.png`),fullPage:(await page.getByRole('dialog').count())===0});
  report.screenshots.push(name);
}
async function submitError(button, name, device) {
  if (device === 'desktop') {
    release=undefined;mode='pending';await button.click();
    await page.locator('[aria-busy=true]').first().waitFor();
    await shot(`${device}-${name}-pending`);
    assert(release, 'synthetic pending request intercepted');
    mode='error';release();
  } else { mode='error';await button.click(); }
}
async function close() { await page.getByRole('button',{name:'Schließen',exact:true}).first().click(); }
try {
  await load('login'); await shot('desktop-login-code');
  await page.getByRole('tab',{name:'Passwort',exact:true}).click();
  await page.getByLabel('E-Mail-Adresse').fill('demo@parity.example');
  await page.locator('#login-password').fill('synthetic-password');
  await shot('desktop-login-password');
  mode='pending';await page.getByRole('button',{name:'Anmelden',exact:true}).click();
  await page.getByRole('button',{name:'Wird angemeldet …'}).waitFor();
  assert(await page.locator('#login-password').isDisabled());
  await shot('desktop-login-pending'); mode='error';release();
  await page.locator('p[role=alert]').waitFor();await shot('desktop-login-error');
  assert.equal(await page.locator('#login-password').inputValue(),'synthetic-password');
  await page.getByRole('tab',{name:'E-Mail-Code',exact:true}).click();mode='code';
  await page.getByRole('button',{name:'Code anfordern'}).click();
  await page.getByLabel('Anmeldecode').fill('123456');await shot('desktop-login-code-entry');
  mode='error';await page.getByRole('button',{name:'Code bestätigen'}).click();
  await page.locator('p[role=alert]').waitFor();await shot('desktop-login-code-error');
  await page.getByRole('button',{name:'Andere E-Mail verwenden'}).click();
  assert.equal(await page.getByLabel('Anmeldecode').count(),0);
  report.checks.push('Password and code paths: labels, pending lock, errors retain values, method/email switch; mocked HTTP only');
  await load('login',390,844);await shot('mobile-login');
  await page.getByLabel('E-Mail-Adresse').click();
  assert.equal(await page.getByLabel('E-Mail-Adresse').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await page.getByLabel('E-Mail-Adresse').evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
  // Synthetic session only to expose the actual global Header/Profile components.
  const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({exp:4102444800,sub:'10000000-0000-4000-8000-000000000001',role:'authenticated'})).toString('base64url')}.synthetic`;
  const session = {access_token:token,refresh_token:'synthetic-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user:{id:'10000000-0000-4000-8000-000000000001',email:'demo@parity.example',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'}};
  await context.addCookies([{name:'sb-127-auth-token',value:`base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,domain:'127.0.0.1',path:'/'}]);
  for (const [device,width,height] of [['desktop',1280,960],['mobile',390,844]]) {
    await load('overview',width,height);await shot(`${device}-overview`);
    await page.getByRole('button',{name:'Konto öffnen'}).click();await shot(`${device}-account-menu`);
    await page.getByRole('menuitem',{name:'Passwort ändern'}).click();await shot(`${device}-profile`);
    await page.getByLabel('Neues Passwort',{exact:true}).fill('synthetic-password');
    await page.getByLabel('Neues Passwort bestätigen').fill('different');
    await page.getByRole('button',{name:'Passwort ändern',exact:true}).click();
    await page.locator('p[role=alert]').waitFor();await shot(`${device}-profile-error`);
    await page.getByLabel('Neues Passwort bestätigen').fill('synthetic-password');
    await submitError(page.getByRole('button',{name:'Passwort ändern',exact:true}), 'profile', device);
    await page.getByText('Das Passwort konnte nicht geändert werden.',{exact:false}).waitFor();
    await shot(`${device}-profile-save-error`);
    mode='success';await page.getByRole('button',{name:'Passwort ändern',exact:true}).click();
    await page.getByText('Dein Passwort wurde geändert.',{exact:true}).waitFor();await shot(`${device}-profile-success`);mode='error';await close();
    await page.getByRole('button',{name:/Zähler hinzufügen/}).click();await shot(`${device}-create-meter`);
    await page.getByLabel('Name',{exact:true}).fill('Synthetischer Zähler');
    await page.getByRole('combobox',{name:'Zählertyp'}).click();await page.getByRole('option',{name:'Gas',exact:true}).click();
    await shot(`${device}-create-gas`);
    await page.getByRole('button',{name:'Saisonale Gasverteilung erklären'}).click();await shot(`${device}-gas-distribution`);await page.keyboard.press('Escape');
    await submitError(page.getByRole('button',{name:'Zähler anlegen',exact:true}), 'create', device);await page.locator('p[role=alert]').waitFor();await shot(`${device}-create-error`);await close();
    await page.locator('[data-meter-id]').first().getByRole('button',{name:/verwalten/}).click();await page.getByRole('menuitem',{name:'Umbenennen'}).click();await shot(`${device}-rename`);await close();
    await page.getByRole('tab',{name:'Monatstabelle'}).click();await shot(`${device}-monthly-table`);
    await load('detail',width,height);await shot(`${device}-detail`);
    await page.getByRole('combobox',{name:'Abrechnungszeitraum'}).click();await shot(`${device}-period-select`);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Details bearbeiten',exact:true}).click();await shot(`${device}-detail-edit`);
    await page.getByRole('button',{name:'Details speichern'}).click();await page.locator('p[role=alert]').waitFor();await shot(`${device}-detail-error`);
    await page.getByRole('button',{name:'Details bearbeiten abbrechen'}).click();
    await page.getByRole('button',{name:'Neuer Zeitraum / Wechsel'}).click();await shot(`${device}-rollover`);
    await submitError(page.getByRole('button',{name:'Anlegen',exact:true}), 'rollover', device);await page.locator('p[role=alert]').waitFor();await shot(`${device}-rollover-error`);await close();
    await page.getByRole('button',{name:'Erfassen',exact:true}).click();await shot(`${device}-settlement`);
    await page.getByLabel('Betrag (€)').fill('82.50');await submitError(page.getByRole('button',{name:'Speichern',exact:true}), 'settlement', device);await page.locator('p[role=alert]').waitFor();await shot(`${device}-settlement-error`);await close();
    await page.getByRole('tab',{name:'Ablesungen',exact:true}).click();await shot(`${device}-readings`);
    await page.getByRole('tab',{name:'Konditionen',exact:true}).click();await shot(`${device}-rates`);
    await page.getByLabel('Gültig ab').fill('2026-11-01');await page.getByLabel('Grundpreis (€/Monat)').fill('12');await page.getByLabel('Arbeitspreis (ct/kWh)').fill('33');await page.getByLabel('Abschlag (€/Monat)').fill('100');
    await submitError(page.getByRole('button',{name:'Hinzufügen'}), 'rates', device);await page.locator('p[role=alert]').waitFor();await shot(`${device}-rates-error`);
    await load('gas',width,height);await page.getByRole('tab',{name:'Konditionen',exact:true}).click();await shot(`${device}-gas-rates`);
    report.checks.push(`${device}: header/account/profile, creation electricity/gas/popover/error, rename, chart/table, details/edit/error, period select, rollover/error, settlement/error, readings, rates/error/gas`);
  }
  // Focus and motion are checked in both the shared controls and Slice-1 matrix.
  await load('login',320,568);await page.addStyleTag({content:'html{font-size:200%}*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}'});await shot('mobile-login-200percent');
  await load('detail',320,568);await page.addStyleTag({content:'html{font-size:200%}*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}'});await shot('mobile-detail-200percent');
  for (const surface of ['overview','create','profile','rollover','settlement','rates']) {
    await load(surface === 'overview' || surface === 'create' || surface === 'profile' ? 'overview' : 'detail',320,568);
    await page.addStyleTag({content:'html{font-size:200%}*{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}'});
    if(surface==='create') await page.getByRole('button',{name:/Zähler hinzufügen/}).click();
    if(surface==='profile') { await page.getByRole('button',{name:'Konto öffnen'}).click(); await page.getByRole('menuitem',{name:'Passwort ändern'}).click(); }
    if(surface==='rollover') await page.getByRole('button',{name:'Neuer Zeitraum / Wechsel'}).click();
    if(surface==='settlement') await page.getByRole('button',{name:'Erfassen',exact:true}).click();
    if(surface==='rates') await page.getByRole('tab',{name:'Konditionen',exact:true}).click();
    const actionName={create:'Zähler anlegen',profile:'Passwort ändern',rollover:'Anlegen',settlement:'Speichern',rates:'Hinzufügen'}[surface];
    if(actionName) await page.getByRole('button',{name:actionName,exact:true}).scrollIntoViewIfNeeded();
    const words = await page.locator('.parity-control:not(.account-trigger), .parity-tab, .add-meter').evaluateAll(controls => controls.flatMap(control => {
      const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT); const rows=[]; const box=control.getBoundingClientRect();
      while(walker.nextNode()) {
        const node=walker.currentNode; if(node.parentElement.closest('svg, .sr-only')) continue;
        for(const match of node.textContent.matchAll(/[\p{L}\p{N}]+/gu)) {
          const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
          const rects=[...range.getClientRects()].filter(rect=>rect.width>0 && rect.height>0);
          const fragments=rects.length;
          if(fragments) rows.push({word:match[0],fragments,contained:rects.every(rect=>rect.left>=box.left+1 && rect.right<=box.right-1)});
        }
      }
      return rows;
    }));
    assert(words.every(word=>word.fragments===1),`${surface}: split action word ${JSON.stringify(words.filter(word=>word.fragments!==1))}`);
    assert(words.every(word=>word.contained),`${surface}: action text outside contour ${JSON.stringify(words.filter(word=>!word.contained))}`);
    await shot(`mobile-${surface}-200percent`);
    report.checks.push(`320px 200%+spacing ${surface}: no document overflow; action scrollable where applicable`);
  }
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});await load('overview');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');await shot('desktop-system-dark-reduced-motion');
  report.checks.push('320px login/detail at 200% text and spacing; system dark retains supported light palette; reduced motion capture');
  report.contrasts=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d',{willReadFrequently:true});
    const l=role=>{const probe=document.createElement('span');probe.style.color=`var(--sys-color-${role})`;document.body.append(probe);ctx.fillStyle=getComputedStyle(probe).color;probe.remove();ctx.fillRect(0,0,1,1);const rgb=[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb.reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);};
    const pairs=[];for(const bg of ['canvas','surface','field','field-active'])for(const fg of ['text','text-secondary','focus','border','error'])pairs.push([fg,bg,['focus','border'].includes(fg)?3:4.5]);pairs.push(['action-text','action',4.5],['action-text','action-hover',4.5],['error','error-surface',4.5],['success','success-surface',4.5],['disabled-text','disabled',4.5]);
    return pairs.map(([fg,bg,min])=>{const a=l(fg),b=l(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return {fg,bg,ratio:Math.round(ratio*100)/100,min,pass:ratio>=min};});
  });
  assert(report.contrasts.every(pair=>pair.pass));assert.deepEqual(report.errors,[]);report.status='pass';
} catch(error) {report.status='fail';report.failure=String(error.stack);await page.screenshot({path:path.join(captures,'failure-diagnostic.png'),fullPage:true});throw error;}
finally { fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});fs.cpSync(captures,path.join(out,'screenshots'),{recursive:true});fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify(report,null,2));await browser.close(); }
console.log('PASS',report.screenshots.length,'screenshots',report.checks.length,'check groups');
