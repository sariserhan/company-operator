import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
const require=createRequire('/home/ssari/projects/visitorping/packages/db/package.json');
const {Client}=require('pg');
const goal=JSON.parse(readFileSync(new URL('./goal.json',import.meta.url),'utf8'));
const env=parseEnv(readFileSync('/home/ssari/projects/visitorping/apps/web/.env.local','utf8'));
const targets=JSON.parse(readFileSync('/home/ssari/projects/visitorping/config/production-database-targets.json','utf8'));
const uri=new URL(env.PROD_BACKUP_DATABASE_URL);if(uri.hostname!==targets.backup.host)throw Error('Database target mismatch');uri.searchParams.set('sslmode','verify-full');
const client=new Client({connectionString:uri.toString(),connectionTimeoutMillis:5000});
try{
 await client.connect();await client.query("begin read only;set local statement_timeout='5s'");
 const {rows:[site]}=await client.query('select domain from sites where id=$1',[goal.siteId]);if(site?.domain!==goal.domain)throw Error('Website mismatch');
 const {rows}=await client.query(`with eligible as (
 select s.visitor_id,coalesce(s.utm_source,nullif(substring(s.referrer from '^https?://([^/?#]+)'),''),'direct/unknown') source,
 s.bot_classification, s.started_at
 from visitor_sessions s where s.site_id=$1 and s.started_at >= $2::timestamptz
 and s.visitor_id <> all($3::text[])
 and s.bot_classification not in ('known_bot','likely_bot')
 and coalesce(s.browser,'') not ilike '%headless%'
 and coalesce(s.bot_classification_reason,'') !~* '(headless|automation)'
 and coalesce(s.utm_source,'') !~* '^(codex|playwright|qa|test)$'
 and coalesce(s.utm_campaign,'') !~* '(codex_verification|internal_test)'
 and coalesce(s.utm_medium,'') !~* '^(cpc|ppc|paid|paid_social|display|retargeting)$'
 and exists(select 1 from events e where e.site_id=s.site_id and e.session_id=s.id and e.event_type='page_view')
 ) select source,count(distinct visitor_id)::int estimated_browsers,
 count(distinct visitor_id) filter(where bot_classification='human')::int high_confidence_browsers,
 min(started_at) first_seen,max(started_at) last_seen,grouping(source)::int is_total
 from eligible group by grouping sets ((source),()) order by is_total desc,estimated_browsers desc`,[goal.siteId,goal.startedAt,goal.excludedVisitorIds]);
 await client.query('rollback');
 const result={checkedAt:new Date().toISOString(),startedAt:goal.startedAt,target:goal.target,total:rows.find(r=>r.is_total===1),sources:rows.filter(r=>r.is_total===0),verifiedPeople:null,goalComplete:false,limitations:goal.measurement};
 writeFileSync(new URL('./latest-traffic.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await client.end();}
