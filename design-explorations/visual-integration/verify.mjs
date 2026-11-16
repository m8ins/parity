import { createRequire } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/martin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = new URL('.', import.meta.url).pathname;
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173/design-explorations/visual-integration/';
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', headless: true });
const page = await browser.newPage();
const report = { checks: [], contrasts: {}, errors: [], scope: 'Isolated static colour comparison. No auth, persistence, Radix or gesture regression proof.' };
page.on('pageerror', error => report.errors.push(error.message));
try {
  for (const variant of (process.env.VARIANTS || 'a,b,c,orange').split(',')) {
    for (const [device,width,height] of [['desktop',1280,960],['mobile',390,844]]) {
      for (const screen of ['login','overview','dialog']) {
        await page.setViewportSize({width,height});
        await page.goto(`${base}screen.html?variant=${variant}&screen=${screen}`);
        await page.evaluate(() => document.fonts.ready);
        assert(await page.evaluate(() => document.fonts.check('400 18px "Parity Preview Atkinson"')));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({path:`${out}screenshots/${variant}-${device}-${screen}.png`,fullPage:screen !== 'dialog'});
        if (screen === 'dialog') {
          assert(await page.getByRole('button',{name:'Zählerstand speichern',exact:true}).evaluate(el => { const r=el.getBoundingClientRect();return r.bottom<=innerHeight && r.top>=0; }));
          const numberWidths = await page.evaluate(() => {const span=document.createElement('span');span.className='numeric';span.style.display='inline-block';document.body.append(span);const widths=[...'0123456789'].map(n=>{span.textContent=n;return span.getBoundingClientRect().width;});span.remove();return widths;});
          assert(Math.max(...numberWidths)-Math.min(...numberWidths)<.1);
        }
        report.checks.push(`${variant}/${device}/${screen}: font loaded, no document overflow, screenshot`);
      }
    }
    report.contrasts[variant] = await page.evaluate(() => {
      const styles=getComputedStyle(document.documentElement);
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const rgb=role=>{const probe=document.createElement('i');probe.style.color=`var(--sys-color-${role})`;document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
      const luminance=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const pairs=[];
      for(const background of ['canvas','surface','field','field-active']) for(const foreground of ['text','text-secondary','border','focus','error']) pairs.push([foreground,background,foreground==='border'||foreground==='focus'?3:4.5]);
      pairs.push(['action-text','action',4.5],['action-text','action-hover',4.5]);
      if (document.documentElement.dataset.variant === 'orange') pairs.push(['border','action',3],['border','action-hover',3]);
      return pairs.map(([fg,bg,min])=>{const a=luminance(rgb(fg)),b=luminance(rgb(bg));const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return {fg,bg,ratio:Math.round(ratio*100)/100,min,pass:ratio>=min};});
    });
    assert(report.contrasts[variant].every(pair=>pair.pass));
    for (const screen of ['login','overview','dialog']) {
      await page.setViewportSize({width:320,height:568});
      await page.goto(`${base}screen.html?variant=${variant}&screen=${screen}`);
      await page.addStyleTag({content:'html {font-size:200%} * {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}'});
      await page.screenshot({path:`${out}screenshots/${variant}-320-text-${screen}.png`,fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right]))));
      if(screen==='dialog') { await page.getByRole('button',{name:'Zählerstand speichern',exact:true}).scrollIntoViewIfNeeded();assert(await page.getByRole('button',{name:'Zählerstand speichern',exact:true}).isVisible()); }
      report.checks.push(`${variant}/320px/${screen}: 200% text + spacing, no document overflow; dialog action scrollable`);
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base);await page.selectOption('#screen','dialog');
  await Promise.all(page.frames().map(frame=>frame.evaluate(()=>document.fonts.ready)));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${out}screenshots/comparison-orange-desktop.png`,fullPage:true});
  for (const screen of ['login', 'overview']) {
    await page.selectOption('#screen', screen);
    await Promise.all(page.frames().map(frame=>frame.evaluate(()=>document.fonts.ready)));
    await page.screenshot({path:`${out}screenshots/comparison-orange-desktop-${screen}.png`,fullPage:true});
  }
  await page.selectOption('#screen','dialog');
  await Promise.all(page.frames().map(frame=>frame.evaluate(()=>document.fonts.ready)));
  await page.selectOption('#size','mobile');
  await page.screenshot({path:`${out}screenshots/comparison-orange-mobile.png`,fullPage:true});
  await page.goto(`${base}screen.html?variant=a&screen=login`);
  await page.getByRole('button',{name:'Passwort',exact:true}).click();
  assert(await page.getByLabel('Passwort',{exact:true}).isVisible());
  await page.getByLabel('Passwort',{exact:true}).fill('synthetic-password');
  await page.getByRole('button',{name:'Anmelden',exact:true}).click();
  assert((await page.getByRole('status').innerText()).includes('keine Anmeldung'));
  await page.keyboard.press('Tab');
  report.checks.push('Login method switch and safe demo submit work');
  assert.equal(report.errors.length,0);
} finally { fs.writeFileSync(`${out}browser-check.json`,JSON.stringify(report,null,2));await browser.close(); }
console.log('PASS',report.checks.length,'checks; contrast minimum',Math.min(...Object.values(report.contrasts).flat().map(pair=>pair.ratio)));
