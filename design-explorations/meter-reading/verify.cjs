/* Use an existing Playwright installation; no project dependencies are needed.
   PLAYWRIGHT_MODULE=/path/to/playwright BROWSER_PATH=/path/to/browser node verify.cjs */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const out = path.join(__dirname, 'screenshots');
(async () => {
 const browser = await chromium.launch({executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true});
 const page = await browser.newPage({viewport:{width:1280,height:1000},locale:'de-DE'});
 const errors=[]; const external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
 const report={viewportChecks:[],interactions:[],fontChecks:[],errors,external};
 async function load(query='') {await page.goto(`${base}/?${query}`);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.fontChecks.length===6);}
 async function capture(name) {await page.evaluate(()=>{const e=document.activeElement;if(e instanceof HTMLInputElement && e.type==='text')e.setSelectionRange(e.value.length,e.value.length);});await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
 await load();
 report.contrasts=await page.evaluate(()=>{
  const root=getComputedStyle(document.documentElement), canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
  const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
  const lum=color=>{const [r,g,b]=rgb(color).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const token=name=>root.getPropertyValue(name).trim();
  return {textOnCream:ratio(token('--text'),token('--background')),secondaryOnWorkbench:ratio(token('--muted'),token('--workbench')),secondaryOnCream:ratio(token('--muted'),token('--background')),button:ratio(token('--on-action'),token('--action')),textOnDevice:ratio(token('--text'),token('--device-surface')),errorOnDevice:ratio(token('--error'),token('--device-surface')),errorOnInput:ratio(token('--error'),token('--surface')),savingButton:ratio(token('--muted'),token('--disabled-surface'))};
 });
 assert(Object.values(report.contrasts).every(x=>x>=4.5));
 report.fontChecks=await page.evaluate(()=>window.fontChecks);assert(report.fontChecks.every(f=>f.loaded&&f.tabular));
 for(const width of [320,390,768,1280])for(const meter of ['electricity','gas'])for(const view of ['a','b']) {
  await page.setViewportSize({width,height:844});await load(`meter=${meter}&view=${view}`);
  const form=page.locator(`.variant-${view} form`);
  for(const value of [meter==='gas'?'7,002':'7,2',meter==='gas'?'999.999,999':'999.999,9']){
   await form.locator('[name=value]').fill(value);
   const fit=await form.locator('[name=value]').evaluate(e=>({scroll:e.scrollWidth,client:e.clientWidth}));
   assert(fit.scroll<=fit.client+1,`Input clipped ${width}/${meter}/${view}/${value}: ${JSON.stringify(fit)}`);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflow ${width}/${meter}/${view}`);
  report.viewportChecks.push({width,meter,view,longAndShortValuesFit:true});
 }
 await page.setViewportSize({width:1280,height:1000});await load();
 assert.equal(await page.locator('.variant-a .message').textContent(),'');assert.equal(await page.locator('.variant-b .message').textContent(),'');
 report.interactions.push('No redundant default hint in either variant');await capture('desktop');
 await load('meter=gas');await capture('desktop-gas');
 for(const view of ['a','b']){
  await page.setViewportSize({width:390,height:844});await load(`view=${view}`);await capture(`mobile-${view}`);
  await load(`view=${view}&meter=gas`);await capture(`mobile-${view}-gas`);
 }
 await page.setViewportSize({width:1280,height:1000});
 for(const state of ['active','input-focus','focus','pressed','invalid','saving','saved','failure','empty']){
  await load(`state=${state}`);
  if(state==='invalid'){
   for(const variant of ['a','b'])assert.deepEqual(await page.locator(`.variant-${variant} .value-wrap`).evaluate(e=>{const c=getComputedStyle(e);return {width:c.borderTopWidth,style:c.borderTopStyle,color:c.borderTopColor};}),await page.locator('.variant-a .value-wrap').evaluate(e=>{const c=getComputedStyle(e);return {width:'3px',style:'solid',color:c.borderTopColor};}));
   report.interactions.push('Both error outlines are solid 3px red with linked error text');
  }
  if(state==='saving'){
   for(const variant of ['a','b']){const button=page.locator(`.variant-${variant} .primary`);assert(await button.isDisabled());assert.equal(await button.evaluate(e=>getComputedStyle(e).borderTopStyle),'solid');}
   report.interactions.push('Saving buttons are disabled with muted text and solid outlines');
  }
  await capture(`desktop-${state}`);
 }
 await page.setViewportSize({width:390,height:844});await load('view=b&meter=gas&state=invalid');await capture('mobile-b-gas-error');
 await load('view=a&state=saved');await capture('mobile-a-saved');
 // Pointer focus stays subtle, including native text inputs that normally
 // match :focus-visible after a click. Keyboard navigation adds the outer ring.
 for(const width of [390,1280])for(const variant of ['a','b']){
  await page.setViewportSize({width,height:844});await load(`view=${variant}`);
  const date=page.locator(`#date-${variant}`),input=page.locator(`#value-${variant}`),wrap=page.locator(`.variant-${variant} .value-wrap`);
  for(const field of [date,input]){
   await field.click();assert.equal(await field.evaluate(e=>getComputedStyle(e.closest('.value-wrap')||e).backgroundColor),'oklch(1 0 none)');
   assert.equal(await field.evaluate(e=>getComputedStyle(e.closest('.value-wrap')||e).outlineStyle),'none');
   await page.keyboard.type('1');assert.equal(await field.evaluate(e=>getComputedStyle(e.closest('.value-wrap')||e).outlineStyle),'none');
   await field.fill(field===date?'15.11.2026':'24.681,7');
  }
  if(width===390&&variant==='a')await capture('mobile-a-input-active');
  await date.click();await page.keyboard.press('Tab');assert(await input.evaluate(e=>e===document.activeElement));
  assert.equal(await wrap.evaluate(e=>getComputedStyle(e).outlineWidth),'3px');
  if(width===390&&variant==='a')await capture('mobile-a-input-focus');
  await page.keyboard.press('Shift+Tab');assert(await date.evaluate(e=>e===document.activeElement));
  assert.equal(await date.evaluate(e=>getComputedStyle(e).outlineWidth),'3px');
  if(width===390&&variant==='a')await capture('mobile-a-date-focus');
  await load(`view=${variant}&state=invalid`);await page.locator(`#value-${variant}`).click();
  assert.equal(await page.locator(`.variant-${variant} .value-wrap`).evaluate(e=>getComputedStyle(e).borderTopWidth),'3px');
  assert.equal(await page.locator(`.variant-${variant} .value-wrap`).evaluate(e=>getComputedStyle(e).outlineStyle),'none');
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator(`.variant-${variant} .value-wrap`).evaluate(e=>getComputedStyle(e).outlineWidth),'3px');
  assert.equal(await page.locator(`#value-${variant}`).getAttribute('aria-invalid'),'true');
  if(width===390&&variant==='a')await capture('mobile-a-error-focus');
 }
 report.interactions.push('Both fields: pointer focus white without ring; typing keeps pointer styling; Tab adds ring; red errors remain, at 390/1280 in A/B');
 await page.setViewportSize({width:390,height:844});
 // Actual keyboard focus and press, rather than only the demonstration classes.
 await load('view=a');await page.locator('#date-a').focus();await page.keyboard.press('Tab');assert(await page.locator('#value-a').evaluate(e=>e===document.activeElement));
 await page.keyboard.press('Tab');assert(await page.locator('.variant-a .primary').evaluate(e=>e===document.activeElement));await capture('mobile-a-keyboard-focus');report.interactions.push('Keyboard: date → reading → save; visible focus');
 const button=page.locator('.variant-a .primary');await button.hover();const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 assert.equal(await button.evaluate(e=>getComputedStyle(e).transitionDuration),'0.07s');assert.equal(await button.evaluate(e=>getComputedStyle(e).transitionTimingFunction),'cubic-bezier(0.16, 1, 0.3, 1)');
 report.interactions.push('Variant A uses 70ms press, 110ms release, pronounced ease-out');
 assert((await button.evaluate(e=>getComputedStyle(e).transform))!=='none');await capture('mobile-a-pressed');await page.mouse.up();
 assert.equal(await button.evaluate(e=>getComputedStyle(e).transitionDuration),'0.11s');
 assert(await page.locator('#value-a').evaluate(e=>e.readOnly));assert(await page.locator('#date-a').evaluate(e=>e.readOnly));
 await page.locator('#value-a').focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('ungueltig');assert.equal(await page.locator('#value-a').inputValue(),'24.681,7');
 report.interactions.push('During save both inputs are read-only; typing cannot replace the validated value');
 await page.waitForFunction(()=>document.querySelector('.variant-a .primary').textContent.includes('Gespeichert'));report.interactions.push('Actual press → saving → saved');
 await load('view=b&meter=gas');const form=page.locator('.variant-b form');
 await form.locator('[name=value]').fill('8.412,365');await form.locator('.primary').click();await page.waitForFunction(()=>document.querySelector('.variant-b .message').textContent.includes('✓'));
 assert((await form.locator('.message').textContent()).includes('8.412,365 m³'));await page.reload();assert((await page.locator('.variant-b .primary').textContent()).includes('Zählerstand speichern'));report.interactions.push('Gas independent; German decimal precision; reload resets');
 for(const value of ['', '24,68,7', '-1', '12.34', '1,2345']){
  await load('view=a');await page.locator('#value-a').fill(value);await page.locator('.variant-a .primary').click();assert.equal(await page.locator('#value-a').getAttribute('aria-invalid'),'true');assert.equal(await page.locator('#value-a').evaluate(e=>e===document.activeElement),true);
 }
 report.interactions.push('Empty, repeated comma, negative, incorrect grouping and excess precision rejected');
 for(const date of ['16.11.2026','31.02.2026','kein Datum']){
  await load('view=a');await page.locator('#date-a').fill(date);await page.locator('.variant-a .primary').click();assert.equal(await page.locator('#date-a').getAttribute('aria-invalid'),'true');
 }
 report.interactions.push('Future and invalid dates rejected against fixed demo date');
 await load('view=a&state=failure');await page.locator('.variant-a .primary').click();await page.waitForFunction(()=>document.querySelector('.variant-a .message').textContent.includes('✓'));report.interactions.push('Storage failure → retry → simulated success');
 await page.emulateMedia({reducedMotion:'reduce'});await load('view=b&state=pressed');assert.equal(await page.locator('.variant-b .primary').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await capture('mobile-b-reduced-motion');report.interactions.push('Reduced motion removes transitions; static pressed state remains visible');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(__dirname,'browser-check.json'),JSON.stringify(report,null,2));
 console.log(`PASS: ${report.viewportChecks.length} viewport/meter/variant combinations, ${report.interactions.length} interaction checks, 6 font measurements, no page errors or external requests.`);
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
