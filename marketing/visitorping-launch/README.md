# VisitorPing first acquisition campaign

Owner request: take responsibility for audience, copy, creative, landing page and execution. Onboarding and payment are working according to the owner. The objective is attracting and activating users. Do not treat zero measured activity as proof of broken product functionality.

## Prepared deliverables
- Local review: http://localhost:4000/campaigns/visitorping-launch/index.html
- Two square PNG ads, copy, tagged destination URLs, and a silent 15-second H.264 MP4 in `public/campaigns/visitorping-launch/`.
- Editable asset sources: `build-assets.py` and `render.mjs`. PNG source files for motion are included. The AI-generated notification graphic is illustrative; the second ad and video reuse the actual product logo. Existing interactive-preview screenshot uses example data.
- Production route source: `/home/ssari/projects/visitorping/apps/web/app/for-founders/page.tsx`. Reuses the site's existing marketing components and interactive demo. Does not change onboarding, billing, or the homepage. Not deployed.
- All campaign tags are copied to signup and pricing destinations by the new route. Existing site visitor tracking supports UTMs. There is no verified campaign-to-workspace-to-payment join yet; do not claim measured CAC from aggregate changes.

## Proposed first test (not approved or live)
Reddit paid social; US English; solo SaaS/website founders; eligible startup/SaaS/side-project community audiences. Community targeting can reach community members elsewhere on Reddit. Check actual eligible inventory in the account. Two messages, one audience. Proposed maximum total spend $100 over seven days. Never interpret an average daily budget as a hard total spending limit; use an account-supported total cap and verify it before enabling delivery. If no enforceable total cap is available, stop before launch and resolve the budget control.

Use the campaign JSON's exact UTM URLs after `/for-founders` is deployed and verified. The learning question is whether the notification benefit attracts people who install tracking and see their first visitor. Monitor actual spend, clicks, signups, installation and first-visitor events separately. Do not equate clicks, visitors or installation with payment. Stop at the approved cap. No success guarantee; no auto-renewal or budget increases.

## Execution blockers, verified September 10, 2026
- No Reddit advertising tool/account is connected in this session. Cannot create a platform campaign or publish on the owner's behalf yet.
- Existing Google Ads manager OAuth renewal returned HTTP 400 `invalid_grant`. A fresh account authorization is required before that integration can be used. No secrets are included in this package.
- No spending limit has been approved by the owner.
- Production landing route not deployed. Campaign must not point to it until published and checked.
- Campaign-level activation attribution must be verified before performance claims.

## QA
Browser/IAB tools were unavailable; used Playwright Chromium. Inspected desktop creative, mobile preview, video stages and product-example labels. Verified mobile width and preserved UTM query parameters. MP4 exported at 1080x1080, H.264/yuv420p, 30 fps, 15 seconds with faststart. Production TSX passes TypeScript and targeted ESLint; runtime verification of the deployed route remains pending. The static landing preview is a review artifact; it is not a screenshot of the un-deployed Next route.

## References
- Reddit community targeting: https://www.business.reddit.com/advertise/targeting/community-and-interest
- Reddit image formats: https://www.business.reddit.com/learning-hub/articles/reddit-image-ad-specs
- Reddit video formats: https://www.business.reddit.com/advertise/ad-types/video-ads

## Superseded by free launch
The owner selected a completely free first campaign, using existing X and Reddit accounts. The active manifest, review index and ZIP now contain the organic plan with a $0 spending cap. `organic-launch.md` is the current publishing brief; `build-organic.py` regenerates the active review after any shared asset build. Earlier paid-budget proposals above are archived, not authorized. No posts have been published; handles and authenticated publishing access remain pending.
