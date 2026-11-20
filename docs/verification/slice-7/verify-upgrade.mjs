// Two phases around the real local additive upgrade. Stores own synthetic fixture only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const config=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
assert.equal(config.API_URL,'http://127.0.0.1:54321');
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const fixture='/private/tmp/parity-slice7-upgrade.json';
const sql=s=>execFileSync('docker',['exec','-i','supabase_db_Parity','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8'}).trim();
const snapshot=rows=>rows.map(({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})=>({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})).sort((a,b)=>a.id.localeCompare(b.id));
if(process.argv[2]==='before'){
 assert(!fs.existsSync(fixture),'Do not overwrite an upgrade fixture');
 assert.equal(sql("SELECT count(*) FROM information_schema.columns WHERE table_name='condition_requests' AND column_name='comparison_version'"),'0');
 const email=`slice7-upgrade-${Date.now()}@example.test`,password=crypto.randomUUID();
 const u=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(u.error);
 const f={email,password,account:u.data.user.id,keys:[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()]};fs.writeFileSync(fixture,JSON.stringify(f),{mode:0o600});
 const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await c.auth.signInWithPassword({email,password})).error);
 f.setup={name:'Upgrade synthetic',type:'electricity',provider:null,period_start:'2025-01-01',period_end:null,grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0};
 const r=await c.rpc('setup_meter',{p_request_id:f.keys[0],p_payload:f.setup});assert.ifError(r.error);f.meter=r.data;
 let p=(await c.from('contracts').select('*,rates(*)').eq('meter_id',f.meter).single()).data;
 f.period=p.id;f.rate=p.rates[0];
 f.condition={contract_id:p.id,operation:'correct',rate_id:p.rates[0].id,effective_from:'2025-01-01',expected_period:{period_start:p.period_start,period_end:null},expected_rates:snapshot(p.rates),grundpreis:11,arbeitspreis:31,abschlag:101,umrechnungsfaktor:1};
 assert.ifError((await c.rpc('change_conditions',{p_request_id:f.keys[1],p_payload:f.condition})).error);
 p=(await c.from('contracts').select('*,rates(*)').eq('id',p.id).single()).data;
 f.continuation={period_id:p.id,expected_periods:[{id:p.id,period_start:p.period_start,period_end:null,provider:null,settlement_amount:null,settlement_date:null}],expected_rates:snapshot(p.rates),period_start:'2026-01-01',period_end:null,provider:'Upgrade new',grundpreis:12,arbeitspreis:32,abschlag:102,umrechnungsfaktor:1,confirm_boundary:true,confirm_gap:true,confirm_future:true};
 const b=await c.rpc('continue_billing_period',{p_request_id:f.keys[2],p_payload:f.continuation});assert.ifError(b.error);f.next=b.data.contract.id;
 fs.writeFileSync(fixture,JSON.stringify(f),{mode:0o600});
 console.log('Created legacy setup, correction/archive and continuation receipts under Slice 6; synthetic upgrade fixture ready');
}else{
 const f=JSON.parse(fs.readFileSync(fixture));
 const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await c.auth.signInWithPassword(f)).error);
 const checks=[];const report={source:'Real existing local Slice-6 schema upgraded with old synthetic receipts',checks,passed:false,cleanup:false};
 try{
  for(const [i,name,payload] of [[0,'setup_meter',f.setup],[1,'change_conditions',f.condition],[2,'continue_billing_period',f.continuation]]){
   assert.ifError((await c.rpc(name,{p_request_id:f.keys[i],p_payload:payload})).error);
   assert.equal((await c.rpc(name,{p_request_id:f.keys[i],p_payload:{...payload,grundpreis:999}})).error.code,'22023');
  }
  for(const t of ['meter_setup_requests','condition_requests','billing_continuation_requests'])assert.equal(sql(`SELECT created_at IS NULL AND recorded_at IS NOT NULL AND comparison_version=0 AND payload IS NOT NULL AND fingerprint IS NULL FROM public.${t} WHERE user_id='${f.account}'`),'t');
  checks.push('All three pre-upgrade receipts replay after later mutations; changed payload rejected; old payload retained, created_at NULL and real recorded_at');
  // Deleting only the result used to cascade away its receipt and unlock replay.
  sql(`DELETE FROM public.contracts WHERE id='${f.next}' AND meter_id='${f.meter}';`);
  assert.equal(sql(`SELECT period_id IS NULL FROM public.billing_continuation_requests WHERE user_id='${f.account}'`),'t');
  assert((await c.rpc('continue_billing_period',{p_request_id:f.keys[2],p_payload:f.continuation})).error);
  assert.equal((await c.from('contracts').select('id').eq('meter_id',f.meter)).data.length,1);
  checks.push('Legacy continuation receipt survives result-only deletion; retry cannot recreate result');
  assert.ifError((await c.from('meters').delete().eq('id',f.meter)).error);
  for(const [i,name,payload] of [[0,'setup_meter',f.setup],[1,'change_conditions',f.condition],[2,'continue_billing_period',f.continuation]])assert((await c.rpc(name,{p_request_id:f.keys[i],p_payload:payload})).error);
  checks.push('Meter deletion and all three legacy late replays never resurrect objects');report.passed=true;
 }finally{
  await c.from('meters').delete().eq('id',f.meter);assert.ifError((await admin.auth.admin.deleteUser(f.account)).error);
  for(const t of ['meter_setup_requests','condition_requests','billing_continuation_requests'])assert.equal(sql(`SELECT count(*) FROM public.${t} WHERE user_id='${f.account}'`),'0');
  report.cleanup=true;fs.unlinkSync(fixture);fs.writeFileSync(new URL('./upgrade.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify(report,null,2));
}
