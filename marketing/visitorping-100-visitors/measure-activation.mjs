import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
const root=new URL('./',import.meta.url);
const goal=JSON.parse(readFileSync(new URL('goal.json',root),'utf8'));
const env=parseEnv(readFileSync('/home/ssari/projects/visitorping/apps/web/.env.local','utf8'));
const targets=JSON.parse(readFileSync('/home/ssari/projects/visitorping/config/production-database-targets.json','utf8'));
const connection=new URL(env.PROD_BACKUP_DATABASE_URL);
if(connection.hostname!==targets.backup.host)throw Error('Production target mismatch');
connection.searchParams.set('sslmode','verify-full');
const require=createRequire('/home/ssari/projects/visitorping/packages/db/package.json');
const {Client}=require('pg');
const client=new Client({connectionString:connection.toString(),connectionTimeoutMillis:10000});
try {
 await client.connect();await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='10s'");
 const sites=await client.query("SELECT id FROM sites WHERE lower(regexp_replace(regexp_replace(domain,'^https?://',''), '/+$','')) IN ('visitorping.com','www.visitorping.com')");
 if(sites.rows.length!==1)throw Error('Exact marketing site is ambiguous or missing');
 const siteId=sites.rows[0].id; const now=new Date().toISOString();
 const operatorEnv=parseEnv(readFileSync('/home/ssari/projects/company-operator/.env.local','utf8'));
 const liveResponse=await fetch('https://visitorping.com/api/operator/analytics',{headers:{Authorization:`Bearer ${operatorEnv.VISITORPING_ANALYTICS_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!liveResponse.ok)throw Error('Live analytics cross-check unavailable');
 const live=await liveResponse.json(),window=live.periods[0];
 const check=await client.query('SELECT count(distinct visitor_id)::int visitors,count(*)::int sessions FROM visitor_sessions WHERE site_id=$1 AND started_at >= $2::timestamptz AND started_at < $3::timestamptz',[siteId,new Date(window.start).toISOString(),new Date(window.end).toISOString()]);
 if(check.rows[0].visitors!==window.websiteVisitors||check.rows[0].sessions!==window.websiteSessions)throw Error('Active production data mismatch; campaign counts withheld');

 const exclusionsFile=new URL('owner-workspace-exclusions.json',root);
 let exclusions;
 try { exclusions=JSON.parse(readFileSync(exclusionsFile,'utf8')); }
 catch (error) {
  if(error.code!=='ENOENT') throw error;
  const known=await client.query("SELECT id FROM organization WHERE created_at <= $1::timestamptz",['2026-09-11T03:07:04.537Z']);
  exclusions={recordedAt:now,cutoff:'2026-09-11T03:07:04.537Z',reason:'Owner explicitly confirmed all workspaces in the reported baseline belong to them; exclude these fixed IDs, not future accounts.',organizationIds:known.rows.map(x=>x.id)};
  writeFileSync(exclusionsFile,JSON.stringify(exclusions,null,2)+'\n');
 }
 const admins=(env.ADMIN_EMAILS??'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const result=await client.query(`WITH external AS (
 SELECT o.id FROM organization o WHERE NOT (o.id=ANY($2::text[])) AND NOT EXISTS (
 SELECT 1 FROM member m JOIN "user" u ON u.id=m.user_id WHERE m.organization_id=o.id
 AND (split_part(lower(u.email),'@',2) IN ('example.com','visitorping.com') OR (split_part(split_part(lower(u.email),'@',1),'+',1)||'@'||split_part(lower(u.email),'@',2))=ANY($1::text[]))
 )) SELECT count(*)::int AS workspaces,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM member m JOIN "user" u ON u.id=m.user_id WHERE m.organization_id=x.id AND u.email_verified))::int AS email_verified,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM sites s WHERE s.organization_id=x.id))::int AS site_added,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM sites s WHERE s.organization_id=x.id AND s.verified_at IS NOT NULL))::int AS tracker_verified,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM sites s JOIN visitor_sessions v ON v.site_id=s.id WHERE s.organization_id=x.id AND v.bot_classification IN ('human','likely_human') AND left(v.session_key,16)<>'admin_synthetic_' AND s.id NOT LIKE 'synthetic-health-%'))::int AS first_browser_visit,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM alert_delivery_attempts a WHERE a.organization_id=x.id AND a.is_test=false AND a.status IN ('accepted','delivered')))::int AS notification_accepted_or_delivered
 FROM external x`,[admins,exclusions.organizationIds]);
 await client.query('ROLLBACK');
 const output={capturedAt:now,productionVerified:true,scope:'candidate_external_workspaces_excluding_owner_baseline',...result.rows[0],limitation:'Independent lifetime stages, not a campaign cohort or proof of real people. Excludes the owner-confirmed baseline and application internal-account exclusions. New unmatched workspaces require review before being called customers.'};
 writeFileSync(new URL('activation-baseline.json',root),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
} catch(error){console.error(JSON.stringify({error:error.message}));process.exitCode=1;} finally{await client.end();}
