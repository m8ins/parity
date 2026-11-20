// Read-only browser check of the isolated hybrid foundation.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const results=[];
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:4173/design-explorations/meter-reading/tokens.html');await page.evaluate(()=>document.fonts.ready);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
  const styles=await page.locator('.sample').evaluateAll(els=>els.map(el=>{const c=getComputedStyle(el.querySelector('p'));return {font:c.fontFamily,size:c.fontSize,line:c.lineHeight,weight:c.fontWeight};}));assert(styles.every(s=>s.font.includes('Atkinson Hyperlegible Next')));
  assert.equal(styles[2].size,'18px');assert.equal(styles[2].line,'27px');assert.equal(styles[5].size,'16px');assert.equal(styles[6].size,'14px');
  if(width===390||width===1280)await page.screenshot({path:path.join(__dirname,'screenshots',`tokens-${width}.png`),fullPage:true});
  const fluid=await page.evaluate(()=>({title:parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),gutter:parseFloat(getComputedStyle(document.querySelector('main')).paddingLeft)}));
  assert(fluid.title>=27.99&&fluid.title<=32.01);assert(fluid.gutter>=15.99&&fluid.gutter<=32.01);
  if(width===320){assert.equal(fluid.title,28);assert.equal(fluid.gutter,16);}
  if(width===1280){assert.equal(fluid.title,32);assert.equal(fluid.gutter,32);}
  assert.equal(styles[0].size,'28px'); // Dialog title remains fixed.
  results.push({width,overflow:false,styles,fluid});
  // User spacing overrides: these are robustness checks, not design defaults.
  await page.addStyleTag({content:'* {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p {margin-bottom:2em!important}'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Text spacing overflow ${width}`);
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`200% text overflow ${width}`);
 }
 assert.deepEqual(errors,[]);await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--sys-duration-press').trim()),'0ms');
 fs.writeFileSync(path.join(__dirname,'tokens-check.json'),JSON.stringify({status:'pass',results,userTextSpacing:true,textAt200Percent:true,reducedMotion:true,errors},null,2));console.log('PASS: token specimen at 320/390/768/1280, expected typography, text spacing overrides, 200% text and reduced motion.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
