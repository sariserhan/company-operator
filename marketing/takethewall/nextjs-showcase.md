I built **Take The Wall**: one public homepage with one owner. A project, message, app, or profile occupies the wall until the next takeover replaces it.

**[See who owns the wall →](https://takethewall.com/?utm_source=github&utm_medium=showcase&utm_campaign=wall_100&utm_content=nextjs)**

The first configured milestone is takeover **#100**, with a **$100 reward for its eligible owner**. Claim review and the published reward rules apply; this is not a promise of earnings for everyone who participates.

The app uses Next.js App Router and Convex. An interesting implementation detail is deciding who owns a single shared page when two checkouts finish close together: the browser's success redirect does not assign ownership. A verified Stripe webhook calls an internal Convex mutation, which deduplicates payment events and activates the takeover atomically. Activation order determines the sequence, rather than whoever opened checkout first.

[Source code](https://github.com/sariserhan/takethewall) · [Webhook route](https://github.com/sariserhan/takethewall/blob/main/app/api/webhook/route.ts) · [Activation mutation](https://github.com/sariserhan/takethewall/blob/main/convex/purchases.ts)

What would you put on a page that somebody else can take over next? I'd also welcome feedback on whether the first screen makes that rule obvious.
