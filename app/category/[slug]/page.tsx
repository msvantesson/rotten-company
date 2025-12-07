export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'

// Force Next.js to treat this route as dynamic
export const dynamic = 'force-dynamic'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

export default async function CategoryDetail({
  params,
}: {
  params: { slug: string }
}) {
  console.log('Route params:', params)
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log(
    'Supabase Key:',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 6) + '...'
  )

  const slug = params?.slug?.toLowerCase().trim()

  // Query Supabase
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)

  if (error) {
    console.error('Supabase error:', error.message)
  }

  const category = data?.[0]

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Debug + Data Page</h1>

      <h2>Debug Info</h2>
      <pre>{JSON.stringify(params, null, 2)}</pre>
      <p>Slug: {slug ?? 'undefined'}</p>
      <p>
        Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'undefined'}
      </p>
      <p>
        Supabase Key:{' '}
        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 6) + '...'
          : 'undefined'}
      </p>

      <h2>Query Result</h2>
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      {category ? (
        <>
          <h3>{category.slug}</h3>
          <p>{category.description ?? 'No description available'}</p>
        </>
      ) : (
        <p>No category found for slug "{slug}"</p>
      )}
    </div>
  )
}
