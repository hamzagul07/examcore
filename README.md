This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Performance baselines

Measure scroll + Lighthouse scores on primary pages (requires a running app):

```bash
pnpm dev
# separate terminal:
pnpm add -D playwright lighthouse chrome-launcher
npx playwright install chromium
pnpm perf:baseline --base=http://localhost:3000 --tag=before
```

Reports are written to `perf-baseline/<tag>/*.json`. Re-run with `--tag=after` to compare.

Auth routes (`/dashboard`, `/mark`, `/account/*`) need a logged-in Playwright storage state — extend `scripts/perf-baseline.mjs` or use DevTools on a real device for ground-truth scroll feel.

Manual check: Chrome DevTools → Performance → record while scrolling at **375×667**, **6× CPU**, Slow 4G.
