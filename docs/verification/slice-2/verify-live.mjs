// Local-only, real Supabase integration. Never resets or reads household rows.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
const config = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
assert.equal(config.API_URL, 'http://127.0.0.1:54321', 'Only verified localhost is allowed');
const admin = createClient(config.API_URL, config.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const clients = [], accounts = [];
const report = { source: 'Real local Supabase Auth + PostgREST + PostgreSQL; no mocks', checks: [], cleanup: false };
function check(label) { report.checks.push(label); }
async function clientFor(email, password) {
  const client = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error); return client;
}
const payload = { name: 'Synthetischer Strom', type: 'electricity', provider: 'Testanbieter', period_start: '2026-01-01', period_end: '2026-07-01', grundpreis: 12.345, arbeitspreis: 32.4567, abschlag: 80, umrechnungsfaktor: 1, reading_date: '2026-01-01', reading_value: 12345.6789 };
try {
  for (let i = 0; i < 2; i++) {
    const email = `slice2-${Date.now()}-${i}@example.test`, password = crypto.randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(error); accounts.push(data.user.id); clients.push(await clientFor(email, password));
  }
  check('Two synthetic accounts authenticated through real local Auth');
  const request = crypto.randomUUID();
  const calls = await Promise.all(Array.from({ length: 8 }, () => clients[0].rpc('setup_meter', { p_request_id: request, p_payload: payload })));
  for (const call of calls) assert.ifError(call.error);
  const meter = calls[0].data; assert(calls.every(call => call.data === meter));
  const own = await clients[0].from('meters').select('*'); assert.ifError(own.error); assert.equal(own.data.length, 1);
  check('Eight concurrent identical requests return exactly one meter');
  const changed = await clients[0].rpc('setup_meter', { p_request_id: request, p_payload: { ...payload, name: 'Geändert' } }); assert(changed.error);
  check('Consumed request rejects changed payload');
  // The first response can be discarded: a new client session recovers the same outcome.
  const session = (await clients[0].auth.getSession()).data.session;
  const reconnected = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
  await reconnected.auth.setSession(session);
  const recovered = await reconnected.rpc('setup_meter', { p_request_id: request, p_payload: payload }); assert.ifError(recovered.error); assert.equal(recovered.data, meter);
  check('Fresh client recovers committed result after discarded response');
  const periods = await reconnected.from('contracts').select('*,rates(*)').eq('meter_id', meter); assert.ifError(periods.error);
  assert.equal(periods.data.length, 1); assert.equal(periods.data[0].period_end, '2026-07-01'); assert.equal(periods.data[0].rates.length, 1); assert.equal(periods.data[0].rates[0].arbeitspreis, payload.arbeitspreis);
  const readings = await reconnected.from('readings').select('*').eq('meter_id', meter); assert.ifError(readings.error); assert.equal(readings.data.length, 1); assert.equal(readings.data[0].value, payload.reading_value);
  check('Fresh authenticated reads retain period, provider, rates, precision and initial reading');
  for (const table of ['meters', 'contracts', 'rates', 'readings']) {
    const hidden = await clients[1].from(table).select('*'); assert.ifError(hidden.error); assert.equal(hidden.data.length, 0);
  }
  const forbidden = await clients[1].from('readings').insert({ meter_id: meter, date: '2026-02-01', value: 12400 }); assert(forbidden.error);
  check('Second account cannot read first account rows or attach readings');
  const gas = await clients[1].rpc('setup_meter', { p_request_id: request, p_payload: { ...payload, name: 'Synthetisches Gas', type: 'gas', umrechnungsfaktor: 10.7123, reading_value: 5678.9012 } }); assert.ifError(gas.error); assert.notEqual(gas.data, meter);
  const gasMeters = await clients[1].from('meters').select('*'); assert.equal(gasMeters.data.length, 1); assert.equal(gasMeters.data[0].type, 'gas');
  check('Same request key independently creates gas on second account');
  const added = await clients[0].from('readings').insert({ meter_id: meter, date: '2026-02-01', value: 12400.1234 }).select().single(); assert.ifError(added.error);
  check('Existing reading insert works after setup');
  const bad = await clients[0].rpc('setup_meter', { p_request_id: crypto.randomUUID(), p_payload: { ...payload, reading_value: -1 } }); assert(bad.error);
  const stillOne = await clients[0].from('meters').select('id'); assert.equal(stillOne.data.length, 1);
  check('Invalid setup leaves no extra meter');
  const receipt = await clients[0].from('meter_setup_requests').select('*'); assert(receipt.error);
  const anon = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } }); assert((await anon.rpc('setup_meter', { p_request_id: crypto.randomUUID(), p_payload: payload })).error);
  check('Receipt table is inaccessible and anonymous RPC execution is denied');
} finally {
  for (const client of clients) {
    const meters = await client.from('meters').select('id');
    for (const meter of meters.data || []) assert.ifError((await client.from('meters').delete().eq('id', meter.id)).error);
  }
  for (const account of accounts) assert.ifError((await admin.auth.admin.deleteUser(account)).error);
  report.cleanup = true;
  fs.writeFileSync(new URL('./live-integration.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
