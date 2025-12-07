export default async function CategoryDetail({
  params,
}: {
  params?: { slug?: string }
}) {
  const slug = params?.slug ? params.slug.toLowerCase().trim() : null

  if (!slug) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Error: No slug provided</h1>
      </div>
    )
  }

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
