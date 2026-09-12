I built VisitorPing's website with Tailwind: a live visitor dashboard with iPhone alerts, plus a public demo that lets you send sample visits without signing up.

A small mobile bug from the homepage may be useful to anyone building animated product previews. A decorative phone-notification card started at `opacity-0` but remained absolutely positioned above the “Simulate a visitor” button. It looked invisible; it still intercepted taps.

The fix had two parts:

- The decorative notification uses `pointer-events-none`, since that particular preview has no interactive controls.
- On small screens it stays in normal document flow with `relative`, `ml-auto`, and `mt-4`. The overlapping layout only switches on at `sm:` with absolute positioning.

That also gives the notification room to appear below the button on a narrow phone. Opacity handles the visual transition; it isn't being used as a substitute for hiding an interactive element or managing keyboard focus.

I verified the button and the resulting preview at 320px, 390px, and desktop widths. This isn't a Tailwind bug—it's a layering mistake that a static screenshot missed and a real click test caught.

[See the homepage example](https://visitorping.com/?utm_source=github&utm_medium=showcase_tailwind&utm_campaign=first_100_visitors&utm_content=tailwind_mobile) or [try the dedicated sample-visitor demo](https://visitorping.com/demo?utm_source=github&utm_medium=showcase_tailwind&utm_campaign=first_100_visitors&utm_content=tailwind_mobile).

VisitorPing is my commercial product, with a private repository and a 14-day Starter trial; paid plans start at $19/month. Both public previews use simulated visits. No account is needed to try them.
