# Takeover demo video

15-second original typographic animation. Examples are labeled throughout; no
production takeovers, testimonials, visitor counts or prize claims are depicted.

Artifact: `../assets/takeover-demo.mp4` (960×1200, 24 fps, H.264/yuv420p, silent).

Regenerate with Node, sharp, an installed DejaVu Sans font, and FFmpeg with libx264:

```sh
SHARP_PACKAGE=/absolute/path/to/sharp FFMPEG=/absolute/path/to/ffmpeg \
  node render-demo.mjs /tmp/ttw-video/takeover-demo.mp4
```

The render writes four preview PNGs alongside the output. Opening, replacement and
closing frames were visually inspected; all 360 encoded frames decoded successfully.
The animation replaces example A with example B at 5.3 seconds. CTA starts at 11.8s.

Caption:

> I built a website with one spot. The next takeover replaces whoever is there.
>
> What would you put on it?
>
> https://takethewall.com/?utm_source=x&utm_medium=organic_social&utm_campaign=wall_demo&utm_content=takeover_video

Distribution is through the connected @serhansarii account in Buffer. See
`../video-publication.json` for publication status. No money spent.
