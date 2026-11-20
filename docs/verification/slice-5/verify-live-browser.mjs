// Real local app/Auth/PostgREST. The only interception discards one real committed
// RPC response to reproduce a transport failure. No data responses are mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const config = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding:'utf8', stdio:['ignore','pipe','ignore'],timeout:15000 }));
assert.equal(config.API_URL, 'http://127.0.0.1:54321');
const out = path.dirname(new URL(import.meta.url).pathname), capture = fs.mkdtempSync('/private/tmp/parity-live-5-');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const email = `slice5-browser-${Date.now()}@example.test`, password=crypto.randomUUID();
const created = await admin.auth.admin.createUser({email,password,email_confirm:true}); assert.ifError(created.error);
const account = created.data.user.id;
const client = createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});
assert.ifError((await client.auth.signInWithPassword({email,password})).error);
const report={source:'Real local Next app + Auth + Supabase; one committed HTTP response deliberately discarded',checked_at:new Date().toISOString(),checks:[],screenshots:[],errors:[],passed:false,cleanup:false};
const serverLog=fs.openSync(path.join(capture,'server.log'),'w');
const appCopy=fs.mkdtempSync('/private/tmp/parity-live-app-');
for (const entry of ['src','public','next.config.ts','tsconfig.json','postcss.config.mjs','package.json','next-env.d.ts']) fs.cpSync(path.resolve(entry),path.join(appCopy,entry),{recursive:true});
fs.symlinkSync(path.resolve('node_modules'),path.join(appCopy,'node_modules'),'dir');
const server=spawn('npm',['run','dev','--','--webpack','--hostname','127.0.0.1','--port','3006'],{cwd:appCopy,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:config.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:config.ANON_KEY},stdio:['ignore',serverLog,serverLog],detached:true});

