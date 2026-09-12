import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
const root=new URL('./',import.meta.url), file=name=>new URL(name,root);
const prior=existsSync(file('monitor-status.json'))?JSON.parse(readFileSync(file('monitor-status.json'),'utf8')):null;
if(prior?.status==='running'){try{process.kill(prior.pid,0);throw Error('An existing monitor is running');}catch(e){if(e.code!=='ESRCH')throw e;}}
const started=Date.now(),expires=prior?.expiresAt?Date.parse(prior.expiresAt):started+96*60*60*1000;
let finished=false,failures=0;
function status(extra={}){writeFileSync(file('monitor-status.json'),JSON.stringify({status:finished?'finished':'running',pid:process.pid,startedAt:new Date(started).toISOString(),expiresAt:new Date(expires).toISOString(),intervalMinutes:30,scope:'Read-only traffic checks; one owner email when the monitoring window ends; browser counts do not trigger a human milestone. New candidate workspace counts trigger owner review emails. No automatic public posts or replies.',...extra},null,2)+'\n');}
async function report(snapshot){
 const receipt=file('owner-progress-email.json');if(existsSync(receipt))return;
 const env=parseEnv(readFileSync('/home/ssari/projects/visitorping/apps/web/.env.local','utf8'));
 if(!env.RESEND_API_KEY){status({email:'unavailable'});return;}
 const estimate=snapshot?.browser_shaped_visitor_ids;
 const message=['VisitorPing 100-visitor campaign update',`Unverified browser identifiers since campaign start: ${estimate??'measurement unavailable'}.`,`Classifier-human browser IDs (not verified people): ${snapshot?.classifier_human_browser_ids??'unavailable'}.`,'These are deduplicated browser identifiers, not proof of distinct people. Known bots and labeled tests are excluded.',`Last measurement: ${snapshot?.capturedAt??'unavailable'}.`,'Published showcases: https://github.com/vercel/next.js/discussions/98537 and https://github.com/better-auth/better-auth/discussions/11253','No advertising spend. The 96-hour monitor does not post or reply automatically.','The real-person total remains unverified. Browser user agents and network ownership cannot establish 100 actual people.'].join('\n\n');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'visitorping-100-visitors-owner-progress-20260910'},body:JSON.stringify({from:'VisitorPing <partners@visitorping.com>',to:['serhan.sari83@gmail.com'],subject:'VisitorPing: 100-visitor campaign progress',text:message}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();writeFileSync(receipt,JSON.stringify({at:new Date().toISOString(),status:response.status,emailId:data.id??null,accepted:response.ok},null,2)+'\n');
}
async function notifyCandidate(snapshot) {
 const count=snapshot?.activation?.workspaces??0;
 if(count<1)return;
 const receipt=file(`candidate-workspaces-${count}-email.json`);
 if(existsSync(receipt))return;
 const env=parseEnv(readFileSync('/home/ssari/projects/visitorping/apps/web/.env.local','utf8'));
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`visitorping-candidate-workspaces-${count}-20260911`},body:JSON.stringify({from:'VisitorPing <partners@visitorping.com>',to:['serhan.sari83@gmail.com'],subject:'VisitorPing: new workspace needs review',text:`The campaign monitor found ${count} workspace(s) outside your confirmed owner/test baseline. This is a candidate, not a verified customer or revenue claim.\n\nVerified emails: ${snapshot.activation.email_verified}. Trackers verified: ${snapshot.activation.tracker_verified}.\n\nReview the account in VisitorPing admin before counting it as an independent customer or offering setup help.\n\nMeasurement: ${snapshot.capturedAt}.`}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(!response.ok)throw Error('Candidate notification rejected');
 writeFileSync(receipt,JSON.stringify({at:new Date().toISOString(),id:data.id,accepted:true,candidateWorkspaces:count},null,2)+'\n');
}
async function check(){
 const run=spawnSync(process.execPath,[fileURLToPath(file('measure.mjs'))],{encoding:'utf8',timeout:45000});
 let snapshot=null;
 if(run.status===0){snapshot=JSON.parse(readFileSync(file('latest-traffic.json'),'utf8'));failures=0;appendFileSync(file('traffic-history.jsonl'),JSON.stringify(snapshot)+'\n');}
 else {failures++;appendFileSync(file('monitor-errors.jsonl'),JSON.stringify({at:new Date().toISOString(),error:run.stderr||run.error?.message||'Measurement failed'})+'\n');}
 if(snapshot){try{await notifyCandidate(snapshot)}catch(e){appendFileSync(file('monitor-errors.jsonl'),JSON.stringify({at:new Date().toISOString(),error:e.message})+'\n');}}
 const end=Date.now()>=expires||failures>=3;
 status({lastCheckAt:new Date().toISOString(),lastCheckSucceeded:run.status===0,consecutiveFailures:failures,nextCheckAt:end?null:new Date(Date.now()+30*60*1000).toISOString()});
 if(end){finished=true;try{await report(snapshot)}catch(e){appendFileSync(file('monitor-errors.jsonl'),JSON.stringify({at:new Date().toISOString(),error:e.message})+'\n');}status({reason:failures>=3?'measurement_failed':'96_hours_elapsed',goalComplete:false});return;}
 setTimeout(()=>check().catch(e=>{finished=true;status({reason:'monitor_error',error:e.message})}),30*60*1000);
}
status();await check();
