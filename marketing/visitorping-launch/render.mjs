import { chromium } from 'playwright';
import { resolve } from 'node:path';
const root=resolve('public/campaigns/visitorping-launch');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1080,height:1080},deviceScaleFactor:1});
await page.goto(`file://${root}/motion.html?variant=b`);await page.screenshot({path:`${root}/assets/ad-refreshing.png`});
await page.goto(`file://${root}/motion.html`);
for (const [name,time] of [['arrival',0],['notification',4],['dashboard',8],['cta',13]]){await page.evaluate(t=>window.frame(t),time);await page.screenshot({path:`${root}/assets/frame-${name}.png`});}
await page.evaluate(()=>window.frame(4));await page.screenshot({path:`${root}/assets/video-poster.png`});
await page.setViewportSize({width:1440,height:1000});await page.goto(`file://${root}/index.html`);await page.screenshot({path:`${root}/review-desktop.png`,fullPage:true});
await page.setViewportSize({width:390,height:844});await page.goto(`file://${root}/landing.html?utm_source=reddit&utm_content=notification_a`);
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');
const href=await page.locator('[data-destination="/signup"]').first().getAttribute('href');if(!href.includes('utm_source=reddit')||!href.includes('utm_content=notification_a'))throw new Error('Lost attribution');
await page.screenshot({path:`${root}/landing-mobile.png`,fullPage:true});
console.log(JSON.stringify({mobileOverflow:false,signupTagsPreserved:true}));await browser.close();
