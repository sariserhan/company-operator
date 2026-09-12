I built VisitorPing for website owners who want to notice a visit as it happens: a live dashboard on the web, with an iPhone companion for notifications.

[Try the interactive doorbell demo — no signup needed](https://visitorping.com/demo?utm_source=github&utm_medium=showcase_shadcn_ui&utm_campaign=first_100_visitors&utm_content=shadcn_ui)

The web app uses shadcn/ui's base-nova style, Base UI, React 19 and Next.js 16. The demo combines Card, Badge and Button components around three sample visits. Clicking “Test this visit” adds a row to the feed, shows an alert and plays a chime; sound can be switched off.

One UI choice I'd appreciate feedback on: an ordinary visit and a visit matching a pricing-page rule share the same feed, with an extra badge for the latter. Is that distinction clear enough at a glance, or does the alert need a stronger visual difference?

The demo uses labeled simulated data, not actual customer activity. VisitorPing is a commercial service with a 14-day trial; the interactive demo itself is free.
