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

## Production Deployment

This project deploys to [Vercel](https://vercel.com). The build configuration is committed in [`vercel.json`](./vercel.json) so there is no divergence between what Vercel's UI shows and what the repository specifies.

### How auto-deploy works

Every push (or merge) to `main` automatically triggers a new **Production** deployment on Vercel via GitHub integration. You can monitor deployments at:

```
https://vercel.com/dashboard → rotten-company → Deployments
```

Filter by **Production** and look for the commit SHA from your merge to confirm the deployment was created and reached **Ready** status.

### If a production deploy does not appear after a merge

The Vercel UI **"Redeploy"** button rebuilds from an existing deployment's snapshot — it does **not** pull fresh code from `main`. Use one of these instead to trigger a genuine new production build from the latest `main`:

1. **Vercel CLI** (recommended):
   ```bash
   npx vercel --prod
   ```
2. **Push an empty commit** to force a new build event:
   ```bash
   git commit --allow-empty -m "chore: trigger production redeploy"
   git push origin main
   ```
3. **Vercel dashboard → Git → Disconnect and reconnect** the GitHub repo if the webhook stops delivering events.

### Build settings (version-controlled)

| Setting          | Value        |
|------------------|--------------|
| Framework        | Next.js      |
| Build command    | `npm run build` |
| Install command  | `npm install` |
| Dev command      | `npm run dev` |
| Root directory   | `./`         |
| Production branch | `main`      |

These values are committed in `vercel.json` and take precedence over any overrides set in the Vercel project UI.
