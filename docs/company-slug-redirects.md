# Company slug redirects and canonical slugs

## Production status

Already completed manually by the project owner:

- `public.company_slug_redirects` exists in the production Supabase database.
- The production table is currently empty.
- Copilot, GitHub, and GitHub Actions must **not** execute SQL against production.

This repository only adds reproducible schema support, application reads, tests, and deployment guidance. It does **not** migrate the 131 legacy company slugs or insert production redirect rows.

## What is canonical

- `companies.slug` is the canonical public company URL.
- Existing company pages, internal links, canonical metadata, Open Graph metadata, JSON-LD, and the sitemap must use the stored `companies.slug`.
- `lib/slugify.ts` is only for proposing a slug during new company creation or a future intentional slug change.

## Redirect table schema

Repository migration:

- `supabase/migrations/20260824000002_company_slug_redirects.sql`

The migration is idempotent and is intended for local, preview, and future environments. It must not be used by automation against production.

## PR deployment steps

1. Review the application changes and migration file.
2. Confirm that no production data-changing SQL is executed by Copilot, GitHub, or GitHub Actions.
3. Merge and deploy the redirect-support code.
4. Verify canonical company pages still return HTTP 200.
5. Verify unknown company pages now return a real HTTP 404.
6. Verify permanent redirect behavior with `/company/nestl` or with one manually added safe test redirect.
7. Confirm every redirect destination uses the company row's current stored `companies.slug`.

## Later manual migration steps

Only after the redirect-support deployment is verified:

1. Generate and review the explicit 131-company slug mapping.
2. Run a full-table collision check against both `companies.slug` and `company_slug_redirects.old_slug`.
3. Prepare transactional SQL that updates `companies.slug` and inserts matching historical redirects.
4. The project owner manually executes that SQL in the Supabase SQL Editor.
5. Run verification queries manually.
6. Revalidate affected company URLs, `/rotten-index`, `/`, relevant category and leadership pages, and `/sitemap.xml`.
7. Test representative old and new URLs before starting the next batch.

## Revalidation guidance after the later manual migration

When a canonical slug changes, revalidate:

- `/company/[old-slug]`
- `/company/[new-slug]`
- `/company/[new-slug]/breakdown`
- `/company/[new-slug]/evidence`
- `/rotten-index`
- `/`
- any affected category pages
- any affected leadership pages
- `/sitemap.xml`

The manual SQL migration must not be executed before this redirect-support PR is deployed.
