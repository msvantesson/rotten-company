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
  console.log('Route params:', params) // Debug log

  const slug = params.slug.toLowerCase().trim()

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
}
