import {chromium} from 'playwright';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
const root='marketing/visitorping-agencies';
if(existsSync(root+'/first-inquiry-receipt.json'))throw Error('Submission already attempted; review receipt instead of resending');
const e=parseEnv(readFileSync('.env.local','utf8'));
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.OPERATOR_EMAIL??''))throw Error('No verified configured operator email');
const b=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const p=await b.newPage();
 await p.goto('https://www.webdesignpros365.com/contact?topic=partnership',{waitUntil:'networkidle',timeout:45000});
 await p.getByPlaceholder('Your name',{exact:true}).fill('Serhan');
 await p.getByPlaceholder('your@email.com',{exact:true}).fill(e.OPERATOR_EMAIL);
 await p.getByPlaceholder('Your company name',{exact:true}).fill('VisitorPing');
 await p.locator('select').selectOption({label:'Partnership inquiry'});
 await p.locator('textarea').fill(readFileSync(root+'/first-inquiry.txt','utf8'));
 const formText=await p.locator('form').innerText();
 if(/subscribe|agree to|terms|consent|marketing emails/i.test(formText))throw Error('Additional form terms need inspection');
 const responses=[];
 p.on('response',r=>{if(r.request().method()==='POST')responses.push({url:r.url().split('?')[0],status:r.status()});});
 await p.getByRole('button',{name:'Send Message',exact:true}).click();
 await p.waitForTimeout(5000);
 const body=await p.locator('body').innerText();
 const relevant=body.split('\n').filter(x=>/\b(thank|sent|success|error|failed|captcha)\b|try again/i.test(x));
 const receipt={at:new Date().toISOString(),agency:'Web Design Pros 365',route:p.url(),responses,confirmation:relevant,status:responses.some(x=>x.status>=200&&x.status<300)&&relevant.some(x=>/\b(thank|sent|success)\b/i.test(x))?'submitted':'attempted_unconfirmed',replyInbox:'configured OPERATOR_EMAIL; not connected for reading'};
 writeFileSync(root+'/first-inquiry-receipt.json',JSON.stringify(receipt,null,2));console.log(receipt);
} finally {await b.close();}
