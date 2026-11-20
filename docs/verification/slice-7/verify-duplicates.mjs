// Rollback-only actual migration test, rerunnable before/after uniqueness rollout.
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync,spawnSync} from 'node:child_process';import {createClient} from '@supabase/supabase-js';
const config=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));assert.equal(config.API_URL,'http://127.0.0.1:54321');
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}}),email=`slice7-duplicates-${Date.now()}@example.test`,password=crypto.randomUUID();
const u=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(u.error);const account=u.data.user.id;
const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});assert.ifError((await c.auth.signInWithPassword({email,password})).error);let meter;
try{
 const r=await c.rpc('setup_meter',{p_request_id:crypto.randomUUID(),p_payload:{name:'Own duplicate fixture',type:'electricity',provider:null,period_start:'2025-01-01',period_end:null,grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0}});assert.ifError(r.error);meter=r.data;
 const p=(await c.from('contracts').select('*,rates(*)').eq('meter_id',meter).single()).data;
 const migration=fs.readFileSync('supabase/migrations/20261119000003_unique_condition_dates.sql','utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 const script=`BEGIN;
 -- Only this transaction sees the temporarily removed constraint. ROLLBACK restores it.
 ALTER TABLE public.rates DROP CONSTRAINT IF EXISTS rates_contract_effective_unique;
 SET LOCAL session_replication_role=replica;
 INSERT INTO public.rates(contract_id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor)
  SELECT contract_id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor FROM public.rates WHERE id='${p.rates[0].id}';
 SET LOCAL session_replication_role=origin;
 SAVEPOINT before_unique;
 ${migration}
 ROLLBACK TO SAVEPOINT before_unique;
 SELECT 'synthetic_duplicates=' || count(*) FROM public.rates WHERE contract_id='${p.id}' AND effective_from='2025-01-01';
 SELECT 'unique_installed=' || count(*) FROM pg_constraint WHERE conrelid='public.rates'::regclass AND conname='rates_contract_effective_unique';
 ROLLBACK;
 `;
 const result=spawnSync('docker',['exec','-i','supabase_db_Parity','psql','-U','postgres','-d','postgres','-At'],{input:script,encoding:'utf8'});
 // ON_ERROR_STOP intentionally absent so explicit savepoint/outer rollbacks run.
 assert.equal(result.status,0);assert(result.stderr.includes('Altdubletten in rates: Eindeutigkeit NICHT installiert'));assert(result.stdout.includes('synthetic_duplicates=2'));assert(result.stdout.includes('unique_installed=0'));
 assert.equal((await c.from('rates').select('id').eq('contract_id',p.id)).data.length,1);
 fs.writeFileSync(new URL('./duplicates.log',import.meta.url),result.stdout+result.stderr+'\nPASS expected specific migration failure; both duplicates retained inside test, no false constraint; all DDL/fixture duplication rolled back.\n');
 console.log('PASS actual unique migration refuses synthetic legacy duplicates without deduplication; transaction rolled back');
}finally{if(meter)assert.ifError((await c.from('meters').delete().eq('id',meter)).error);assert.ifError((await admin.auth.admin.deleteUser(account)).error);}
