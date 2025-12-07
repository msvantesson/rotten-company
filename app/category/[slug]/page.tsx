// app/category/[slug]/page.tsx
export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

export default async function CategoryDetail({
  params,
}: {
  params: { slug?: string }
}) {
  // Debug: always log incoming params (check Vercel logs or local terminal)
  console.log('Route params:', params)

  // Normalize and guard the slug
  const slug = (params?.slug ?? '').toString().toLowerCase().trim()

  if (!slug) {
    console.warn('No slug provided in params; returning debug output.')
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Debug Route Params</h1>
        <pre>{JSON.stringify(params, null, 2)}</pre>
        <p>
          No slug found. Ensure the file path is <code>app/category/[slug]/page.tsx</code>,
          there is no <code>app/category/page.tsx</code> shadowing this route, and the App Router is active.
        </p>
      </div>
    )
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
    }

    const category = data?.[0] ?? null

    return (
      <div style={{ padding: '2rem' }}>
        {category ? (
          <>
            <h1>{category.slug}</h1>
            <p>{category.description ?? 'No description available'}</p>
          </>
        ) : (
          <h1>Category not found</h1>
        )}
      </div>
    )
  } catch (err) {
    console.error('Unexpected error fetching category:', err)
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Error</h1>
        <p>There was an unexpected error fetching the category. Check server logs for details.</p>
      </div>
    )
  }
}
