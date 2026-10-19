# saipranav-portfolio

Source for [saipranav.me](https://saipranav.me) — personal portfolio site.

Content (projects, experience, achievements, hackathons) lives in `content.json` and is
pre-rendered at build time with `linkedom` so crawlers see full content without running JS,
then hydrated client-side (`render.js`, `fx.js`, `terminal.js`). Styled with Tailwind.

## Dev

```bash
npm install
npm run dev     # builds and serves dist/
```

## Build

```bash
npm run build    # outputs to dist/
```

Deployed on Vercel.
