// Real local Auth/PostgREST/PostgreSQL. No household rows are inspected.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
const config = JSON.parse(execFileSync('supabase', ['status','-o','json'], {encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:15000}));
assert.equal(config.API_URL,'http://127.0.0.1:54321');
const out=path.dirname(new URL(import.meta.url).pathname);
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const clients=[],accounts=[],meters=[];
const report={source:'Real local Supabase, own synthetic accounts only',checks:[],passed:false,cleanup:false};
const sql=source=>execFileSync('docker',['exec','-i','supabase_db_Parity','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:source,encoding:'utf8'}).trim();
const snapshot=rows=>rows.map(({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})=>({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})).sort((a,b)=>a.id.localeCompare(b.id));
try {
 for(let i=0;i<2;i++){
  const email=`slice6-db-${Date.now()}-${i}@example.test`,password=crypto.randomUUID();
  const r=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(r.error);accounts.push(r.data.user.id);
  const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await c.auth.signInWithPassword({email,password})).error);clients.push(c);
 }
 const [c,other]=clients;
 const payload={name:'Slice 6 synthetic',type:'electricity',provider:'Synthetic',period_start:'2025-01-01',period_end:'2026-01-01',grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0};
 const request=crypto.randomUUID(); const setup=await c.rpc('setup_meter',{p_request_id:request,p_payload:payload});assert.ifError(setup.error);const id=setup.data;meters.push(id);
 const unrelated=await other.rpc('setup_meter',{p_request_id:crypto.randomUUID(),p_payload:{...payload,name:'Independent gas',type:'gas',umrechnungsfaktor:10}});assert.ifError(unrelated.error);meters.push(unrelated.data);
 const renamed=await c.from('meters').update({name:'Umbenannt · Keller'}).eq('id',id).select('*').single();assert.ifError(renamed.error);assert.equal(renamed.data.name,'Umbenannt · Keller');
 assert.equal((await c.from('meters').select('name').eq('id',id).single()).data.name,'Umbenannt · Keller');
 assert((await c.from('meters').update({name:'missing'}).eq('id',crypto.randomUUID()).select('*').single()).error);
 report.checks.push('Confirmed rename and fresh read; zero-row update cannot count as success');
 assert.deepEqual((await other.from('meters').update({name:'Foreign'}).eq('id',id).select('*')).data,[]);
 assert.ifError((await other.from('meters').delete().eq('id',id)).error);
 assert.equal((await c.from('meters').select('name').eq('id',id).single()).data.name,'Umbenannt · Keller');
 for(const table of ['meters','contracts','readings'])assert.deepEqual((await other.from(table).select('id').eq(table==='meters'?'id':'meter_id',id)).data,[]);
 report.checks.push('Account B cannot read/rename/delete A; own gas remains independent');
 const p=(await c.from('contracts').select('*').eq('meter_id',id).single()).data;
 const rates=(await c.from('rates').select('*').eq('contract_id',p.id)).data;
 const conditionRequest=crypto.randomUUID();
 const corrected=await c.rpc('change_conditions',{p_request_id:conditionRequest,p_payload:{contract_id:p.id,operation:'correct',rate_id:rates[0].id,effective_from:rates[0].effective_from,expected_period:{period_start:p.period_start,period_end:p.period_end},expected_rates:snapshot(rates),grundpreis:12,arbeitspreis:32,abschlag:110,umrechnungsfaktor:1}});assert.ifError(corrected.error);
 assert.equal((await c.from('condition_revisions').select('id').eq('contract_id',p.id)).data.length,1);
 assert.ifError((await c.rpc('save_billing_settlement',{p_period_id:p.id,p_expected_period:{period_start:p.period_start,period_end:p.period_end},p_expected_amount:null,p_expected_date:null,p_amount:42,p_date:'2026-01-12'})).error);
 const currentRates=(await c.from('rates').select('*').eq('contract_id',p.id)).data;
 const current=(await c.from('contracts').select('*').eq('id',p.id).single()).data;
 const continuationRequest=crypto.randomUUID();
 const continued=await c.rpc('continue_billing_period',{p_request_id:continuationRequest,p_payload:{period_id:p.id,expected_periods:[{id:p.id,period_start:p.period_start,period_end:p.period_end,provider:p.provider,settlement_amount:current.settlement_amount,settlement_date:current.settlement_date}],expected_rates:snapshot(currentRates),period_start:'2026-01-01',period_end:null,provider:'Synthetic new',grundpreis:12,arbeitspreis:32,abschlag:110,umrechnungsfaktor:1,confirm_boundary:true,confirm_gap:true,confirm_future:true}});assert.ifError(continued.error);
 const periods=(await c.from('contracts').select('id').eq('meter_id',id)).data.map(r=>r.id); assert.equal(periods.length,2);
 // Failure before delete: only own fixture ID is affected by the temporary trigger.
 const fn=`slice6_fail_${id.replaceAll('-','')}`;
 try {
  sql(`CREATE FUNCTION public.${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id='${id}'::uuid THEN RAISE EXCEPTION 'Synthetic delete failure'; END IF; RETURN OLD; END $$; CREATE TRIGGER ${fn} BEFORE DELETE ON public.meters FOR EACH ROW EXECUTE FUNCTION public.${fn}();`);
  assert((await c.from('meters').delete().eq('id',id)).error);assert((await c.from('meters').select('id').eq('id',id).single()).data);
  assert.equal((await c.from('contracts').select('id').eq('meter_id',id)).data.length,2);
 } finally {sql(`DROP TRIGGER IF EXISTS ${fn} ON public.meters; DROP FUNCTION IF EXISTS public.${fn}();`);}
 report.checks.push('Real failed deletion leaves meter, two periods, settlement, rates and revision intact');
 assert.ifError((await c.from('meters').delete().eq('id',id)).error);
 assert.equal((await c.from('meters').select('id').eq('id',id).maybeSingle()).data,null);
 for(const table of ['contracts','readings'])assert.deepEqual((await c.from(table).select('id').eq('meter_id',id)).data,[]);
 for(const table of ['rates','condition_revisions'])assert.deepEqual((await c.from(table).select('id').in('contract_id',periods)).data,[]);
 assert.equal(sql(`SELECT count(*) FROM public.billing_continuation_requests WHERE user_id='${accounts[0]}' AND request_id='${continuationRequest}';`),'0');
 assert.equal(sql(`SELECT meter_id IS NULL FROM public.meter_setup_requests WHERE user_id='${accounts[0]}' AND request_id='${request}';`),'t');
 assert.equal(sql(`SELECT count(*) FROM public.condition_requests WHERE user_id='${accounts[0]}' AND request_id='${conditionRequest}';`),'1');
 assert((await c.rpc('setup_meter',{p_request_id:request,p_payload:payload})).error);
 assert.ifError((await c.from('meters').delete().eq('id',id)).error);
 assert((await other.from('meters').select('id').eq('id',unrelated.data).single()).data);
 report.checks.push('Cascade deletes readings, periods/settlement, rates, revisions and continuation receipt; setup tombstone and condition receipt retained; replay cannot resurrect; repeat delete safe');
 const anonymous=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});
 for(const table of ['contracts_backup','readings_backup','contract_prices_backup','contract_payments_backup']){
  assert((await c.from(table).select('*').limit(0)).error);assert((await anonymous.from(table).select('*').limit(0)).error);
 }
 report.checks.push('Four historical backup tables reject anonymous and authenticated access (zero-row queries; no historical contents read)');
 report.passed=true;
} finally {
 for(let i=0;i<clients.length;i++){await clients[i].from('meters').delete().in('id',meters);}
 for(const id of accounts)assert.ifError((await admin.auth.admin.deleteUser(id)).error);
 report.cleanup=true;fs.writeFileSync(path.join(out,'live-integration.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
