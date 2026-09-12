# Take The Wall: first traffic experiments

Started 2026-09-12. Budget: $0. Success means external visits, not directory submissions, bot hits, purchases by the owner, or our verification requests. No new background analytics polling.

## Positioning

One page. One owner. Anyone can take it over.

Take The Wall is a public internet experiment. Browsing is free. A one-time $3.99 payment replaces the current owner's website, app, social profile, or message. It remains until the next takeover. No guaranteed audience or duration. Lead with curiosity or verified milestone rewards under the updated user instruction. Do not fabricate popularity, revenue, guaranteed earnings, or guaranteed exposure.

## Live-channel work

VisitorPing marketing footer: a referral link to the wall, clearly described as another project from the same maker.
Tracking URL: https://takethewall.com/?utm_source=visitorping&utm_medium=referral&utm_campaign=wall_launch&utm_content=footer
Status: deployed 2026-09-12 in VisitorPing commit 2516b9b; production deployment READY and public HTML contains the tracked link. No incremental visitor count claimed.

## Directory submissions — see confirmed status below

### Weird Revenue
Source checked 2026-09-12: https://weirdrevenue.com/submit
Accepts unusual commercial projects; its categories include space on a page. Strongest fit. No claimed or invented revenue. Leave revenue, launch date, creator name, and public submitter credit empty unless required and verified.

Project: Take The Wall
URL: https://takethewall.com/
Category: Space on a page
Description: One web page has one featured owner. A one-time $3.99 payment replaces the current owner's website, app, social profile, or message. It stays until somebody else takes over; there is no guaranteed duration or audience.
Notes: Submitted by the maker. The site is live. No revenue figure is being claimed. Public counters should not be treated as verified revenue; the site's About the numbers explains their meaning.
Evidence URL: https://takethewall.com/

### Another Useless Website
Source checked 2026-09-12: https://anotheruseless.website/submit-website/
Accepts creator submissions of unusual websites. Review fit as a playful commercial experiment; never describe taking ownership as free.

Description: A tiny experiment in temporary ownership of a web page: anyone can look for free, and the next person who pays $3.99 replaces whatever is on the wall. There is only one current owner. I built it around one question: what would you put on a page that someone else can take over?
URL: https://takethewall.com/
Contact fields: supply only after sender identity is authorized; do not invent a person.

### The Random Web
Source checked 2026-09-12: https://therandomweb.com/contact
Accepts entertaining sites, preferably free to use; disclose the paid takeover clearly.

Subject: Website submission — Take The Wall
Message: I built Take The Wall, a public web experiment with one page and one owner. Anyone can browse for free. Paying $3.99 replaces the current owner's content until the next takeover. It is a small, unusual corner of the web rather than a directory or feed. Would it fit your collection? https://takethewall.com/
Contact fields: supply only after sender identity is authorized.

## Excluded

Random Daily URLs: https://randomdailyurls.com/submit explicitly says not to submit your own commercial site.
Internet Intro: https://internetintro.com/submit/ asks to skip stores and sales pages; do not certify eligibility for this commercial page.
No purchased traffic, fake votes, mass submissions, unsolicited bulk email, or automated social-account creation.

## Initial social draft — superseded by published wall_100 post

I made a website with one page and one owner.

Anyone can take it over. The next takeover replaces yours.

What would you put on it?
https://takethewall.com/?utm_source=x&utm_medium=social&utm_campaign=wall_launch&utm_content=one_owner

The landing page must keep the takeover price and terms clear. This draft makes no free-purchase or traffic claim.

## Measurement

Start with a manually reviewed source breakdown after placements actually go live. Exclude known/likely bots and our test URLs. Describe browser-based uniques as estimated people, not verified humans. Keep submission acceptance, click-throughs, and visits separate. Do not report any new visitors until measured.


## Submission results — 2026-09-12

Authorized in the conversation with “okay continue” after the three drafts and
recipient sites were presented.

- Weird Revenue: RECEIVED FOR REVIEW at 18:25 UTC. Redirected to `/submit?sent=1`
  and displayed its queue confirmation. Not yet a published listing; it says it
  reviews submissions a few times a week and sends no confirmation email.
- Another Useless Website: NOT SENT. Submission page returned HTTP 403.
- The Random Web: NOT CONFIRMED RECEIVED. Its published Formspree endpoint rejected
  the submission with HTTP 403 / Cloudflare 1010. No alternate identity or retry.

Structured receipt: `submission-receipts.json`. No money spent. No incremental
visits claimed. Do not resubmit Weird Revenue while it is awaiting review.

## 100-visitor campaign — September 12, 18:40 UTC onward

Current objective: 100 new external unpaid visitors to Take The Wall. See `goal.json`.
GitHub profile placement published in sariserhan/sariserhan commit 21403c1.
X post published via connected free Buffer account:
https://x.com/serhansarii/status/2098848099712012578

OpenWeird confirmed receipt for review. StumblingOn returned Failed to fetch.
WackyWebs form did not confirm; its documented business-email fallback was sent once
and accepted by the provider. No publication is claimed for any of these directories.

Measurement: run `node marketing/takethewall/measure.mjs` sparingly (about hourly while
actively reviewing the campaign); no background database polling. Count distinct browser
identifiers with page views, excluding classified bots and identifiable tests. Owner
identifiers remain unknown, so browser estimates are not verified individual people.
Do not count public display-counter additions, submissions, or our checks as visitors.

