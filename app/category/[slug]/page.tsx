import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

export default async function CategoryDetail({
  params,
}: {
  params: { slug: string }
}) {
  const slug = params.slug.toLowerCase().trim()

  let category = null
  let errorMsg = null

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)

    if (error) {
      errorMsg = error.message
      console.error('Supabase error:', error.message)
    } else {
      category = data?.[0] ?? null
    }
  } catch (err: any) {
    errorMsg = err.message
    console.error('Unexpected error:', err)
  }

  return (
    <div style={{ padding: '2rem' }}>
      {category ? (
        <>
          <h1>{category.slug}</h1>
          <p>{category.description ?? 'No description available'}</p>
        </>
      ) : (
        <>
          <h1>Category not found</h1>
          {errorMsg && <p style={{ color: 'red' }}>Error: {errorMsg}</p>}
        </>
      )}
    </div>
  )
}
