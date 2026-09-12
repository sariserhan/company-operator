import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
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
 const aggregate=await client.query(`WITH visits AS (
 SELECT visitor_id,bot_classification,utm_source,utm_medium,utm_campaign,
 (coalesce(utm_source,'') ~* '^(codex|playwright|qa|test)$' OR coalesce(utm_campaign,'') ~* '(codex_verification|internal_test)' OR coalesce(browser,'') ILIKE '%headless%' OR coalesce(bot_classification_reason,'') ~* '(headless|automation)') AS own_test
 FROM visitor_sessions WHERE site_id=$1 AND started_at >= $2::timestamptz AND started_at < $3::timestamptz
 ), eligible AS (SELECT * FROM visits WHERE NOT own_test)
 SELECT (SELECT count(distinct visitor_id)::int FROM visits) AS total_tracked_visitors,
 (SELECT count(distinct visitor_id)::int FROM visits WHERE own_test) AS excluded_test_visitors,
 count(distinct visitor_id) FILTER (WHERE bot_classification='human')::int AS classifier_human_browser_ids,
 count(distinct visitor_id) FILTER (WHERE bot_classification IN ('human','likely_human'))::int AS browser_shaped_visitor_ids,
 count(distinct visitor_id) FILTER (WHERE bot_classification IN ('known_bot','likely_bot'))::int AS bot_visitors,
 count(distinct visitor_id) FILTER (WHERE bot_classification='unknown')::int AS unknown_visitors,
 count(distinct visitor_id) FILTER (WHERE bot_classification IN ('human','likely_human') AND utm_campaign IN ('first_100_visitors','100_human_visitors','first_customer_studios','expressed_need'))::int AS campaign_browser_ids
 FROM eligible`,[siteId,goal.startedAt,now]);
 const sources=await client.query(`SELECT coalesce(utm_source,'unattributed') AS source,bot_classification,count(distinct visitor_id)::int AS visitors FROM visitor_sessions WHERE site_id=$1 AND started_at >= $2::timestamptz AND started_at < $3::timestamptz AND utm_campaign IN ('first_100_visitors','100_human_visitors','first_customer_studios','expressed_need') GROUP BY utm_source,bot_classification ORDER BY visitors DESC LIMIT 30`,[siteId,goal.startedAt,now]);
 const github=await client.query(`WITH eligible AS (
 SELECT visitor_id,page_count,CASE
 WHEN utm_medium='showcase_tailwind' THEN 'tailwind_mobile'
 WHEN utm_medium='showcase_neon' THEN 'neon_feature'
 WHEN utm_medium='showcase_drizzle' THEN 'drizzle'
 WHEN utm_medium='showcase_nextjs' OR landing_page ~ '[?&]utm_content=nextjs(&|$)' OR referrer LIKE '%/vercel/next.js/discussions/98537%' THEN 'nextjs'
 WHEN utm_medium='showcase_betterauth_mobile' OR landing_page ~ '[?&]utm_content=betterauth_mobile(&|$)' OR referrer LIKE '%/better-auth/better-auth/discussions/11253%' THEN 'betterauth_mobile'
 WHEN utm_medium='showcase_shadcn_ui' OR landing_page ~ '[?&]utm_content=shadcn_ui(&|$)' OR referrer LIKE '%/shadcn-ui/ui/discussions/11847%' THEN 'shadcn_ui'
 ELSE 'github_post_unknown' END AS showcase
 FROM visitor_sessions WHERE site_id=$1 AND started_at >= $2::timestamptz AND started_at < $3::timestamptz
 AND utm_source='github' AND utm_campaign IN ('first_100_visitors','100_human_visitors','first_customer_studios','expressed_need')
 AND bot_classification IN ('human','likely_human')
 AND coalesce(browser,'') NOT ILIKE '%headless%' AND coalesce(bot_classification_reason,'') !~* '(headless|automation)'
 ) SELECT showcase,count(distinct visitor_id)::int AS visitors,count(distinct visitor_id) FILTER(WHERE page_count>1)::int AS visitors_with_multiple_pages FROM eligible GROUP BY showcase ORDER BY visitors DESC`,[siteId,goal.startedAt,now]);
 const engagement=await client.query(`SELECT e.event_type,count(*)::int AS events,count(distinct e.visitor_id)::int AS visitors FROM events e JOIN visitor_sessions s ON s.id=e.session_id AND s.site_id=e.site_id WHERE e.site_id=$1 AND s.started_at >= $2::timestamptz AND s.started_at < $3::timestamptz AND e.occurred_at >= $2::timestamptz AND e.occurred_at < $3::timestamptz AND s.bot_classification IN ('human','likely_human') AND s.utm_source='github' AND s.utm_campaign IN ('first_100_visitors','100_human_visitors','first_customer_studios','expressed_need') AND coalesce(s.browser,'') NOT ILIKE '%headless%' AND coalesce(s.bot_classification_reason,'') !~* '(headless|automation)' GROUP BY e.event_type ORDER BY events DESC`,[siteId,goal.startedAt,now]);
 const demoUsers=await client.query(`SELECT coalesce(s.utm_source,'unattributed') AS source,count(distinct s.visitor_id)::int AS visitors FROM events e JOIN visitor_sessions s ON s.id=e.session_id AND s.site_id=e.site_id WHERE e.site_id=$1 AND s.started_at >= $2::timestamptz AND s.started_at < $3::timestamptz AND e.occurred_at >= $2::timestamptz AND e.occurred_at < $3::timestamptz AND e.event_type='demo_interaction' AND s.bot_classification IN ('human','likely_human') AND coalesce(s.utm_source,'') !~* '^(codex|playwright|qa|test)$' AND coalesce(s.utm_campaign,'') !~* '(codex_verification|internal_test)' AND coalesce(s.browser,'') NOT ILIKE '%headless%' AND coalesce(s.bot_classification_reason,'') !~* '(headless|automation)' GROUP BY s.utm_source ORDER BY visitors DESC`,[siteId,goal.startedAt,now]);
 const quality=await client.query(`WITH per_session AS (
 SELECT s.visitor_id,s.network_organization,s.bot_classification_reason,s.page_count,
 EXISTS(SELECT 1 FROM events e WHERE e.site_id=s.site_id AND e.session_id=s.id AND e.event_type='demo_interaction' AND e.occurred_at < $3::timestamptz) AS demo_clicked
 FROM visitor_sessions s WHERE s.site_id=$1 AND s.started_at >= $2::timestamptz AND s.started_at < $3::timestamptz
 AND coalesce(s.utm_source,'') !~* '^(codex|playwright|qa|test)$'
 AND coalesce(s.utm_campaign,'') !~* '(codex_verification|internal_test)'
 AND coalesce(s.browser,'') NOT ILIKE '%headless%'
 AND coalesce(s.bot_classification_reason,'') !~* '(headless|automation)'
 ), per_visitor AS (
 SELECT visitor_id,bool_or(bot_classification_reason='browser_shaped_user_agent') AS browser_ua_only,
 bool_or(coalesce(network_organization,'') ~* '(Google LLC|Google Ireland|Palo Alto Networks|Amazon Technologies|Amazon Data Services)') AS network_review,
 bool_or(demo_clicked) AS demo_clicked,bool_or(page_count>1) AS multiple_pages
 FROM per_session GROUP BY visitor_id
 ) SELECT count(*) FILTER(WHERE browser_ua_only)::int AS browser_ua_only_ids,
 count(*) FILTER(WHERE network_review)::int AS cloud_or_security_network_ids_for_review,
 count(*) FILTER(WHERE network_review AND NOT demo_clicked AND NOT multiple_pages)::int AS network_review_ids_without_demo_or_multiple_pages,
 count(*) FILTER(WHERE demo_clicked)::int AS demo_interaction_browser_ids,
 count(*) FILTER(WHERE multiple_pages)::int AS multiple_page_browser_ids
 FROM per_visitor`,[siteId,goal.startedAt,now]);
 const funnel=await client.query(`SELECT coalesce(s.utm_source,'unattributed') AS source,e.event_type,count(distinct s.visitor_id)::int AS browser_ids,count(*)::int AS events
 FROM events e JOIN visitor_sessions s ON s.id=e.session_id AND s.site_id=e.site_id
 WHERE e.site_id=$1 AND e.occurred_at >= $2::timestamptz AND e.occurred_at < $3::timestamptz
 AND e.event_type IN ('tool_check_started','tool_check_completed','tool_check_failed','demo_interaction','signup_cta_clicked','signup_viewed','signup_submitted','signup_failed','signup_accepted','signup_oauth_started')
 AND coalesce(s.utm_source,'') !~* '^(codex|playwright|qa|test)$'
 AND coalesce(s.utm_campaign,'') !~* '(codex_verification|internal_test)'
 AND coalesce(s.browser,'') NOT ILIKE '%headless%'
 AND coalesce(s.bot_classification_reason,'') !~* '(headless|automation)'
 GROUP BY s.utm_source,e.event_type ORDER BY source,e.event_type`,[siteId,goal.startedAt,now]);
 await client.query('ROLLBACK');
 const activationRun=spawnSync(process.execPath,[fileURLToPath(new URL('measure-activation.mjs',root))],{encoding:'utf8',timeout:20000});
 if(activationRun.status!==0)throw Error('Corrected activation measurement unavailable');
 const correctedActivation=JSON.parse(activationRun.stdout);
 const result={capturedAt:now,start:goal.startedAt,target:100,siteDomain:'visitorping.com',productionTargetVerified:true,productionSource:'Recorded backup; matches live endpoint historical aggregates on this check',...aggregate.rows[0],measurementVersion:2,activation:correctedActivation,rawActivationLabel:'Product endpoint does not yet include owner-confirmed workspace exclusions; campaign uses corrected counts.',signupFunnel:funnel.rows,signupFunnelLimitations:"Optional browser telemetry, not verified people. signup_accepted means email signup accepted pending verification; OAuth starts are not completed signups. Missing events may reflect blocked tracking or unreleased instrumentation.",verifiedRealPeople:null,trafficQuality:quality.rows[0],campaignSources:sources.rows,githubShowcases:github.rows,githubEngagementEvents:engagement.rows,demoInteractionVisitorsBySource:demoUsers.rows,spendUsd:0,limitations:['Previous estimated_human_visitors figures were browser-shaped identifiers, not validated human traffic; they must not be used as real-person goal progress.','Cloud/security network ownership flags review only: proxies and cloud browsers can carry genuine users. Interaction and multi-page counts also do not prove distinct people.','Browser identifiers approximate people; no exact person deduplication is possible.','Likely-human classification can be based only on a browser-shaped user agent. It is not definitive proof of a person.','Known labeled QA checks are excluded. After campaign start our agents must avoid tracked browser visits to VisitorPing, or label them codex_verification.','Distinct counts in classification buckets can overlap; do not sum them.'],goalComplete:false};
 writeFileSync(new URL('latest-traffic.json',root),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
} catch(error){console.error(JSON.stringify({error:error.message}));process.exitCode=1;} finally{await client.end();}
