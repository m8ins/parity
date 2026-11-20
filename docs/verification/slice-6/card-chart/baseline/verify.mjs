import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
const page=await browser.newPage();const results=[];
try{
for(const width of [1440,390,320]){
await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:3010/design/integration?view=overview');await page.evaluate(()=>document.fonts.ready);
const row=page.locator('.meter-reading-summary').first();await row.waitFor();
const geometry=await row.evaluate(el=>{const nodes=[el.querySelector('p'),el.querySelector('strong')];const baseline=nodes.map(n=>{const marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;padding:0;margin:0;vertical-align:baseline';n.append(marker);const y=marker.getBoundingClientRect().top;marker.remove();return y;});return{baseline,overflow:document.documentElement.scrollWidth>innerWidth};});
assert(Math.abs(geometry.baseline[0]-geometry.baseline[1])<1,JSON.stringify(geometry));assert(!geometry.overflow);results.push({width,...geometry});await row.screenshot({path:new URL(`reading-${width}.png`,import.meta.url).pathname});
}
await page.addStyleTag({content:'html{font-size:200%}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));results.push({width:320,text:'200%',overflow:false});
}finally{await browser.close();fs.writeFileSync(new URL('results.json',import.meta.url),JSON.stringify(results,null,2)+'\n');}
console.log('PASS',results);
