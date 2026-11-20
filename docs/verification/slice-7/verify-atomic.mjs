// Late-error rollback for setup and continuation, plus legacy->versioned RPC transition.
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createClient} from '@supabase/supabase-js';
const config=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));assert.equal(config.API_URL,'http://127.0.0.1:54321');
const sql=s=>execFileSync('docker',['exec','-i','supabase_db_Parity','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:s,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}}),email=`slice7-atomic-${Date.now()}@example.test`,password=crypto.randomUUID();
const u=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(u.error);const account=u.data.user.id;
const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await c.auth.signInWithPassword({email,password})).error);
const report={source:'Real local client RPCs, late AFTER INSERT failure; rollback-only legacy function transition',checks:[],passed:false,cleanup:false};let table='';
const marker='slice7_atomic_fail';
const base={name:'Atomic synthetic',type:'electricity',provider:null,period_start:'2025-01-01',period_end:null,grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0};
const call=(name,payload,key)=>c.rpc(name,{p_request_id:key,p_payload:payload});
const install=t=>{table=t;sql(`CREATE FUNCTION public.${marker}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id='${account}'::uuid THEN RAISE EXCEPTION 'Own synthetic late failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER ${marker} AFTER INSERT ON public.${t} FOR EACH ROW EXECUTE FUNCTION public.${marker}();`);};
const remove=()=>{if(table)sql(`DROP TRIGGER IF EXISTS ${marker} ON public.${table}; DROP FUNCTION IF EXISTS public.${marker}();`);table='';};
const snapshot=rows=>rows.map(({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})=>({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor})).sort((a,b)=>a.id.localeCompare(b.id));
try{
 const sk=crypto.randomUUID();install('meter_setup_requests');assert((await call('setup_meter',base,sk)).error);assert.equal((await c.from('meters').select('id')).data.length,0);assert.equal(sql(`SELECT count(*) FROM public.meter_setup_requests WHERE user_id='${account}'`),'0');remove();const r=await call('setup_meter',base,sk);assert.ifError(r.error);
 report.checks.push('Setup forced AFTER receipt error leaves no meter/period/rate/reading/receipt; unchanged key+payload succeeds after removing injection');
 const p=(await c.from('contracts').select('*,rates(*)').eq('meter_id',r.data).single()).data;
 const bp={continuation_version:1,period_id:p.id,expected_periods:[{id:p.id,period_start:p.period_start,period_end:null,provider:null,settlement_amount:null,settlement_date:null}],expected_rates:snapshot(p.rates),period_start:'2026-01-01',period_end:null,provider:'New',grundpreis:12,arbeitspreis:32,abschlag:120,umrechnungsfaktor:1,confirm_boundary:true,confirm_gap:true,confirm_future:true};
 const bk=crypto.randomUUID();install('billing_continuation_requests');assert((await call('continue_billing_period',bp,bk)).error);const unchanged=(await c.from('contracts').select('*,rates(*)').eq('meter_id',r.data)).data;assert.equal(unchanged.length,1);assert.equal(unchanged[0].period_end,null);assert.equal(unchanged[0].rates.length,1);assert.equal(sql(`SELECT count(*) FROM public.billing_continuation_requests WHERE user_id='${account}'`),'0');remove();assert.ifError((await call('continue_billing_period',bp,bk)).error);
 report.checks.push('Continuation forced AFTER receipt error rolls back old-end update, result, rates and receipt; exact retry succeeds');
 // Reinstall previous/current definitions only within this uncommitted transaction.
 // Other API sessions continue seeing the final function; ROLLBACK restores it.
 const mr=await call('setup_meter',{...base,name:'Transition synthetic'},crypto.randomUUID());assert.ifError(mr.error);
 const op=(await c.from('contracts').select('*,rates(*)').eq('meter_id',mr.data).single()).data;
 const legacy={...bp,period_id:op.id,expected_periods:[{id:op.id,period_start:op.period_start,period_end:null,provider:null,settlement_amount:null,settlement_date:null}],expected_rates:snapshot(op.rates)};delete legacy.continuation_version;const lk=crypto.randomUUID();
 const m2=fs.readFileSync('supabase/migrations/20261119000002_write_integrity.sql','utf8');const old=m2.slice(m2.indexOf('CREATE OR REPLACE FUNCTION public.continue_billing_period'),m2.indexOf('-- The existing details editor'));
 const current=fs.readFileSync('supabase/migrations/20261119000004_continuation_replay_transition.sql','utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 const literal=JSON.stringify(legacy).replaceAll("'","''");
 const result=sql(`BEGIN; ${old}
 SELECT set_config('request.jwt.claim.sub','${account}',true);
 SET LOCAL ROLE authenticated;
 SELECT public.continue_billing_period('${lk}','${literal}'::jsonb)->>'confirmed';
 RESET ROLE;
 UPDATE public.billing_continuation_requests SET payload='${literal}'::jsonb,comparison_version=0,fingerprint=NULL,created_at=NULL WHERE user_id='${account}' AND request_id='${lk}';
 ${current}
 SET LOCAL ROLE authenticated;
 SELECT 'retained_legacy=' || (public.continue_billing_period('${lk}','${literal}'::jsonb)->>'confirmed');
 RESET ROLE;
 DELETE FROM public.contracts WHERE id=(SELECT period_id FROM public.billing_continuation_requests WHERE user_id='${account}' AND request_id='${lk}');
 -- Simulate the old CASCADE loss, limited to this test receipt.
 DELETE FROM public.billing_continuation_requests WHERE user_id='${account}' AND request_id='${lk}';
 UPDATE public.contracts SET period_end=NULL WHERE id='${op.id}';
 SET LOCAL ROLE authenticated;
 DO $$ BEGIN
  BEGIN
   PERFORM public.continue_billing_period('${lk}','${literal}'::jsonb);
   RAISE EXCEPTION 'Unexpected legacy recreation';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
 END $$;
 SELECT 'lost_legacy_blocked';
 ROLLBACK;`);
 assert(result.includes('retained_legacy=true'));assert(result.includes('lost_legacy_blocked'));assert.equal((await c.from('contracts').select('id').eq('meter_id',mr.data)).data.length,1);
 report.checks.push('Previous RPC genuinely creates unversioned request inside transaction; legacy receipt replays after installing final RPC; simulated old CASCADE loss fails closed; entire transition rolled back');report.passed=true;
}finally{remove();const own=await c.from('meters').select('id');for(const m of own.data||[])assert.ifError((await c.from('meters').delete().eq('id',m.id)).error);assert.ifError((await admin.auth.admin.deleteUser(account)).error);report.cleanup=true;fs.writeFileSync(new URL('./atomic.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
