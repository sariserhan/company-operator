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

 const sessions=await client.query(`SELECT s.started_at,s.last_activity_at,s.page_count,s.browser,s.os,s.network_organization,s.bot_classification_reason,ARRAY(SELECT DISTINCT e.event_type FROM events e WHERE e.site_id=s.site_id AND e.session_id=s.id) AS events FROM visitor_sessions s WHERE s.site_id=$1 AND s.utm_source='temple' AND s.utm_campaign='first_customer_studios' ORDER BY s.started_at DESC LIMIT 5`,[siteId]);
 await client.query('ROLLBACK');console.log(JSON.stringify({capturedAt:now,sessions:sessions.rows},null,2));
} catch(error){console.error(JSON.stringify({error:error.message}));process.exitCode=1;} finally{await client.end();}
