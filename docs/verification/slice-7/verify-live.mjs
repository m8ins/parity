// Actual Auth/PostgREST roles plus privileged test instrumentation scoped to own IDs.
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createClient} from '@supabase/supabase-js';
const config=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:15000}));assert.equal(config.API_URL,'http://127.0.0.1:54321');
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const sql=s=>execFileSync('docker',['exec','-i','supabase_db_Parity','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const accounts=[],clients=[],meters=[];const report={source:'Real local Supabase Auth/PostgREST; synthetic accounts only',checked_at:new Date().toISOString(),checks:[],passed:false,cleanup:false};
const snap=rows=>rows.map(({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})=>({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})).sort((a,b)=>a.id.localeCompare(b.id));
const psnap=rows=>rows.map(({id,period_start,period_end,provider,settlement_amount,settlement_date})=>({id,period_start,period_end,provider,settlement_amount,settlement_date})).sort((a,b)=>a.id.localeCompare(b.id));
const base={name:'Slice 7 synthetic',type:'electricity',provider:'Synthetic',period_start:'2025-01-01',period_end:null,grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0};
const rpc=(c,name,payload,key=crypto.randomUUID())=>c.rpc(name,{p_request_id:key,p_payload:payload});
const load=async(c,m)=>{const r=await c.from('contracts').select('*,rates(*)').eq('meter_id',m).order('period_start');assert.ifError(r.error);return r.data;};
const condition=(p,overrides={})=>({contract_id:p.id,operation:'create',rate_id:null,effective_from:'2025-06-01',expected_period:{period_start:p.period_start,period_end:p.period_end},expected_rates:snap(p.rates),grundpreis:12,arbeitspreis:32,abschlag:120,umrechnungsfaktor:1,...overrides});
const continuation=periods=>({continuation_version:1,period_id:periods.at(-1).id,expected_periods:psnap(periods),expected_rates:snap(periods.at(-1).rates),period_start:'2026-01-01',period_end:null,provider:'New',grundpreis:12,arbeitspreis:32,abschlag:120,umrechnungsfaktor:1,confirm_boundary:true,confirm_gap:true,confirm_future:true});
const details=(p,overrides={})=>({p_period_id:p.id,p_expected:{period_start:p.period_start,period_end:p.period_end,provider:p.provider},p_start:p.period_start,p_provider:'Changed supplier',...overrides});
const setup=async(c,overrides={})=>{const r=await rpc(c,'setup_meter',{...base,...overrides});assert.ifError(r.error);meters.push(r.data);return r.data;};
let failure='';
try{
 for(let i=0;i<2;i++){const email=`slice7-${Date.now()}-${i}@example.test`,password=crypto.randomUUID();const u=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(u.error);accounts.push(u.data.user.id);const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await c.auth.signInWithPassword({email,password})).error);clients.push(c);}
 const [c,other]=clients, anon=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});
 const key=crypto.randomUUID();const all=await Promise.all(Array.from({length:8},()=>rpc(c,'setup_meter',base,key)));all.forEach(r=>assert.ifError(r.error));assert.equal(new Set(all.map(r=>r.data)).size,1);const m=all[0].data;meters.push(m);assert.equal((await c.from('meters').select('id')).data.length,1);
 assert.equal((await rpc(c,'setup_meter',{...base,name:'Other'},key)).error.code,'22023');
 // Server jsonb equality includes numeric scale equivalence, key order independence;
 // optional null/omission and array order remain significant just like old jsonb.
 const session=(await c.auth.getSession()).data.session;
 const fresh=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await fresh.auth.setSession(session)).error);
 const raw=JSON.stringify({p_request_id:key,p_payload:base}).replace('"grundpreis":10','"grundpreis":10.0000');
 const response=await fetch(config.API_URL+'/rest/v1/rpc/setup_meter',{method:'POST',headers:{apikey:config.ANON_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:raw});assert.equal(response.status,200);assert.equal(await response.json(),m);
 assert.equal((await rpc(c,'setup_meter',{...base,extra:null},key)).error.code,'22023');
 assert.equal((await rpc(fresh,'setup_meter',base,key)).data,m);
 assert.equal(sql(`SELECT comparison_version=1 AND payload IS NULL AND octet_length(fingerprint)=32 AND created_at IS NOT NULL AND recorded_at IS NOT NULL FROM public.meter_setup_requests WHERE user_id='${accounts[0]}' AND request_id='${key}'`),'t');
 report.checks.push('Setup: 8 concurrent identical calls = one four-row setup; changed payload denied; committed result discarded and fresh client retry finds same ID; numeric scale/key ordering equivalent; unknown/null keys significant; new minimal receipt timestamped');
 let p=(await load(c,m))[0];const cp=condition(p),ck=crypto.randomUUID();const creates=await Promise.all(Array.from({length:8},()=>rpc(c,'change_conditions',cp,ck)));creates.forEach(r=>assert.ifError(r.error));assert.equal((await load(c,m))[0].rates.length,2);assert.equal((await rpc(c,'change_conditions',{...cp,abschlag:1},ck)).error.code,'22023');
 p=(await load(c,m))[0];const old=p.rates.find(r=>r.effective_from==='2025-01-01');const correction=condition(p,{operation:'correct',rate_id:old.id,effective_from:old.effective_from,grundpreis:13});const rk=crypto.randomUUID();
 const corrections=await Promise.all(Array.from({length:8},()=>rpc(c,'change_conditions',correction,rk)));corrections.forEach(r=>assert.ifError(r.error));assert.equal((await c.from('condition_revisions').select('id').eq('contract_id',p.id)).data.length,1);
 p=(await load(c,m))[0];const del=condition(p,{operation:'delete',rate_id:old.id,effective_from:old.effective_from});const dk=crypto.randomUUID();assert.ifError((await rpc(c,'change_conditions',del,dk)).error);assert.ifError((await rpc(c,'change_conditions',del,dk)).error);assert.equal((await rpc(c,'change_conditions',correction,rk)).data.rates.length,1);assert.equal((await c.from('condition_revisions').select('id').eq('contract_id',p.id)).data.length,2);
 report.checks.push('Conditions: parallel create/correct mutate once; correction/delete archive once; older replay returns current history without restoring deleted rate');
 p=(await load(c,m))[0];const racecp=condition(p,{effective_from:'2025-09-01'});const race=await Promise.all([rpc(c,'change_conditions',racecp),rpc(c,'change_conditions',racecp)]);assert.equal(race.filter(r=>!r.error).length,1);assert(['40001','23505'].includes(race.find(r=>r.error).error.code));
 const rates=(await load(c,m))[0].rates;assert.equal(new Set(rates.map(r=>r.effective_from)).size,rates.length);
 // Declarative protection independently of RPC/trigger: two actual DB sessions,
 // each bypassing user triggers only inside its own test transaction.
 const direct=async()=>new Promise(resolve=>{import('node:child_process').then(({execFile})=>{const child=execFile('docker',['exec','-i','supabase_db_Parity','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],(error,stdout,stderr)=>resolve({error,stdout,stderr}));child.stdin.end(`BEGIN; SET LOCAL session_replication_role=replica; INSERT INTO public.rates(contract_id,effective_from) VALUES('${p.id}','2025-10-01'); COMMIT;`);});});
 const dbRace=await Promise.all([direct(),direct()]);assert.equal(dbRace.filter(r=>!r.error).length,1);assert(dbRace.find(r=>r.error).stderr.includes('rates_contract_effective_unique'));
 sql(`DELETE FROM public.rates WHERE contract_id='${p.id}' AND effective_from='2025-10-01';`);
 report.checks.push('Different concurrent condition requests cannot duplicate date; two database sessions bypassing triggers independently prove unique constraint rejects one competing insert');
 p=(await load(c,m))[0];
 for(const table of ['rates','contracts']){
  const id=table==='rates'?p.rates[0].id:p.id;
  for(const who of [c,other,anon]){
   assert((await who.from(table).insert(table==='rates'?{contract_id:p.id,effective_from:'2025-10-01'}:{meter_id:m,period_start:'2030-01-01'})).error);
   assert((await who.from(table).update(table==='rates'?{grundpreis:999}:{settlement_amount:999,period_start:'2024-01-01'}).eq('id',id)).error);
   assert((await who.from(table).delete().eq('id',id)).error);
  }
 }
 for(const table of ['meter_setup_requests','condition_requests','billing_continuation_requests','contracts_backup','readings_backup','contract_prices_backup','contract_payments_backup'])for(const who of [c,other,anon])assert((await who.from(table).select('*').limit(0)).error);
 assert((await c.from('meters').insert({user_id:accounts[0],name:'Bypass',type:'gas'})).error);assert((await c.from('meters').update({user_id:accounts[1]}).eq('id',m)).error);assert((await c.from('meters').update({type:'gas'}).eq('id',m)).error);assert((await c.from('meters').update({name:' '}).eq('id',m)).error);
 assert.ifError((await c.from('meters').update({name:'  Own renamed  '}).eq('id',m)).error);assert.equal((await c.from('meters').select('name').eq('id',m).single()).data.name,'Own renamed');
 for(const row of [{date:'2099-01-01',value:1},{date:'2025-01-01',value:-1},{date:'2025-01-01',value:'NaN'},{date:'infinity',value:1}])assert((await c.from('readings').insert({meter_id:m,...row})).error);
 assert((await other.from('readings').insert({meter_id:m,date:'2025-01-01',value:1})).error);assert((await c.from('readings').insert({meter_id:m,date:'2025-08-01',value:123.456789})).error);assert.ifError((await rpc(c,'record_reading',{meter_id:m,date:'2025-08-01',value:123.456789})).error);assert((await c.from('readings').update({value:999}).eq('meter_id',m)).error);
 for(const [name,payload] of [['setup_meter',base],['change_conditions',condition(p)],['continue_billing_period',continuation(await load(c,m))]]){assert((await rpc(anon,name,payload)).error);if(name!=='setup_meter')assert((await rpc(other,name,payload)).error);}
 for(const who of [other,anon])assert((await who.rpc('save_billing_period_details',details(p))).error);
 assert.deepEqual((await other.from('meters').update({name:'Foreign'}).eq('id',m).select()).data,[]);assert.deepEqual((await other.from('meters').select('id').eq('id',m)).data,[]);
 report.checks.push('Real owner/foreign/anonymous API calls cannot write rates/contracts or private receipts/archive/backups; meter creation/reassignment/type bypass denied; valid name and reading work, invalid/future/nonfinite reading and reassignment denied');
 // Force a late failure after archive AND rate update AND receipt INSERT.
 const failkey=crypto.randomUUID();p=(await load(c,m))[0];const target=p.rates[0];const failpayload=condition(p,{operation:'correct',rate_id:target.id,effective_from:target.effective_from,grundpreis:99});const revBefore=(await c.from('condition_revisions').select('id').eq('contract_id',p.id)).data.length;
 failure='slice7_fail_receipt';sql(`CREATE FUNCTION public.${failure}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id='${accounts[0]}'::uuid AND NEW.request_id='${failkey}'::uuid THEN RAISE EXCEPTION 'synthetic after receipt failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER ${failure} AFTER INSERT ON public.condition_requests FOR EACH ROW EXECUTE FUNCTION public.${failure}();`);
 assert((await rpc(c,'change_conditions',failpayload,failkey)).error);assert.equal((await load(c,m))[0].rates.find(r=>r.id===target.id).grundpreis,target.grundpreis);assert.equal((await c.from('condition_revisions').select('id').eq('contract_id',p.id)).data.length,revBefore);assert.equal(sql(`SELECT count(*) FROM public.condition_requests WHERE user_id='${accounts[0]}' AND request_id='${failkey}'`),'0');
 sql(`DROP TRIGGER ${failure} ON public.condition_requests; DROP FUNCTION public.${failure}();`);failure='';assert.ifError((await rpc(c,'change_conditions',failpayload,failkey)).error);assert.equal((await c.from('condition_revisions').select('id').eq('contract_id',p.id)).data.length,revBefore+1);
 report.checks.push('Failure injected after receipt insert rolls back rate, archive and receipt together; exact same-key retry succeeds after removing injection');
 p=(await load(c,m))[0];const args=details(p);const detail=await c.rpc('save_billing_period_details',args);assert.ifError(detail.error);assert.ifError((await c.rpc('save_billing_period_details',args)).error);assert.equal((await c.rpc('save_billing_period_details',{...args,p_provider:'Stale different'})).error.code,'40001');assert((await c.rpc('save_billing_period_details',details(detail.data,{p_start:'2025-12-01'}))).error);
 const end={p_period_id:p.id,p_expected_start:p.period_start,p_expected_end:null,p_end:'2026-01-01'};assert.ifError((await c.rpc('set_billing_period_end',end)).error);assert.ifError((await c.rpc('set_billing_period_end',end)).error);assert((await other.rpc('set_billing_period_end',end)).error);
 p=(await load(c,m))[0];const s={p_period_id:p.id,p_expected_period:{period_start:p.period_start,period_end:p.period_end},p_expected_amount:null,p_expected_date:null,p_amount:0,p_date:'2026-02-01'};assert.ifError((await c.rpc('save_billing_settlement',s)).error);assert.ifError((await c.rpc('save_billing_settlement',s)).error);assert.equal((await c.rpc('save_billing_settlement',{...s,p_amount:1})).error.code,'40001');assert((await other.rpc('save_billing_settlement',s)).error);
 report.checks.push('Details RPC preserves legit editing, confirms target replay, rejects stale and newly excluded rates; end and explicit-zero settlement remain absolute/retry-safe and account-scoped');

 const oldWithoutReceipt=continuation(await load(c,m));delete oldWithoutReceipt.continuation_version;
 const missingKey=crypto.randomUUID();assert.equal((await rpc(c,'continue_billing_period',oldWithoutReceipt,missingKey)).error.code,'40001');assert.equal((await load(c,m)).length,1);
 report.checks.push('Old-format continuation without surviving receipt fails closed, including potential pre-upgrade cascaded receipts; no result created');
 const bp=continuation(await load(c,m)),bk=crypto.randomUUID();const bs=await Promise.all(Array.from({length:8},()=>rpc(c,'continue_billing_period',bp,bk)));bs.forEach(r=>assert.ifError(r.error));assert.equal(new Set(bs.map(r=>r.data.contract.id)).size,1);assert.equal((await load(c,m)).length,2);assert.equal((await rpc(c,'continue_billing_period',{...bp,provider:'Other'},bk)).error.code,'22023');assert.ifError((await rpc(fresh,'continue_billing_period',bp,bk)).error);
 const next=bs[0].data.contract.id;sql(`DELETE FROM public.contracts WHERE id='${next}' AND meter_id='${m}';`);assert.equal(sql(`SELECT period_id IS NULL AND payload IS NULL AND comparison_version=1 FROM public.billing_continuation_requests WHERE user_id='${accounts[0]}' AND request_id='${bk}'`),'t');assert((await rpc(c,'continue_billing_period',bp,bk)).error);assert.equal((await load(c,m)).length,1);
 report.checks.push('Continuation: 8 same-key calls create one result; changed payload denied; discarded successful result recovered; new minimal receipt survives result deletion and blocks recreation');
 // Multiple rounds, different RPCs on one meter: no 40P01 accepted.
 for(let i=0;i<4;i++){
  const rm=await setup(c),periods=await load(c,rm),rp=periods[0];
  const results=await Promise.all([rpc(c,'change_conditions',condition(rp)),rpc(c,'continue_billing_period',continuation(periods)),c.rpc('set_billing_period_end',{p_period_id:rp.id,p_expected_start:rp.period_start,p_expected_end:null,p_end:'2026-03-01'}),c.rpc('save_billing_period_details',details(rp))]);
  for(const r of results)if(r.error)assert(['40001','22023','23505'].includes(r.error.code),JSON.stringify(r.error));
  const after=await load(c,rm);assert(after.length<=2);if(after.length===2)assert(after[0].period_end<=after[1].period_start);
 }
 report.checks.push('Four actual races between conditions, continuation, end and details: serialized valid state or explicit conflict, no deadlock accepted');
 assert.ifError((await c.from('meters').delete().eq('id',m)).error);for(const [name,payload,k] of [['setup_meter',base,key],['change_conditions',cp,ck],['continue_billing_period',bp,bk]])assert((await rpc(c,name,payload,k)).error);assert.equal((await c.from('meters').select('id').eq('id',m)).data.length,0);
 assert.equal(sql(`SELECT meter_id IS NULL FROM public.meter_setup_requests WHERE user_id='${accounts[0]}' AND request_id='${key}'`),'t');report.checks.push('Object deletion retains consumed keys; all three late replays reject without resurrection');
 const gas=await setup(other,{type:'gas',umrechnungsfaktor:10.71234567});assert.equal((await load(other,gas))[0].rates[0].umrechnungsfaktor,10.71234567);
 assert((await admin.auth.admin.deleteUser(accounts[1])).error,'Existing NO ACTION FK prevents unsupported account deletion with live meters');

 for(const table of ['meters','contracts','rates','readings'])assert.equal(sql(`SELECT has_table_privilege('authenticated','public.${table}','TRUNCATE') OR has_table_privilege('anon','public.${table}','TRUNCATE')`),'f');
 assert.equal(sql(`SELECT public.request_fingerprint_v1('{"b": [1.00, {"a":2.000}], "a":null}'::jsonb)=public.request_fingerprint_v1('{"a":null,"b":[1,{"a":2}]}'::jsonb)
 AND public.request_fingerprint_v1('[1,2]'::jsonb)<>public.request_fingerprint_v1('[2,1]'::jsonb)
 AND public.request_fingerprint_v1('{"a":null}'::jsonb)<>public.request_fingerprint_v1('{}'::jsonb)
 AND public.request_fingerprint_v1('{"a":1}'::jsonb)<>public.request_fingerprint_v1('{"a":"1"}'::jsonb)`),'t');
 report.checks.push('Recursive canonicalization preserves jsonb equality for nested numeric scale/key order, distinguishes array order, missing/null and string/number; no client TRUNCATE privileges');
 report.checks.push('Gas setup precision preserved; existing account-delete NO ACTION with live meters preserved');report.passed=true;
}finally{
 if(failure)sql(`DROP TRIGGER IF EXISTS ${failure} ON public.condition_requests; DROP FUNCTION IF EXISTS public.${failure}();`);
 for(const c of clients)for(const m of meters)assert.ifError((await c.from('meters').delete().eq('id',m)).error);
 for(const account of accounts){assert.ifError((await admin.auth.admin.deleteUser(account)).error);for(const t of ['meter_setup_requests','condition_requests','billing_continuation_requests','reading_requests','condition_revisions'])assert.equal(sql(`SELECT count(*) FROM public.${t} WHERE user_id='${account}'`),'0');}
 report.cleanup=true;fs.writeFileSync(new URL('./live-integration.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
