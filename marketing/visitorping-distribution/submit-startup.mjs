import {chromium} from 'playwright';import {existsSync,writeFileSync} from 'node:fs';
const receiptPath='marketing/visitorping-distribution/shareyourstartup-receipt.json';if(existsSync(receiptPath))throw Error('Already attempted; inspect receipt instead of resubmitting');
const b=await chromium.launch({headless:true,args:['--no-sandbox']});
try{const p=await b.newPage();await p.goto('https://shareyourstartup.com/',{waitUntil:'domcontentloaded'});await p.getByPlaceholder('Search startups…').fill('VisitorPing');await p.waitForTimeout(1000);const existing=await p.locator('a[href*="visitorping.com"]').count();if(existing)throw Error('Existing listing detected');
await p.goto('https://shareyourstartup.com/submit.html',{waitUntil:'domcontentloaded'});
await p.locator('[name=name]').fill('VisitorPing');await p.locator('[name=url]').fill('https://visitorping.com/');await p.locator('[name=pitch]').fill('See website visitors live in your dashboard and get iPhone notifications when someone visits.');await p.locator('[name=category]').fill('Website analytics');
const requests=[];p.on('response',r=>{if(r.request().method()==='POST'&&r.url().startsWith('https://shareyourstartup.com/'))requests.push({url:r.url().split('?')[0],status:r.status()});});
await p.getByRole('button',{name:'Post it',exact:true}).click();await p.waitForTimeout(4000);
const text=await p.locator('body').innerText();const receipt={at:new Date().toISOString(),url:p.url(),responses:requests,resultText:text.slice(0,4500),status:'attempted_unverified'};
writeFileSync(receiptPath,JSON.stringify(receipt,null,2));console.log(receipt);await p.screenshot({path:'marketing/visitorping-distribution/submission.png',fullPage:true});
}finally{await b.close()}
