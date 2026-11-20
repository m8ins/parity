// Isolate .next and the source snapshot from the user's running dev server.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const app = fs.mkdtempSync('/private/tmp/parity-slice5-preview-');
const out = path.dirname(new URL(import.meta.url).pathname);
for (const entry of ['src', 'public', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'package.json', 'next-env.d.ts']) fs.cpSync(path.resolve(entry), path.join(app, entry), { recursive: true });
fs.symlinkSync(path.resolve('node_modules'), path.join(app, 'node_modules'), 'dir');
const serverLog = fs.openSync(path.join(out, 'preview-server.log'), 'w');
const server = spawn('npm', ['run', 'dev', '--', '--webpack', '--hostname', '127.0.0.1', '--port', '3005'], {
  cwd: app, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'synthetic-preview-key', PARITY_DESIGN_PREVIEW: '1' },
  detached: true, stdio: ['ignore', serverLog, serverLog],
});
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:3005')).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 500)); }
  assert(ready, 'Isolated preview starts');
  for (const [script, log] of [['verify-browser.mjs', 'browser.log'], ['conditions-regression/verify-browser.mjs', 'conditions-regression/run.log'], ['understanding-regression/verify-understanding.mjs', 'understanding-regression/run.log'], ['setup-regression/verify-setup.mjs', 'setup-regression/run.log'], ['verify-reading.mjs', 'reading-regression.log']]) {
    const output = fs.openSync(path.join(out, log), 'w');
    const result = spawnSync(process.execPath, [path.join(out, script)], { env: { ...process.env, PREVIEW_URL: 'http://127.0.0.1:3005' }, stdio: ['ignore', output, output] });
    fs.closeSync(output); assert.equal(result.status, 0, script); console.log(`PASS ${script}`);
  }
} finally { try { process.kill(-server.pid, 'SIGTERM'); } catch {} fs.closeSync(serverLog); }
