import http from 'node:http';
import {mkdirSync,chmodSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const root=new URL('./',import.meta.url), profile='/tmp/visitorping-publishing-browser';
mkdirSync(profile,{recursive:true,mode:0o700});chmodSync(profile,0o700);
const context=await chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1100,height:820},args:['--no-sandbox','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9224']});
let page=context.pages()[0]??await context.newPage();let serial=Promise.resolve();let frame=null;let capturing=false;
context.on('page',p=>{page=p;frame=null});
const allowedHosts=new Set(['localhost:4600','127.0.0.1:4600']);
const allowedOrigins=new Set(['http://localhost:4600','http://127.0.0.1:4600']);

const server=http.createServer(async(req,res)=>{
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'"};
 const reply=(code,body,type='application/json')=>{res.writeHead(code,{...headers,'Content-Type':type});res.end(body)};
 if(!allowedHosts.has(req.headers.host))return reply(403,'Open this browser at http://localhost:4600 through your SSH tunnel.','text/plain; charset=utf-8');
 const url=new URL(req.url,'http://localhost:4600');
 const openingViewer=req.method==='GET'&&url.pathname==='/'&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document';
 if(req.headers['sec-fetch-site']==='cross-site'&&!openingViewer)return reply(403,'This request is blocked. Open http://localhost:4600 directly in your browser.','text/plain; charset=utf-8');
 if(req.method==='GET'&&url.pathname==='/')return reply(200,readFileSync(new URL('viewer.html',root)),'text/html; charset=utf-8');
 if(req.method==='GET'&&url.pathname==='/status')return reply(200,JSON.stringify({ready:true,width:1100,height:820}));
 if(req.method==='GET'&&url.pathname==='/frame'){
  try{if(!capturing){capturing=true;try{frame=await page.screenshot({type:'jpeg',quality:75,timeout:5000})}finally{capturing=false}}if(!frame)return reply(503,'{}');return reply(200,frame,'image/jpeg')}catch{return reply(503,'{}')}
 }
 if(req.method==='POST'&&url.pathname==='/event'){
  if(!allowedOrigins.has(req.headers.origin)||!req.headers['content-type']?.startsWith('application/json'))return reply(403,'{}');
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)return reply(413,'{}')}
  let event;try{event=JSON.parse(raw)}catch{return reply(400,'{}')}
  const execute=async()=>{
   if(event.type==='click'&&Number.isFinite(event.x)&&Number.isFinite(event.y)&&event.x>=0&&event.x<=1100&&event.y>=0&&event.y<=820)await page.mouse.click(event.x,event.y);
   else if(event.type==='text'&&typeof event.text==='string'&&event.text.length<=4096)await page.keyboard.insertText(event.text);
   else if(event.type==='key'&&['Enter','Tab','Shift+Tab','Backspace','Delete','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Control+A'].includes(event.key))await page.keyboard.press(event.key);
   else if(event.type==='wheel'&&Number.isFinite(event.dy))await page.mouse.wheel(0,Math.max(-1000,Math.min(1000,event.dy)));
   else if(event.type==='reload')await page.reload({waitUntil:'domcontentloaded',timeout:15000}).catch(()=>{});
   else if(event.type==='done')writeFileSync(new URL('login-status.json',root),JSON.stringify({userMarkedReadyAt:new Date().toISOString(),verificationRequired:true})+'\n');
  };
  serial=serial.then(execute).catch(()=>{});await serial;return reply(200,'{"ok":true}');
 }
 reply(404,'{}');
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4600,'127.0.0.1',resolve)});
writeFileSync(new URL('server-status.json',root),JSON.stringify({pid:process.pid,startedAt:new Date().toISOString(),listen:'127.0.0.1:4600',debugListen:'127.0.0.1:9224',profile,expiresAt:new Date(Date.now()+8*60*60*1000).toISOString()},null,2)+'\n');
console.log('Dedicated publishing browser is listening on127.0.0.1:4600; no input or screenshot logging.');
process.on('SIGTERM',async()=>{await context.close();server.close();process.exit(0)});
if(page.url()==='about:blank')await page.goto('https://login.buffer.com/signup',{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>{});
setTimeout(async()=>{await context.close();server.close();process.exit(0)},8*60*60*1000);
