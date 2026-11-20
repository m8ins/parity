// Real localhost only; creates and removes only its own synthetic accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
const config = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
assert.equal(config.API_URL, 'http://127.0.0.1:54321');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const accounts = [], clients = [], checks = [];
const report = { source: 'Real local Supabase Auth/PostgREST/PostgreSQL, no mocks', checks, cleanup: false };
const setup = { name: 'Slice 4 synthetic electricity', type: 'electricity', provider: 'Synthetic', period_start: '2025-01-01', period_end: '2025-02-01', grundpreis: 10, arbeitspreis: 30, abschlag: 100, umrechnungsfaktor: 1, reading_date: '2025-01-01', reading_value: 0 };
const snapshot = rows => [...rows].sort((a,b) => a.id.localeCompare(b.id)).map(({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor}) => ({id,effective_from,grundpreis,arbeitspreis,abschlag,umrechnungsfaktor}));
async function load(client, id) { const r = await client.from('contracts').select('*,rates(*)').eq('id', id).single(); assert.ifError(r.error); return r.data; }
function payload(period, overrides = {}) { return { contract_id: period.id, operation: 'create', rate_id: null, effective_from: '2025-01-16', expected_period: { period_start: period.period_start, period_end: period.period_end }, expected_rates: snapshot(period.rates), grundpreis: 10, arbeitspreis: 40, abschlag: 100, umrechnungsfaktor: 1, ...overrides }; }
async function call(client, p, request = crypto.randomUUID()) { return client.rpc('change_conditions', { p_request_id: request, p_payload: p }); }
try {
  for (let i = 0; i < 2; i++) {
    const email = `slice4-${Date.now()}-${i}@example.test`, password = crypto.randomUUID();
    const r = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(r.error); accounts.push(r.data.user.id);
    const client = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
    assert.ifError((await client.auth.signInWithPassword({ email, password })).error); clients.push(client);
  }
  const c = clients[0], other = clients[1];
  const meter = await c.rpc('setup_meter', { p_request_id: crypto.randomUUID(), p_payload: setup }); assert.ifError(meter.error);
  const contracts = await c.from('contracts').select('*').eq('meter_id', meter.data); assert.ifError(contracts.error);
  const id = contracts.data[0].id;
  let period = await load(c, id);
  const original = period.rates[0];
  // Later data must survive a subsequent backdated insertion.
  assert.ifError((await call(c, payload(period, { effective_from: '2025-01-25', arbeitspreis: 50, abschlag: 200 }))).error);
  period = await load(c, id);
  const request = crypto.randomUUID(), p = payload(period, { grundpreis: 20, abschlag: 150 });
  const concurrent = await Promise.all(Array.from({ length: 8 }, () => call(c, p, request)));
  concurrent.forEach(r => { assert.ifError(r.error); assert(r.data.confirmed); assert.equal(r.data.rates.length, 3); });
  period = await load(c, id); assert.equal(period.rates.length, 3);
  assert.equal(period.rates.find(r => r.effective_from === '2025-01-25').arbeitspreis, 50);
  checks.push('Eight parallel retries create exactly one backdated change and preserve the later snapshot');
  assert((await call(c, { ...p, arbeitspreis: 99 }, request)).error);
  assert.equal((await call(c, p, crypto.randomUUID())).error.code, '40001');
  checks.push('Changed request payload and stale expected history are rejected');
  for (const date of ['2024-12-31', '2025-02-01', '2025-02-02']) assert((await call(c, payload(period, { effective_from: date }))).error);
  assert((await call(c, payload(period, { effective_from: '2025-01-01' }))).error);
  // Future contractual information allowed: no current-day cutoff.
  const future = await c.rpc('setup_meter', { p_request_id: crypto.randomUUID(), p_payload: { ...setup, name: 'Slice 4 future', period_end: '2030-01-01' } }); assert.ifError(future.error);
  const fp = await c.from('contracts').select('id').eq('meter_id', future.data).single();
  const futurePeriod = await load(c, fp.data.id);
  assert.ifError((await call(c, payload(futurePeriod, { effective_from: '2029-12-01', abschlag: 0 }))).error);
  checks.push('Before/start duplicate/end/after boundaries checked; known future changes are permitted');
  for (const table of ['meters', 'contracts', 'rates', 'condition_revisions']) { const r = await other.from(table).select('*'); assert.ifError(r.error); assert.equal(r.data.length, 0); }
  assert((await call(other, payload(period))).error);
  assert((await other.from('rates').insert({ contract_id: id, effective_from: '2025-01-20', grundpreis: 0, arbeitspreis: 0, abschlag: 0 })).error);
  assert((await c.from('condition_requests').select('*')).error);
  assert((await c.from('condition_revisions').insert({ user_id: accounts[0], contract_id: id, rate_id: original.id, operation: 'delete', previous: original })).error);
  checks.push('Second account cannot read or change household rows; receipts and archive writes are private');
  // Correction of the existing start is explicit and archives its previous values.
  assert.ifError((await c.from('contracts').update({ settlement_amount: 328, settlement_date: '2025-03-01' }).eq('id', id)).error);
  period = await load(c, id);
  const correction = payload(period, { operation: 'correct', rate_id: original.id, effective_from: '2025-01-01', grundpreis: 0, arbeitspreis: 31.234567, abschlag: 0 });
  assert.ifError((await call(c, correction)).error);
  period = await load(c, id); assert.equal(period.settlement_amount, 328);
  const revisions = await c.from('condition_revisions').select('*').eq('contract_id', id); assert.ifError(revisions.error);
  assert.equal(revisions.data.length, 1); assert.equal(revisions.data[0].previous.arbeitspreis, 30); assert.equal(period.rates.find(r => r.id === original.id).arbeitspreis, 31.234567);
  assert((await c.from('condition_revisions').update({ previous: {} }).eq('id', revisions.data[0].id).select()).error);
  checks.push('Historical settled start correction retains original values and leaves recorded settlement unchanged');
  const deleteRequest = crypto.randomUUID(), deletion = payload(period, { operation: 'delete', rate_id: original.id, effective_from: original.effective_from });
  assert.ifError((await call(c, deletion, deleteRequest)).error);
  const deleted = await load(c, id); assert.equal(deleted.rates.length, 2); assert(!deleted.rates.some(r => r.id === original.id));
  assert.ifError((await call(c, deletion, deleteRequest)).error);
  assert.equal((await c.from('condition_revisions').select('*').eq('contract_id', id)).data.length, 2);
  // Replaying the older successful create never resurrects deleted data or returns an old snapshot.
  const replay = await call(c, p, request); assert.ifError(replay.error); assert.equal(replay.data.rates.length, 2);
  checks.push('Delete archives original, permits an explicit gap, retries exactly once, and old replay returns current history');
  const gasMeter = await c.rpc('setup_meter', { p_request_id: crypto.randomUUID(), p_payload: { ...setup, name: 'Slice 4 synthetic gas', type: 'gas', umrechnungsfaktor: 10 } }); assert.ifError(gasMeter.error);
  const gc = await c.from('contracts').select('id').eq('meter_id', gasMeter.data).single(); let gas = await load(c, gc.data.id);
  assert.ifError((await call(c, payload(gas, { arbeitspreis: 12.345678, umrechnungsfaktor: 10.71234567, abschlag: 0 }))).error);
  const session = (await c.auth.getSession()).data.session;
  const fresh = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } }); await fresh.auth.setSession(session);
  gas = await load(fresh, gas.id); assert.equal(gas.rates.find(r => r.effective_from === '2025-01-16').umrechnungsfaktor, 10.71234567);
  assert.equal((await load(fresh, id)).rates.length, 2);
  checks.push('Fresh authenticated client reads electricity and gas independently with zero and full factor precision');
  // A failed correction must roll back its archive insertion and receipt too.
  const count = (await c.from('condition_revisions').select('*').eq('contract_id', gas.id)).data.length;
  const badKey = crypto.randomUUID(), bad = payload(gas, { operation: 'correct', rate_id: gas.rates[0].id, effective_from: gas.rates[0].effective_from, umrechnungsfaktor: 0 });
  assert((await call(c, bad, badKey)).error);
  assert.equal((await c.from('condition_revisions').select('*').eq('contract_id', gas.id)).data.length, count);
  assert.ifError((await call(c, { ...bad, umrechnungsfaktor: 11 }, badKey)).error);
  const anon = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } }); assert((await call(anon, p)).error);
  checks.push('Failed correction rolls back archive and receipt; anonymous execution denied');
  const openMeter = await c.rpc('setup_meter', { p_request_id: crypto.randomUUID(), p_payload: { ...setup, name: 'Open synthetic period', period_start: '2025-11-01', period_end: null, reading_date: '2025-11-01' } }); assert.ifError(openMeter.error);
  const openContract = await c.from('contracts').select('id').eq('meter_id', openMeter.data).single();
  let open = await load(c, openContract.data.id);
  assert.equal(open.period_end, null);
  assert.ifError((await call(c, payload(open, { effective_from: '2026-12-01', abschlag: 115 }))).error);
  open = await load(c, open.id); assert.equal(open.period_end, null); assert.equal(open.rates.length, 2);
  const endArgs = { p_period_id: open.id, p_expected_start: open.period_start, p_expected_end: null, p_end: '2027-01-01' };
  assert((await other.rpc('set_billing_period_end', endArgs)).error);
  const endResult = await c.rpc('set_billing_period_end', endArgs); assert.ifError(endResult.error); assert.equal(endResult.data.period_end, '2027-01-01');
  const endRetry = await c.rpc('set_billing_period_end', endArgs); assert.ifError(endRetry.error); assert.deepEqual(endRetry.data, endResult.data);
  assert((await c.rpc('set_billing_period_end', { ...endArgs, p_end: '2027-02-01' })).error);
  assert((await c.rpc('set_billing_period_end', { ...endArgs, p_expected_end: '2027-01-01', p_end: '2025-10-31' })).error);
  assert.ifError((await c.rpc('set_billing_period_end', { ...endArgs, p_expected_end: '2027-01-01', p_end: null })).error);
  assert.equal((await load(fresh, open.id)).period_end, null);
  assert.ifError((await c.from('contracts').insert({ meter_id: openMeter.data, period_start: '2027-01-01', period_end: '2028-01-01' })).error);
  assert((await c.rpc('set_billing_period_end', { ...endArgs, p_end: '2027-02-01' })).error);
  assert((await c.rpc('set_billing_period_end', { ...endArgs, p_end: null })).error);
  assert.ifError((await c.rpc('set_billing_period_end', endArgs)).error);
  checks.push('Open end stays NULL after a new condition beyond one year; inclusive-end boundary persists, identical end retry is a no-op, stale/invalid/foreign/overlapping edits are rejected, reopening persists');

} finally {
  for (let i = 0; i < clients.length; i++) {
    const own = await clients[i].from('meters').select('id');
    for (const meter of own.data || []) assert.ifError((await clients[i].from('meters').delete().eq('id', meter.id)).error);
  }
  for (const id of accounts) assert.ifError((await admin.auth.admin.deleteUser(id)).error);
  report.cleanup = true;
  fs.writeFileSync(new URL('./live-integration.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
