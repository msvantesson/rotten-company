export default async function CategoryDetail({
  params,
}: {
  params: { slug?: string }
}) {
  // Debug logs will show up in Vercel function logs
  console.log('Route params:', params)
  console.log('Slug value:', params?.slug)
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log(
    'Supabase Key:',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 6) + '...'
  )

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Debug Page</h1>
      <pre>{JSON.stringify(params, null, 2)}</pre>
      <p>
        Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'undefined'}
      </p>
      <p>
        Supabase Key:{' '}
        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 6) + '...'
          : 'undefined'}
      </p>
    </div>
  )
}
