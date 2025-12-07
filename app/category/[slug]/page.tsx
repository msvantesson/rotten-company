export default async function CategoryDetail({ params }: { params: { slug: string } }) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)

  return (
    <div>
      <h1>{data?.[0]?.slug ?? 'Category not found'}</h1>
      <p>{data?.[0]?.description ?? 'No description available'}</p>
      <ul>
        {/* maybe some list */}
      </ul>
    </div>
  )
