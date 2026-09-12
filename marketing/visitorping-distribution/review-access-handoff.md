# AppAddict review-access handoff

Lou acknowledged the submission and invited review access, with no coverage promise. Reply draft in appaddict-followup.txt; not sent until sender address is supplied. The offer is 30 days of complimentary Pro access, activated when he is ready. No license, account, or entitlement has been created.

Implementation already exists in VisitorPing: apps/web/lib/admin-users.ts adminGrantOrganizationAccess, surfaced in the admin users table. It accepts a plan, future expiry and reason, and records an access audit without altering Stripe plan fields. Do not use the separate general plan dropdown for this task.

Before issuing: verify authenticated production admin access and the exact reviewer-owned organization. Match the account email supplied by Lou and its owner membership; never select by organization name alone. Set Pro, expiry 30 days from activation, reason AppAddict independent editorial evaluation. Read back the expiry and effective entitlement before saying access is active. Do not share owner credentials, production customer data or a pre-created password. Existing live deployment availability of the grant control remains to be verified.

Review test: connect a site he controls, install tracker, connect iPhone and permit notifications, create one clearly identified test visit. Do not count review or assistant test traffic as customer acquisition. No paid-ad spend or positive-review condition. LaunchFree acknowledgement needs no reply; wait for actual approval evidence rather than resubmitting.
