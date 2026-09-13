I built **Take The Wall**, a small Next.js project with Tailwind in the stylesheet setup and custom CSS for the wall and preview. There is one public page and one featured owner; the next takeover replaces the previous content.

The UI problem I wanted to share is the preview. It lives inside a dialog, so the browser viewport is not the same thing as the space available to the preview. The current layout uses `container-type: inline-size` on the preview frame and `cqw` inside clamped heading sizes. The mobile preview is capped at 320px; the desktop option uses the available width. These are native CSS rules alongside Tailwind, not a Tailwind plugin.

The preview is deliberately separate from activation: changing the draft or switching its layout does not reserve the wall. I want someone to understand that before checkout.

![Actual Take The Wall preview with example content; no purchase shown](https://raw.githubusercontent.com/sariserhan/company-operator/main/marketing/takethewall/assets/current-wall-preview.png)

[Open the live preview](https://takethewall.com/?take=1&utm_source=github&utm_medium=community&utm_campaign=preview_design&utm_content=tailwind_showcase)

Would you understand the desktop/mobile comparison on a narrow phone, or would you present the preview differently?

Updated September 13: browsing and designing a preview are free. Paid checkout is now $4.99 plus applicable tax. A separate free email-entry route is explained in the [Reward Rules](https://takethewall.com/?info=rewards). No guaranteed duration or audience. The image shows example preview content, not a customer purchase.