let browser;
try {
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3006')).ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,500));}
  assert(ready,'Dev server starts');
  const setup={name:'Slice 5 UI Strom',type:'electricity',provider:'Synthetic old',period_start:'2025-01-01',period_end:null,grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0};
  const seed=await client.rpc('setup_meter',{p_request_id:crypto.randomUUID(),p_payload:setup});assert.ifError(seed.error);
  const old=(await client.from('contracts').select('*').eq('meter_id',seed.data).single()).data;
  assert.ifError((await client.from('rates').insert([{contract_id:old.id,effective_from:'2026-01-01',grundpreis:11,arbeitspreis:31,abschlag:110,umrechnungsfaktor:1},{contract_id:old.id,effective_from:'2026-06-01',grundpreis:12,arbeitspreis:35,abschlag:120,umrechnungsfaktor:1}])).error);
  assert.ifError((await client.from('readings').insert([{meter_id:seed.data,date:'2026-01-01',value:1000},{meter_id:seed.data,date:'2026-07-01',value:1500}])).error);
  const gas=await client.rpc('setup_meter',{p_request_id:crypto.randomUUID(),p_payload:{...setup,name:'Slice 5 UI Gas',type:'gas',period_end:'2026-01-01',umrechnungsfaktor:10.71234567}});assert.ifError(gas.error);
  const gasOld=(await client.from('contracts').select('*').eq('meter_id',gas.data).single()).data;
  browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000},locale:'de-DE',timezoneId:'Europe/Berlin'});
  page.on('pageerror',error=>report.errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  const goto=async(id,period)=>page.goto(`http://127.0.0.1:3006/meter/${id}?period=${period}`);
  const manage=async()=>page.getByRole('tab',{name:'Verwalten',exact:true}).click();
  await page.goto('http://127.0.0.1:3006');
  await page.getByRole('tab',{name:'Passwort',exact:true}).click();await page.getByLabel('E-Mail-Adresse',{exact:true}).fill(email);await page.locator('#login-password').fill(password);await page.getByRole('button',{name:'Anmelden',exact:true}).click();await page.getByRole('heading',{name:'Deine Zähler',exact:true}).waitFor();
  await goto(seed.data,old.id);await manage();await page.getByRole('button',{name:'Neuer Zeitraum / Wechsel',exact:true}).click();
  await page.getByLabel('Beginn',{exact:true}).fill('2026-01-01');await page.getByLabel('Anbieter (optional)',{exact:true}).fill('Synthetic new');await page.getByRole('button',{name:'Konditionen prüfen',exact:true}).click();
  assert.equal(await page.getByLabel('Arbeitspreis (ct/kWh)',{exact:true}).inputValue(),'31');
  await page.getByLabel('Grundpreis (€/Monat)',{exact:true}).fill('0');await page.getByRole('button',{name:'Weiter zur Prüfung',exact:true}).click();
  await page.getByText(/1 spätere Konditionsänderung wird übernommen/).waitFor();await page.getByRole('checkbox',{name:'Zeitraumgrenze und spätere Konditionen geprüft',exact:true}).check();
  let lost=false,firstRequest;
  await page.route('**/rest/v1/rpc/continue_billing_period',async route=>{firstRequest=route.request().postDataJSON();const response=await route.fetch();assert.equal(response.status(),200);lost=true;await route.abort('failed');},{times:1});
  await page.getByRole('button',{name:'Zeitraum beginnen',exact:true}).click();await page.getByRole('button',{name:'Speicherung prüfen',exact:true}).waitFor();assert(lost);
  let periods=(await client.from('contracts').select('*,rates(*)').eq('meter_id',seed.data).order('period_start')).data;assert.equal(periods.length,2);assert.equal(periods[0].settlement_amount,null);
  await page.reload();await manage();await page.getByRole('button',{name:'Neuer Zeitraum / Wechsel',exact:true}).click();
  let repeated;page.on('request',request=>{if(request.url().endsWith('/rpc/continue_billing_period'))repeated=request.postDataJSON();});
  await page.getByRole('button',{name:'Speicherung prüfen',exact:true}).click();await page.getByRole('heading',{name:'Zeitraum angelegt',exact:true}).waitFor();assert.deepEqual(repeated,firstRequest);
  await page.getByRole('button',{name:'Neuen Zeitraum ansehen',exact:true}).click();
  await page.getByRole('combobox',{name:'Abrechnungszeitraum',exact:true}).waitFor();
  periods=(await client.from('contracts').select('*,rates(*)').eq('meter_id',seed.data).order('period_start')).data;assert.equal(periods.length,2);assert.equal(periods[0].period_end,'2026-01-01');assert.equal(periods[0].rates.length,3);assert.equal(periods[1].rates.length,2);assert.equal(periods[1].rates.find(r=>r.effective_from==='2026-06-01').arbeitspreis,35);
  const readings=(await client.from('readings').select('*').eq('meter_id',seed.data)).data;assert.equal(readings.length,3);assert.equal(readings.filter(r=>r.date==='2026-01-01').length,1);
  await page.getByRole('tab',{name:'Ablesungen',exact:true}).click();await page.getByText('1.000',{exact:true}).first().waitFor();
  report.checks.push('Real login and continuation without settlement; exact-boundary rate prefilled at 31ct; later June rate shown and copied; committed response lost; reload repeats identical request; exactly two periods and three meter readings, boundary reading retained once');
  async function settle(id,period,kind,amount,title){
    await goto(id,period);await manage();await page.getByRole('button',{name:/^Abrechnung (erfassen|korrigieren)$/}).click();await page.getByRole('radio',{name:kind==='Ausgeglichen'?'Erstattung':kind,exact:true}).check();await page.getByLabel('Betrag',{exact:true}).fill(amount||'0');await page.getByLabel('Abrechnungsdatum',{exact:true}).fill('2026-02-12');await page.getByRole('button',{name:'Abrechnung speichern',exact:true}).click();await page.getByRole('heading',{name:'Abrechnung gespeichert',exact:true}).waitFor();await page.getByRole('button',{name:'Fertig',exact:true}).click();await page.getByRole('tab',{name:'Verstehen',exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor();await page.getByText('Erfasste Schlussabrechnung · 12. Feb. 2026',{exact:true}).waitFor();await page.reload();await page.getByRole('heading',{name:title,exact:true}).waitFor();
  }
  await settle(seed.data,old.id,'Erstattung','125,50','125,50 € Erstattung');
  assert.equal((await client.from('contracts').select('settlement_amount').eq('id',old.id).single()).data.settlement_amount,125.5);
  await settle(seed.data,old.id,'Nachzahlung','42,25','42,25 € Nachzahlung');
  assert.equal((await client.from('contracts').select('settlement_amount').eq('id',old.id).single()).data.settlement_amount,-42.25);
  await settle(seed.data,old.id,'Ausgeglichen',null,'Abrechnung ausgeglichen');
  assert.equal((await client.from('contracts').select('settlement_amount').eq('id',old.id).single()).data.settlement_amount,0);
  report.checks.push('Product settlement create/correct: refund +125.50, due -42.25, explicit zero; actual banner and date survive real reload each time');
  await settle(gas.data,gasOld.id,'Erstattung','328','328,00 € Erstattung');
  const gasPeriods=(await client.from('contracts').select('*,rates(*)').eq('meter_id',gas.data)).data;assert.equal(gasPeriods.length,1);assert.equal(gasPeriods[0].rates[0].umrechnungsfaktor,10.71234567);assert.equal((await client.from('contracts').select('settlement_amount').eq('id',old.id).single()).data.settlement_amount,0);
  await goto(seed.data,old.id);await manage();await page.getByRole('button',{name:'Neuer Zeitraum / Wechsel',exact:true}).click();await page.getByRole('button',{name:'Folgezeitraum ansehen',exact:true}).click();await page.getByRole('combobox',{name:'Abrechnungszeitraum',exact:true}).waitFor();assert((await page.getByRole('combobox',{name:'Abrechnungszeitraum',exact:true}).innerText()).includes('01.01.2026'));
  report.checks.push('Gas remains an independent period with precise factor and its own actual refund; older period continuation links to existing successor and period navigation works');
  assert.deepEqual(report.errors,[]);report.passed=true;
} finally {
  await browser?.close(); try{process.kill(-server.pid,'SIGTERM')}catch{}
  const meters=await client.from('meters').select('id');
  for(const meter of meters.data||[])assert.ifError((await client.from('meters').delete().eq('id',meter.id)).error);
  assert.ifError((await admin.auth.admin.deleteUser(account)).error); report.cleanup=true;

  fs.writeFileSync(path.join(out,'live-browser.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
