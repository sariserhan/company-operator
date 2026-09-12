I built VisitorPing with Drizzle and Postgres: a live website-visitor dashboard with an iPhone companion for arrival alerts.

One schema choice worth sharing if you're collecting events for multiple websites: browser-generated identifiers need a site boundary. In my schema, visitors are unique on `(site_id, anonymous_id)` and sessions are unique on `(site_id, session_key)`. The database rows also have their own primary IDs.

A session key from a browser is only meaningful within that website. Making it globally unique would let the same client-generated value collide across unrelated sites. The composite indexes express that boundary directly in Postgres through Drizzle. They don't replace authorization—queries still need the correct site scope and access checks.

For the live feed, sessions also have an index on `(site_id, started_at)`, while event history is indexed by `(session_id, occurred_at, id)`. This is the current schema pattern, not a claim of benchmarked throughput or a complete analytics schema.

[Try the visitor-alert demo—no signup needed](https://visitorping.com/demo?utm_source=github&utm_medium=showcase_drizzle&utm_campaign=first_100_visitors&utm_content=drizzle). Press “Send a sample visitor” to see the dashboard and illustrative phone notification update together.

VisitorPing is a commercial product with a private repository, a 14-day Starter trial, and plans from $19/month. The demo uses simulated data. I'm sharing the schema approach here because the distinction between database identity and client-generated identity may be useful to others building multi-site products.
