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

 const target='5819c6f7-5e7c-4c55-93ed-1db2c26b4fe4';
 const targetSessions=await client.query(`SELECT s.id,s.visitor_id,s.started_at,s.last_activity_at,s.ended_at,s.landing_page,s.current_page,s.referrer,s.utm_source,s.utm_medium,s.utm_campaign,s.page_count,s.browser,s.os,s.device_type,s.country,s.bot_classification,s.bot_name,s.bot_score,s.user_agent_category,s.bot_classification_reason,s.network_organization FROM visitor_sessions s JOIN visitors v ON v.id=s.visitor_id AND v.site_id=s.site_id WHERE s.site_id=$1 AND (s.id=$2 OR s.visitor_id=$2 OR v.anonymous_id=$2) ORDER BY s.started_at DESC LIMIT 30`,[siteId,target]);
 const targetEvents=await client.query(`SELECT e.session_id,e.event_type,e.path,e.occurred_at,e.event_data->>'durationMs' AS duration_ms,e.event_data->>'exitReason' AS exit_reason FROM events e WHERE e.site_id=$1 AND e.session_id=ANY($2::text[]) ORDER BY e.occurred_at LIMIT 100`,[siteId,targetSessions.rows.map(s=>s.id)]);
 const cohorts=await client.query(`SELECT bot_classification,bot_classification_reason,user_agent_category,browser,os,device_type,network_organization,count(distinct visitor_id)::int AS visitors,count(*)::int AS sessions,count(*) FILTER(WHERE page_count>1)::int AS multi_page_sessions FROM visitor_sessions WHERE site_id=$1 AND started_at >= $2::timestamptz AND started_at < $3::timestamptz GROUP BY bot_classification,bot_classification_reason,user_agent_category,browser,os,device_type,network_organization ORDER BY visitors DESC LIMIT 40`,[siteId,goal.startedAt,now]);
 const durations=await client.query(`SELECT coalesce(s.utm_source,'unattributed') source,e.event_data->>'durationMs' AS duration_ms,count(*)::int AS events FROM events e JOIN visitor_sessions s ON s.id=e.session_id AND s.site_id=e.site_id WHERE e.site_id=$1 AND s.started_at >= $2::timestamptz AND s.started_at < $3::timestamptz AND e.event_type='page_duration' GROUP BY s.utm_source,e.event_data->>'durationMs' ORDER BY events DESC LIMIT 35`,[siteId,goal.startedAt,now]);
 await client.query('ROLLBACK');const result={capturedAt:now,target,productionVerified:true,targetSessions:targetSessions.rows,targetEvents:targetEvents.rows,cohorts:cohorts.rows,durations:durations.rows};writeFileSync(new URL('crawler-audit.json',root),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} catch(error){console.error(JSON.stringify({error:error.message}));process.exitCode=1;} finally{await client.end();}