The browser needs the extracted libraries in
`/tmp/company-operator-browser-libs/extracted/usr/lib/x86_64-linux-gnu` and
`FONTCONFIG_FILE=/tmp/ttw-fonts.conf`. Missing fonts caused crashes/blank screens.
Do not commit authenticated browser profiles or raw session data.

Follow-up X post: scheduled through Buffer for 2026-09-14 16:00 UTC (12:00 New York).
Queue verification shows the matching post at that time. See `placements.json`.
Latest measurement at 19:04 UTC: 0 qualifying new browser identifiers; goal remains open.
WackyWebs email provider reports sent, not delivered or reviewed.

Next review: check actual X referrals and curator responses after they have had time
to arrive; do not duplicate pending submissions. Use observed source performance to
choose the next placement. The Buffer follow-up is scheduled; no autonomous background
posting agent or database monitor was started for this campaign.

## Distribution-only instruction

The user owns traffic measurement with VisitorPing. Do not run campaign measurement
scripts or start monitoring. Stopped the old assistant-owned VisitorPing monitor.
Focus future work on actual distribution, publishing, and relevant discovery placements.

Published GitHub project-page improvements in sariserhan/takethewall commit db43e5f:
canonical website URL, description, relevant topics, and a prominent live-wall README link.
Oddweb form attempted once without success confirmation; recorded as unconfirmed.

## Reward-led distribution update

Zearches published Take The Wall in Entertainment & Media and its latest-site feed.
No donation was made. The submission was sent before the user's instruction to avoid
price-led public copy; future public hooks should follow the updated instruction.

Verified public production rewards configuration: promotion enabled, #100 -> $100,
then #1,000 -> $1,000 and higher configured milestones. This checks product facts,
not visitor counts. Claim eligibility and payout review remain required.
Edited the existing September 14 X post to lead with the $100 milestone reward.
Buffer confirmed the replacement text and original schedule. No duplicate post created.

Next creative improvement: social link previews still inherit the site's price-led
Open Graph metadata. Review the preview before future creative publication so the
image and headline support the requested reward/curiosity hook.

## Social preview shipped

Take The Wall commit 939d640 changes the root and homepage metadata and generated
Open Graph image to a curiosity hook. Deployed successfully; production metadata
verified. New image attached to the existing September 14 reward post in Buffer.
See `assets/social-preview.png`, `patches/social-preview.patch`, and placements.json.

Browser plugin unavailable; regular Playwright used for Buffer. The generated image
was inspected directly. Local metadata assertions, targeted lint and typecheck passed.
Local full-homepage rendering lacked Convex configuration, so no full UI pass is claimed.
The temporary development server was stopped. No visitor analytics were queried.

FartDump submission blocked by security verification; not sent. Cloudhiker requires
an account and a flag for AI-assisted sites; no account created or submission made.

## Community distribution — September 12, 20:00 UTC

Published a Take The Wall showcase in the Next.js Show and tell community:
https://github.com/vercel/next.js/discussions/98601
The category explicitly invites projects; checked its conduct policy and searched
for duplicates before posting. The source-backed explanation covers verified webhook
activation and event deduplication. Copy and receipt are committed alongside this log.

Published the existing scheduled reward/image post immediately via Buffer:
https://x.com/serhansarii/status/2098864519275483494
This replaces the September 14 schedule, rather than creating a duplicate. Confirmed
in Buffer Sent. No future Take The Wall post remains in the queue.

Sent LaunchFree a transparent fit inquiry using contact@takethewall.com. Its rules
exclude gambling, so the inquiry explains the paid-placement/milestone mechanism and
asks whether the project fits. Provider accepted the email; no directory submission,
approval, delivery, or publication is claimed. No money spent or traffic queried.

## Additional curator distribution — September 12

Bored Button confirmed receipt of Take The Wall through its official Add a Website
form: “Thank you! We’ll review your suggestion right away.” This is a review
submission, not a published listing. Receipt and exact copy are in
`boredbutton-submission.json`. Used only contact@takethewall.com; spent $0.

Share Your Startup form filled, but its Post it button stayed disabled. Public
HTML loads Cloudflare Turnstile. Playwright timed out before clicking; no submission
was dispatched, and no verification bypass was attempted. Launching Next and Ignlab
require human verification. Hype Star failed TLS hostname verification. Bored A Lot
failed DNS resolution. BORED's feedback button opened no form; no message sent.

Convex's get-convex/convex-js repository has discussions disabled, so no showcase
was posted there. Freeboard requires verified email or an on-site backlink; not
submitted and no backlink added. Existing pending placements were not duplicated.
No traffic queries or background monitors ran. No new public placement or visitor
increase is claimed for this batch.

## Freeboard published — September 12

Live listing: https://freeboard.lol/site/takethewall.com
Official submission form confirmed: “You're live. Your backlink remains verified
as an ownership check.” Public directory search confirms the name, domain,
curiosity-led description, Entertainment & Humour category and verified status.
The outgoing tracking link was not clicked; no campaign traffic was queried.

Added a plain nofollow Freeboard directory link to the existing Take The Wall footer.
Source commit 448226a was pushed and deployed successfully to production. Exact patch
is in patches/freeboard-footer.patch. Targeted lint, typecheck and diff checks passed;
production HTML contains the link. No backend code changed. The first form attempt
could not click a disabled button; allowing hydration to finish before filling the
form made its normal button available, and the verified submission succeeded.

Share Your Startup follow-up found its URL field automatically prefixes https://.
Corrected the duplicate prefix and verified the visible fields; Post it remained
disabled. No forced click, verification bypass or submission took place.

Spent $0. Freeboard publication is a new distribution placement, not evidence that
the 100-person traffic goal has been reached.
