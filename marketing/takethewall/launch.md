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

## Directory channel stopped at user request

Removed the Freeboard footer backlink in Take The Wall commit bac75fb, pushed and
successfully deployed. Parsed production homepage HTML confirms no Freeboard anchor.
No external listing deletion was requested or attempted. Existing directory records
are historical, not an active submission queue. Standing instructions now prohibit
directory submissions and reciprocal links.

Assessed existing takeover sharing: public pages, downloadable cards, native sharing,
and post-payment share UI already exist. More share controls do not solve a lack of
initial external participants. Prepared a 15-second visual-demo experiment instead
in visual-demo-experiment.md. This is a storyboard, not a rendered or scheduled video.
It uses clearly labeled example takeovers, no invented customers or audience counts,
and a curiosity-led website CTA. No traffic queries, purchases, or spending.

## Visual takeover demo published — September 12, 21:06 UTC

Published a 15-second original animated explanation through the connected Buffer
X account: https://x.com/serhansarii/status/2098881087174803759
The first example message is replaced by a second; example/demo labels remain
visible throughout. Ends with the live-site CTA. No price-led hook, prize claim,
fake customers, or invented traffic. Caption links to the wall_demo campaign URL.

Buffer Sent confirms matching text, video preview, and the public post URL.
Committed MP4 plus editable render script and publication receipt. Checked sample
frames visually and decoded all 360 frames successfully. Spent $0. No website
or backend changes, production purchases, directory submissions, or traffic queries.
The traffic goal remains open; publication is not proof of external visitors.

## Creator/editorial outreach — September 12

Checked five primary candidates: Matt Muir (Web Curios), Jason Kottke,
Scott Beale's Laughing Squid, Kai Brach (Dense Discovery), and Paul Strauss
(The Awesomer). Sent individual pitches to the first two, who explicitly invite
project suggestions. Both emails were accepted by Resend; delivery, replies and
coverage are not confirmed. Each includes the labeled 15-second demo attachment,
source-specific site link, accurate participation terms, and an editorial ask.

Laughing Squid prohibits product promotions. Dense Discovery was excluded on
editorial fit. The Awesomer requires a visual anti-spam challenge; no submission
or bypass. Additional exploratory leads were not contacted without a verified
route. Full sources, reasons, copy and receipts are in creator-outreach/.

User assigns website implementation to another agent. Recorded hands-off website
instruction; all work here is distribution. No directories, spend or traffic checks.


## First-owner launch kit execution — September 12, 2026

- Recorded and validated a 15-second **actual app preview** (mobile/desktop example). Not a payment/activation demonstration. Asset: `assets/app-preview.mp4`.
- Scheduled the preview video through Buffer for **September 13, 16:00 UTC**, verified in Queue with the matching caption, date and video. Receipt: `first-owners/app-preview-schedule.json`. This is currently the one upcoming Take The Wall post.
- Six personal invitations accepted by Resend: Picobble, Lynen, Termique, Tim Holman, Matt Round, Martin O’Leary. No delivery, reply or purchase claims. Separate receipts in `first-owners/`; previous editorial pitches not duplicated.
- Kinapod contact form explicitly failed; not counted as sent.
- Two Reddit drafts prepared after rule review. Submit page returned a network-security block; no Reddit post created.
- Fourteen public prospect candidates recorded with evidence and limitations; six existing-network contacts missing. Creator audience sizes and exact launch dates are not verified. Seven candidates are held for contact/access limitations.
- Live-event runbook ready, but host/time/platform and verified live checkout/activation are missing. Event not announced.
- No app modifications, directories, spending, traffic monitoring or claimed conversions. Full status: `first-owners/README.md`.


## Fresh public showcase and editorial pitches — September 12, 2026

Published a new project post in Tailwind CSS **Show and tell**, with an actual-app preview image, screen recording, technical explanation of the preview container sizing, and a tracked direct link to the live preview: https://github.com/tailwindlabs/tailwindcss/discussions/20489. Read-back matches reviewed body, category and author; public image returns HTTP 200. No support issue or duplicate Take The Wall thread created.

Two personalized editorial tips accepted by the email provider: Andy Baio / Waxy (`7ab152e6-310d-412e-adb0-2a2b9ec5b381`) and Rob Beschizza / Boing Boing (`b836334d-7dc3-495b-8b19-9f361195121f`). Both official sites publish editorial contact routes; pitches reference their specific shared-browser-experiment coverage and attach the real preview clip. No delivery, reply or editorial-coverage claim. This is editorial outreach, not a directory submission.

