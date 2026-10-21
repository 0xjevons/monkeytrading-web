# monkeytrading-web

This is the website for [monkeytrading](https://github.com/0xjevons/monkeytrading), an open-source
engine for trading contracts for difference against a house whose rules are public code. It is a
single, statically rendered page. A simulated index shows three venues combining into a median price,
a simulated public log scrolls past with its running hashes, and a replay demo recomputes keccak-256
state roots in your browser and shows where a tampered log stops matching. The page also sets out the
house rules and the project's pre-launch status.

Everything runs in the visitor's browser. The site has no backend, no analytics, no cookies, and no
third-party scripts, and its fonts are bundled at build time.

## Running it locally

You need Node.js 24, the version in `.nvmrc`, and npm.

```bash
npm ci
npm run dev
```

The development server listens on `http://localhost:3000`. To check a change the way CI does, run
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and
`npm audit --audit-level=high`, and, with Python 3, `python3 scripts/check-docs.py`; `npm start`
then serves the production build.

## Deployment

The site deploys on Vercel as a standard Next.js project, on the Node.js 24 that `package.json`
declares, and needs no environment variables. The canonical address used in page metadata, the
sitemap, and `robots.txt` defaults to the Vercel project's production domain; set `SITE_URL` to
another bare origin, such as `https://example.com`, to override it, and the build fails on anything
else. The waitlist link is `TELEGRAM_URL` in [`src/lib/site.ts`](src/lib/site.ts).

## License

Licensed under the Apache License, Version 2.0; see `LICENSE`.
