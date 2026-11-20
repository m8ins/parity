// Keep the user's development server and .next untouched.
import fs from 'node:fs';import path from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';
const app=fs.mkdtempSync('/private/tmp/parity-slice6-build-');
for(const entry of ['src','public','next.config.ts','tsconfig.json','postcss.config.mjs','package.json','next-env.d.ts'])fs.cpSync(path.resolve(entry),path.join(app,entry),{recursive:true});execFileSync('cp',['-cR',path.resolve('node_modules'),path.join(app,'node_modules')]);
const result=spawnSync('npm',['run','build'],{cwd:app,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:'synthetic-build-key'},stdio:'inherit'});process.exitCode=result.status??1;