DEV and Indie Hackers publication URLs require sign-in in the available session; neither received a post. Existing pending outreach and tomorrow's X video not duplicated. No app changes, spending, traffic queries or monitors. Drafts, sources and receipts: `editorial-wave-two/`.


## Creator and newsletter discovery — September 13, 2026

- B3ta official newsletter project form confirmed receipt at `/mailus/thanks/`. Used the project-promotion category; no paid placement or directory listing. No editorial acceptance claimed.
- Matty McTech creator pitch accepted by Resend, email ID `eef3868f-11f6-4ff0-84ab-443ffaf63309`. Contact verified from the Email link on his official linked profile, https://solo.to/setupspawn. Attached actual app preview and offered use in editorial/video coverage. No reply or coverage confirmed.
- Sources, exact copy and receipts: `creator-discovery/`. No spending, app changes, duplicate pitches, traffic queries or monitors.


## Creator collaboration proposals — September 13, 2026

Published `creator-collaboration/HOST-PACK.md`: a five-minute audience sentence prompt and preview segment, with the actual-app clip, caption and tracked preview links. Suggestions/preview are free; publishing terms remain accurate. No host or date announced.

Greg Technology's personalized invitation was accepted by Resend at 01:33 UTC, ID `4df1cd9a-eb79-41a0-beac-6e4899eafee2`. Adnan Aga's official contact form closed and redirected to his homepage after submission, without an explicit success receipt; recorded as submitted unconfirmed and will not be retried. Neither collaboration is confirmed. Sources, exact messages and receipts are in `creator-collaboration/`.

Spent $0. No website edits, duplicate pending invitations, directory submissions or traffic monitoring.


## Outreach correction — September 13, 2026

User supplied apparent spam-related feedback on the Greg Technology invitation. Formal provider complaint not verified. Marked Greg do-not-contact and paused new cold emails and cold-email follow-ups in the distribution instructions. No response or additional email sent. The original invitation was overly long and asked for unpaid promotional work before establishing interest; this is an editorial assessment, not a verified cause of filtering. Public distribution remains available.


## Current product campaign refresh — September 13, 2026

Verified production price ($4.99 plus applicable tax), free email entry, two rewards per milestone and current designer against rendered production rules version 2026-09-13.1. Updated reusable creator kit and marked stale first-owner drafts superseded; historical sent messages remain intact. Current facts: CURRENT-FACTS.md.

Replaced the queued old-price video post with a new actual preview image and creative prompt, then published it early: https://x.com/serhansarii/status/2099102910428717080. Buffer Sent confirms publication. No duplicate post scheduled by this action. Updated the existing Tailwind Show and tell body with current price, free-entry link and current screenshot; mutation response matches revised copy.

Spend $0; no cold email, app code changes, purchases or traffic queries. No new visitor result claimed.


## Founder pilot recruitment — September 14, 2026

Published a three-founder opt-in invitation and linked it prominently from the existing project GitHub README. Readback verifies the public recruitment block. No confirmed participants or start date; no reserved placements or extra prizes. Current production rules verified, including contact@takethewall.com free-entry address.

Reddit remains blocked by network security; Indie Hackers requires sign-in. Neither received a submission. Prepared tailored launch drafts and a video capture plan; no new video or PH/HN launch claimed. No cold email, paid ads, purchases, website/backend changes or traffic monitoring. Receipt and runbook: founder-pilot/.


## New influencer outreach — September 15, 2026

User reopened tailored influencer contact. Kevin Stratvert's official video-request form confirmed receipt of a specific preview/designer tutorial suggestion. Hayls World's official business contact form was submitted but did not show confirmation and displayed hCaptcha; marked unconfirmed with no retry. No creator agreement, coverage or traffic claim. Exact copy, source checks and receipts: influencers-sept15/.

Excluded do-not-contact Greg, all prior recipients, closed brand-deal routes and unverifiable contacts. No SMS or direct email sent in this batch; both were official form messages. No spending, app changes or traffic monitoring.


## Frontend creator outreach continuation — September 15, 2026

Frontend Horse / Alex Trost topic suggestion submitted through the official form, which explicitly welcomes suggestions. Redirected to contact?success=true. No response or coverage claimed. Chris Coyier email was rejected by automatic approval review and not sent; held draft and reasons recorded. No spend, duplicate outreach, app edits or traffic checks.


## Approved Chris Coyier pitch — September 15, 2026

After explicit user approval of the prepared message and recipient, sent the pitch from contact@takethewall.com to chriscoyier@gmail.com. Resend accepted it (7d0fdf74-9e8a-42c5-9fa6-2703a1f543b9). No delivery, response or coverage claim. No spending or automatic follow-up.
