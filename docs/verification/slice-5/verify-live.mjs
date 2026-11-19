// Real local Auth/PostgREST/PostgreSQL. Only fresh synthetic accounts are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
const config = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }));
assert.equal(config.API_URL, 'http://127.0.0.1:54321');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const accounts = [], clients = [], checks = [];
const dbContainer = 'supabase_db_Parity';
const failureProvider = `slice5-rollback-${crypto.randomUUID()}`;
let failureTrigger = false;
const sql = source => execFileSync('docker', ['exec', '-i', dbContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: source, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const report = { source: 'Real local Supabase, no mocks; only own synthetic accounts', checks, checked_at: new Date().toISOString(), cleanup: false };
const rateSnapshot = rows => [...rows].sort((a,b) => a.id.localeCompare(b.id)).map(({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor}) => ({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor}));
const periodSnapshot = rows => [...rows].sort((a,b) => a.id.localeCompare(b.id)).map(({id,period_start,period_end,provider,settlement_amount,settlement_date}) => ({id,period_start,period_end,provider,settlement_amount,settlement_date}));
async function load(c, meter) { const r = await c.from('contracts').select('*,rates(*)').eq('meter_id', meter).order('period_start'); assert.ifError(r.error); return r.data; }
function continuation(periods, overrides = {}) { const p = periods.at(-1); return { period_id: p.id, expected_periods: periodSnapshot(periods), expected_rates: rateSnapshot(p.rates), period_start: '2026-01-01', period_end: null, provider: 'New synthetic', grundpreis: 0, arbeitspreis: 32.123456, abschlag: 0, umrechnungsfaktor: 1, confirm_boundary: true, confirm_gap: true, confirm_future: true, ...overrides }; }
const call = (c, p, request = crypto.randomUUID()) => c.rpc('continue_billing_period', { p_request_id: request, p_payload: p });
function settlement(p, amount, date = '2026-01-02') { return { p_period_id:p.id, p_expected_period:{period_start:p.period_start,period_end:p.period_end}, p_expected_amount:p.settlement_amount, p_expected_date:p.settlement_date, p_amount:amount, p_date:date }; }
async function setup(c, overrides = {}) {
  const result = await c.rpc('setup_meter', { p_request_id:crypto.randomUUID(),p_payload:{ name:'Slice 5 synthetic',type:'electricity',provider:'Old synthetic',period_start:'2025-01-01',period_end:null,grundpreis:10,arbeitspreis:30,abschlag:100,umrechnungsfaktor:1,reading_date:'2025-01-01',reading_value:0,...overrides } });
  assert.ifError(result.error); return result.data;
}
try {
  for (let i=0;i<2;i++) {
    const email=`slice5-${Date.now()}-${i}@example.test`, password=crypto.randomUUID();
    const r=await admin.auth.admin.createUser({email,password,email_confirm:true}); assert.ifError(r.error); accounts.push(r.data.user.id);
    const c=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});
    assert.ifError((await c.auth.signInWithPassword({email,password})).error); clients.push(c);
  }
  const [c,other]=clients;
  const meter=await setup(c);
  let periods=await load(c,meter), old=periods[0];
  assert((await c.rpc('save_billing_settlement',settlement(old,0))).error);
  checks.push('Open period cannot record an actual settlement');
  assert.ifError((await c.from('rates').insert([{contract_id:old.id,effective_from:'2026-01-01',grundpreis:11,arbeitspreis:31,abschlag:110,umrechnungsfaktor:1},{contract_id:old.id,effective_from:'2026-06-01',grundpreis:12,arbeitspreis:35,abschlag:120,umrechnungsfaktor:1}])).error);
  periods=await load(c,meter); old=periods[0];
  const p=continuation(periods), request=crypto.randomUUID();
  assert((await call(other,p)).error);
  assert((await call(c,{...p,confirm_boundary:false})).error);
  assert((await call(c,{...p,confirm_future:false})).error);
  assert((await call(c,{...p,period_end:'2026-06-01'})).error);
  assert.equal((await load(c,meter)).length,1);
  checks.push('Foreign account, missing confirmations and a too-short new end rejected atomically');
  // Temporary test-only trigger matches this run's unguessable synthetic supplier.
  // AFTER new-period INSERT proves the previous end change is rolled back too.
  sql(`BEGIN; CREATE FUNCTION public.slice5_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.provider = '${failureProvider}' THEN RAISE EXCEPTION 'synthetic post-write failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER slice5_test_fail AFTER INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.slice5_test_fail(); COMMIT;`);
  failureTrigger=true;
  const failureKey=crypto.randomUUID();
  assert((await call(c,{...p,provider:failureProvider},failureKey)).error);
  const afterFailure=await load(c,meter); assert.equal(afterFailure.length,1); assert.equal(afterFailure[0].period_end,null); assert.equal(afterFailure[0].rates.length,3);
  sql('BEGIN; DROP TRIGGER slice5_test_fail ON public.contracts; DROP FUNCTION public.slice5_test_fail(); COMMIT;'); failureTrigger=false;
  assert.ifError((await call(c,{...p,provider:failureProvider},failureKey)).error);
  // Separate rollback fixture from the parallel-success fixture.
  const rolled=await load(c,meter); assert.equal(rolled.length,2);
  assert.ifError((await c.from('contracts').delete().eq('id',rolled[1].id)).error);
  assert.ifError((await c.rpc('set_billing_period_end',{p_period_id:old.id,p_expected_start:old.period_start,p_expected_end:'2026-01-01',p_end:null})).error);
  checks.push('Forced failure after old-end update and new-period insert rolls back every write and receipt; same key succeeds after test trigger removal');
  const replies=await Promise.all(Array.from({length:8},()=>call(c,p,request)));
  replies.forEach(r=>{assert.ifError(r.error);assert(r.data.confirmed);assert.equal(r.data.rates.length,2);});
  periods=await load(c,meter); assert.equal(periods.length,2); assert.equal(periods[0].period_end,'2026-01-01');
  assert.equal(periods[0].rates.length,3); assert.equal(periods[1].rates.length,2);
  assert.equal(periods[1].rates.find(r=>r.effective_from==='2026-01-01').grundpreis,0);
  assert.equal(periods[1].rates.find(r=>r.effective_from==='2026-06-01').arbeitspreis,35);
  assert((await call(c,{...p,provider:'Different'},request)).error);
  assert.equal((await call(c,p)).error.code,'40001');
  assert((await c.from('billing_continuation_requests').select('*')).error);
  checks.push('Eight exact retries create one period; original conditions retained; exact-start not duplicated; later full values copied; private purpose-bound receipt');
  old=periods[0]; const s=settlement(old,0);
  assert((await other.rpc('save_billing_settlement',s)).error);
  assert.ifError((await c.rpc('save_billing_settlement',s)).error);
  assert.ifError((await c.rpc('save_billing_settlement',s)).error);
  assert.equal((await c.rpc('save_billing_settlement',{...s,p_amount:-123.456})).error.code,'40001');
  old=(await load(c,meter))[0];
  assert.ifError((await c.rpc('save_billing_settlement',settlement(old,-123.456))).error);
  old=(await load(c,meter))[0]; assert.equal(old.settlement_amount,-123.456);
  assert((await c.rpc('save_billing_settlement',settlement(old,12,'2099-01-01'))).error);
  assert((await c.rpc('save_billing_settlement',settlement(old,12,'2024-12-31'))).error);
  assert((await c.rpc('save_billing_settlement',{...settlement(old,12),p_expected_period:{period_start:old.period_start,period_end:null}})).error);
  checks.push('Settlement stores explicit zero and negative precision; same absolute retry succeeds; stale amount, period, foreign access and invalid dates fail');
  assert((await c.rpc('set_billing_period_end',{p_period_id:old.id,p_expected_start:old.period_start,p_expected_end:old.period_end,p_end:null})).error);
  assert((await c.from('contracts').update({period_end:'2026-02-01'}).eq('id',old.id)).error);
  assert((await c.from('contracts').insert({meter_id:meter,period_start:'2025-12-01'})).error);
  const stale=continuation(await load(c,meter),{period_start:'2027-01-01'});
  assert.ifError((await c.from('contracts').update({provider:'Concurrent detail'}).eq('id',stale.period_id)).error);
  assert.equal((await call(c,stale)).error.code,'40001');
  const rr=await call(c,p,request); assert.ifError(rr.error); assert.equal(rr.data.contract.provider,'Concurrent detail');
  checks.push('End RPC and legacy direct interval writes cannot overlap; full period snapshot catches direct detail changes; old retry returns current records');
  const gapMeter=await setup(c,{period_end:'2025-07-01'}); let gapPeriods=await load(c,gapMeter);
  assert((await call(c,continuation(gapPeriods,{confirm_gap:false}))).error);
  assert.ifError((await call(c,continuation(gapPeriods))).error);
  assert.equal((await load(c,gapMeter))[0].period_end,'2025-07-01');
  const gasMeter=await setup(c,{type:'gas',umrechnungsfaktor:10.71234567}); const gasPeriods=await load(c,gasMeter);
  assert.ifError((await call(c,continuation(gasPeriods,{period_start:'2025-02-01',umrechnungsfaktor:10.91234567}))).error);
  assert.equal((await load(c,gasMeter))[1].rates[0].umrechnungsfaktor,10.91234567);
  checks.push('Confirmed gap preserves old end; backdated transition and full gas factor precision persist');
  const raceMeter=await setup(c); const racePeriods=await load(c,raceMeter), raceOld=racePeriods[0];
  const racePayload=continuation(racePeriods);
  const conditionPayload={contract_id:raceOld.id,operation:'create',rate_id:null,effective_from:'2025-10-01',expected_period:{period_start:raceOld.period_start,period_end:null},expected_rates:rateSnapshot(raceOld.rates),grundpreis:15,arbeitspreis:40,abschlag:120,umrechnungsfaktor:1};
  const race=await Promise.all([
    call(c,racePayload), call(c,{...racePayload,period_start:'2026-02-01'}),
    c.rpc('set_billing_period_end',{p_period_id:raceOld.id,p_expected_start:raceOld.period_start,p_expected_end:null,p_end:'2026-03-01'}),
    c.rpc('change_conditions',{p_request_id:crypto.randomUUID(),p_payload:conditionPayload}),
    c.from('contracts').update({provider:'Race detail'}).eq('id',raceOld.id).select(),
  ]);
  for (const r of race) if (r.error) assert(['40001','40P01','22023'].includes(r.error.code),r.error.message);
  const raced=await load(c,raceMeter); assert(raced.length<=2);
  for (let i=1;i<raced.length;i++) assert(raced[i-1].period_end && raced[i-1].period_end<=raced[i].period_start);
  const insertMeter=await setup(c,{period_end:'2029-01-01'});
  const insertRace=await Promise.all(['2030-01-01','2030-06-01'].map(period_start=>c.from('contracts').insert({meter_id:insertMeter,period_start,period_end:'2031-01-01'})));
  const finalRace=await load(c,insertMeter);
  for (let i=1;i<finalRace.length;i++) assert(finalRace[i-1].period_end && finalRace[i-1].period_end<=finalRace[i].period_start);
  assert.equal(insertRace.filter(r=>!r.error).length,1);
  checks.push('Real parallel differing continuations/end/condition/detail writes reject conflicts or rollback deadlocks; concurrent direct inserts never introduce overlaps');
  const finiteMeter=await setup(c); let finite=await load(c,finiteMeter);
  assert.ifError((await call(c,continuation(finite,{provider:finite[0].provider,period_start:'2025-02-01',period_end:'2025-02-02'}))).error);
  finite=await load(c,finiteMeter); assert.equal(finite[1].period_end,'2025-02-02'); assert.equal(finite[1].provider,finite[0].provider);
  assert.ifError((await call(c,continuation(finite,{provider:finite[1].provider,period_start:'2025-02-02',period_end:'2026-02-02'}))).error);
  finite=await load(c,finiteMeter); assert.equal(finite.length,3); assert.equal(finite[2].period_end,'2026-02-02'); assert.equal(finite[2].provider,finite[0].provider);
  checks.push('Same supplier persists across a one-day and an annual period; exclusive boundaries are adjacent without overlap');
  const anon=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}}); assert((await call(anon,p)).error); assert((await anon.rpc('save_billing_settlement',settlement(old,0))).error);
  for (const table of ['meters','contracts','rates']) { const r=await other.from(table).select('*'); assert.ifError(r.error); assert.equal(r.data.length,0); }
  checks.push('Anonymous execution denied and second account sees no synthetic household rows');
  report.passed=true;
} finally {
  if (failureTrigger) sql('BEGIN; DROP TRIGGER IF EXISTS slice5_test_fail ON public.contracts; DROP FUNCTION IF EXISTS public.slice5_test_fail(); COMMIT;');
  for (const c of clients) { const own=await c.from('meters').select('id'); for (const m of own.data||[]) assert.ifError((await c.from('meters').delete().eq('id',m.id)).error); }
  for (const id of accounts) assert.ifError((await admin.auth.admin.deleteUser(id)).error);
  report.cleanup=true;
  fs.writeFileSync(new URL('./live-integration.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
