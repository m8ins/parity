// Real local app + Auth + PostgREST. Injected transport failures are labelled.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const config=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:15000}));assert.equal(config.API_URL,'http://127.0.0.1:54321');
const out=path.dirname(new URL(import.meta.url).pathname), captures=fs.mkdtempSync('/private/tmp/parity-s6-browser-');
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}}), accounts=[],clients=[];
const ownMessageIds=[];
const report={source:'Real local app, synthetic accounts only; explicitly labelled response fault injection',checks:[],screenshots:[],errors:[],passed:false,cleanup:false};
const app=fs.mkdtempSync('/private/tmp/parity-s6-app-');for(const entry of ['src','public','next.config.ts','tsconfig.json','postcss.config.mjs','package.json','next-env.d.ts'])fs.cpSync(path.resolve(entry),path.join(app,entry),{recursive:true});fs.symlinkSync(path.resolve('node_modules'),path.join(app,'node_modules'),'dir');
const log=fs.openSync(path.join(captures,'server.log'),'w');const server=spawn('npm',['run','dev','--','--webpack','--hostname','127.0.0.1','--port','3008'],{cwd:app,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:config.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:config.ANON_KEY,PARITY_DESIGN_PREVIEW:'1'},stdio:['ignore',log,log],detached:true});
let browser, page;
const base='http://127.0.0.1:3008';
try{
 for(let i=0;i<2;i++){
  const email=`slice6-browser-${Date.now()}-${i}-${'langekontoadresse'.repeat(3)}@example.test`,password=crypto.randomUUID();const r=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(r.error);accounts.push({id:r.data.user.id,email,password});
  const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await c.auth.signInWithPassword({email,password})).error);clients.push(c);
 }
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 const seed=await clients[0].rpc('setup_meter',{p_request_id:crypto.randomUUID(),p_payload:{name:'Slice 6 Strom',type:'electricity',provider:'Synthetic',period_start:'2025-01-01',period_end:'2026-01-01',grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0}});assert.ifError(seed.error);const meter=seed.data;
 const old=(await clients[0].from('contracts').select('*').eq('meter_id',meter).single()).data;
 // A second legitimate period is sufficient to check URL selection/history.
 const rates=(await clients[0].from('rates').select('*').eq('contract_id',old.id)).data;
 const nextReply=await clients[0].rpc('continue_billing_period',{p_request_id:crypto.randomUUID(),p_payload:{continuation_version:1,period_id:old.id,expected_periods:[{id:old.id,period_start:old.period_start,period_end:old.period_end,provider:old.provider,settlement_amount:null,settlement_date:null}],expected_rates:rates.map(({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})=>({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})).sort((a,b)=>a.id.localeCompare(b.id)),period_start:'2026-01-01',period_end:null,provider:null,grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,confirm_boundary:true,confirm_gap:true,confirm_future:true}});assert.ifError(nextReply.error);const next={data:nextReply.data.contract};
 browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});const context=await browser.newContext({viewport:{width:1280,height:1000},locale:'de-DE',timezoneId:'Europe/Berlin'});page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const shot=async name=>{await page.screenshot({path:path.join(captures,`${name}.png`),fullPage:false});report.screenshots.push(`screenshots/${name}.png`);};
 const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No document overflow');
 const login=async account=>{await page.getByRole('tab',{name:'Passwort',exact:true}).click();await page.getByLabel('E-Mail-Adresse',{exact:true}).fill(account.email);await page.locator('#login-password').fill(account.password);await page.getByRole('button',{name:'Anmelden',exact:true}).click();await page.waitForLoadState('networkidle');};
 await page.goto(`${base}/meter/${meter}?period=${old.id}`);await page.getByText(/Sitzung fehlt oder ist abgelaufen/).waitFor();await shot('desktop-session-required');await login(accounts[0]);await page.locator('h1').filter({hasText:'Slice 6 Strom'}).waitFor();await page.waitForLoadState('networkidle');assert.equal(new URL(page.url()).searchParams.get('period'),old.id);

 await page.getByRole('tab',{name:'Verwalten',exact:true}).click();
 await page.getByRole('button',{name:'Details bearbeiten',exact:true}).click();
 await page.getByLabel('Anbieter',{exact:true}).fill('Slice 7 confirmed provider');
 let detailsLost=false, detailsFirst, detailsRetry;
 await page.route('**/rest/v1/rpc/save_billing_period_details',async route=>{detailsFirst=route.request().postDataJSON();const response=await route.fetch();assert.equal(response.status(),200);detailsLost=true;await route.abort('failed');},{times:1});
 await page.getByRole('button',{name:'Details speichern',exact:true}).click();
 await page.locator('[role=alert]:not(#__next-route-announcer__)').waitFor();assert(detailsLost);
 assert.equal(await page.getByLabel('Anbieter',{exact:true}).inputValue(),'Slice 7 confirmed provider');
 page.on('request',r=>{if(r.url().endsWith('/rpc/save_billing_period_details'))detailsRetry=r.postDataJSON();});
 await page.getByRole('button',{name:'Details speichern',exact:true}).click();await page.getByText('Slice 7 confirmed provider',{exact:true}).waitFor();assert.deepEqual(detailsRetry,detailsFirst);
 await page.reload();await page.getByRole('tab',{name:'Verwalten',exact:true}).click();await page.getByText('Slice 7 confirmed provider',{exact:true}).waitFor();
 report.checks.push('New details RPC: real committed response discarded, input preserved, identical absolute retry confirmed, provider persists after actual reload');
 await page.getByRole('combobox',{name:'Abrechnungszeitraum'}).click();await page.getByRole('option').filter({hasText:'offen'}).click();await page.waitForURL(`**period=${next.data.id}`);await page.reload();await page.getByRole('combobox').filter({hasText:'offen'}).waitFor();
 await page.goBack();await page.getByRole('combobox').filter({hasText:'31.12.2025'}).waitFor();await page.getByRole('link',{name:'Zurück zur Übersicht'}).click();await page.getByRole('heading',{name:'Deine Zähler'}).waitFor();
 report.checks.push('Deep link without session → real password login preserves meter/period; selected period URL, reload and browser back; explicit return goes to overview');
 const menu=async()=>page.getByRole('button',{name:/verwalten$/}).first().click();
 await menu();await page.getByRole('menuitem',{name:'Umbenennen'}).click();await page.getByLabel('Zählername',{exact:true}).fill('Neuer Zählername');
 await page.route('**/rest/v1/meters?**',async route=>{if(route.request().method()==='PATCH')return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Synthetic server failure'})});return route.continue();});
 await page.getByRole('button',{name:'Speichern',exact:true}).click();await page.locator('[role=alert]:not(#__next-route-announcer__)').waitFor();assert.equal(await page.getByLabel('Zählername',{exact:true}).inputValue(),'Neuer Zählername');await shot('desktop-rename-error');await page.unroute('**/rest/v1/meters?**');
 let release;await page.route('**/rest/v1/meters?**',async route=>{if(route.request().method()==='PATCH')await new Promise(r=>release=r);await route.continue();});
 await page.getByRole('button',{name:'Speichern',exact:true}).click();await page.getByRole('button',{name:'Wird gespeichert …'}).waitFor();await shot('desktop-rename-pending');assert(await page.getByLabel('Zählername',{exact:true}).isDisabled());await page.keyboard.press('Escape');assert(await page.getByRole('dialog').isVisible());release();await page.getByRole('link',{name:'Neuer Zählername',exact:true}).waitFor();await page.unroute('**/rest/v1/meters?**');await page.reload();await page.getByRole('link',{name:'Neuer Zählername',exact:true}).waitFor();
 await page.getByRole('link',{name:'Neuer Zählername',exact:true}).click();await page.getByRole('button',{name:'Neuer Zählername umbenennen'}).click();await page.getByLabel('Zählername',{exact:true}).fill('Strom · Keller und Einliegerwohnung mit einem absichtlich sehr langen Zählernamen für die mobile Verwaltungsprüfung');await page.getByRole('button',{name:'Speichern',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.reload();await page.getByRole('heading',{name:/Strom · Keller/}).waitFor();
 await page.getByRole('link',{name:'Zurück zur Übersicht'}).click();await page.getByRole('heading',{name:'Deine Zähler'}).waitFor();
 report.checks.push('Rename HTTP failure preserves input; pending locks controls/Escape; real retry persists after reload; detail rename persists and updates overview with long name');
 await menu();await page.getByRole('menuitem',{name:'Entfernen'}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('button',{name:'Abbrechen',exact:true}).evaluate(el=>el===document.activeElement),true);await shot('desktop-delete-confirmation');await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor({state:'hidden'});assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).pointerEvents),'none');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')?.endsWith(' verwalten'));assert((await clients[0].from('meters').select('id').eq('id',meter).single()).data);
 await menu();await page.getByRole('menuitem',{name:'Entfernen'}).click();await page.route('**/rest/v1/meters?**',async route=>{if(route.request().method()==='DELETE')return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Synthetic failure'})});return route.continue();});await page.getByRole('button',{name:'Zähler endgültig entfernen'}).click();await page.locator('[role=alert]:not(#__next-route-announcer__)').waitFor();await shot('desktop-delete-error');assert((await clients[0].from('meters').select('id').eq('id',meter).single()).data);await page.unroute('**/rest/v1/meters?**');await page.getByRole('button',{name:'Abbrechen',exact:true}).click();
 // Mobile, long labels and 200% text with actual account/meter.
 await page.setViewportSize({width:390,height:844});await menu();await page.getByRole('menuitem',{name:'Umbenennen'}).click();await shot('mobile-rename');await noOverflow();await page.getByRole('button',{name:'Abbrechen',exact:true}).click();
 await menu();await page.getByRole('menuitem',{name:'Entfernen'}).click();await shot('mobile-delete');await noOverflow();await page.getByRole('button',{name:'Abbrechen',exact:true}).click();
 await page.setViewportSize({width:320,height:650});await page.addStyleTag({content:'html {font-size:200% !important} * {letter-spacing:.12em !important;word-spacing:.16em !important;line-height:1.5 !important}'});await noOverflow();await menu();await page.getByRole('menuitem',{name:'Umbenennen'}).click();await page.getByLabel('Zählername',{exact:true}).scrollIntoViewIfNeeded();await shot('mobile-200percent-rename');await noOverflow();await page.getByRole('button',{name:'Abbrechen',exact:true}).click();await menu();await page.getByRole('menuitem',{name:'Entfernen'}).click();await page.getByRole('dialog').evaluate(el=>el.scrollTop=0);await shot('mobile-200percent-delete-top');await page.locator('[data-slot=dialog-description]').scrollIntoViewIfNeeded();await shot('mobile-200percent-delete-consequences');await page.getByRole('button',{name:'Zähler endgültig entfernen'}).scrollIntoViewIfNeeded();await shot('mobile-200percent-delete-actions');await noOverflow();await page.getByRole('button',{name:'Abbrechen',exact:true}).click();await page.reload();await page.setViewportSize({width:1280,height:1000});
 report.checks.push('Opening delete and default Enter only cancel; injected HTTP failure retains meter, no false success; Desktop/Mobile/320px 200% text long names and email, scrollable actions and document bounds');
 // Lost response after actual commit, no false success, retry reaches valid empty overview.
 await menu();await page.getByRole('menuitem',{name:'Entfernen'}).click();let lost=false;await page.route('**/rest/v1/meters?**',async route=>{if(route.request().method()==='DELETE'){const response=await route.fetch();assert.equal(response.status(),204);lost=true;return route.abort('failed');}return route.continue();},{times:1});
 await page.getByRole('button',{name:'Zähler endgültig entfernen'}).click();await page.locator('[role=alert]:not(#__next-route-announcer__)').waitFor();assert(lost);assert.equal((await clients[0].from('meters').select('id').eq('id',meter).maybeSingle()).data,null);await shot('desktop-delete-lost-response');await page.getByRole('button',{name:'Löschung erneut prüfen'}).click();await page.getByText('Dein erster Zähler',{exact:true}).waitFor();assert(await page.getByRole('heading',{name:'Deine Zähler'}).evaluate(el=>el===document.activeElement));await shot('desktop-delete-success');await page.reload();await page.getByText('Dein erster Zähler',{exact:true}).waitFor();
 report.checks.push('Real committed DELETE response discarded → no success; identical target retry verifies absence; empty overview and heading focus; deleted meter remains absent after reload');
 for(const url of [`/meter/${meter}`,`/meter/ungueltig`,`/contract/${old.id}`]){await page.goto(base+url);await page.getByRole('heading',{name:/nicht verfügbar/}).waitFor();assert(await page.getByRole('link',{name:'Zur Zählerübersicht'}).isVisible());}
 report.checks.push('Deleted/invalid meter and legacy links show safe return; account isolation checked separately through real API roles. Auth scenarios outside changed write paths excluded from this focused regression.');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=String(error);if(page){await page.screenshot({path:path.join(captures,'failed-state.png'),fullPage:true});report.failureText=(await page.locator('body').innerText()).slice(0,4500);}throw error;}finally{
 for(const id of ownMessageIds)await fetch(`${config.MAILPIT_URL}/api/v1/messages`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({IDs:[id]})});
 await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}
 for(const c of clients){const meters=await c.from('meters').select('id');for(const m of meters.data||[])assert.ifError((await c.from('meters').delete().eq('id',m.id)).error);}
 for(const a of accounts)assert.ifError((await admin.auth.admin.deleteUser(a.id)).error);report.cleanup=true;
 fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});for(const file of fs.readdirSync(captures))fs.copyFileSync(path.join(captures,file),path.join(out,file.endsWith('.png')?'screenshots/'+file:file));fs.writeFileSync(path.join(out,'live-browser.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
