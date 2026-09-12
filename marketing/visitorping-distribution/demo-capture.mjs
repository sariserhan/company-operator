import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
await page.goto('https://visitorping.com/demo',{waitUntil:'networkidle'});
await page.getByText('Example data',{exact:true}).waitFor();
const frames = 100, fps = 10, started = Date.now();
let alertVerified = false;
for(let n=0;n<frames;n++){
  const wait = started+n*100-Date.now();
  if(wait>0) await new Promise(r=>setTimeout(r,wait));
  if(n===20){
    await page.getByRole('button',{name:'Test this visit'}).nth(1).click();
    await page.getByText('Demo notification',{exact:true}).waitFor();
    alertVerified = true;
  }
  await page.screenshot({path:`marketing/visitorping-distribution/demo-capture.${String(n).padStart(3,'0')}.png`});
}
writeFileSync('marketing/visitorping-distribution/demo-capture.json',JSON.stringify({url:page.url(),capturedAt:new Date().toISOString(),frames,fps,width:1080,height:1350,wallMs:Date.now()-started,alertVerified,kind:'Actual browser interaction with simulated public demo data; no real mobile push delivery is shown.'},null,2));
await browser.close();
