import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const out=path.dirname(new URL(import.meta.url).pathname);
for(const [script,log]of [['run-regressions.mjs','regressions.log'],['verify-design.mjs','design-browser.log'],['verify-live-browser.mjs','live-browser.log']]){
 const fd=fs.openSync(path.join(out,log),'w');const r=spawnSync(process.execPath,[path.join(out,script)],{env:process.env,stdio:['ignore',fd,fd]});fs.closeSync(fd);console.log(`${script}: ${r.status===0?'PASS':'FAIL'}`);if(r.status!==0){process.exitCode=1;break;}
}
