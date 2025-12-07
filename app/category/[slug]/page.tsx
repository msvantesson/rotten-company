import { supabase } from '@/lib/supabaseClient'

export default async function CategoryDetail({ params }: { params: { slug: string } }) {
  // Fetch category info
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, description')
    .eq('slug', params.slug)
    .single()

  // Fetch company rankings from the view
  const { data: rankings } = await supabase
    .from('category_company_rankings')
    .select('*')
    .eq('category_slug', params.slug)
    .order('rotten_score', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{category?.name}</h1>
      <p className="text-gray-600 mb-6">{category?.description}</p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Company</th>
            <th className="text-left p-2">Rotten Score</th>
            <th className="text-left p-2">Evidence Count</th>
          </tr>
        </thead>
        <tbody>
          {rankings?.map((row) => (
            <tr key={row.company_id} className="border-b">
              <td className="p-2">
                <a href={`/company/${row.company_slug}`} className="text-blue-600 hover:underline">
                  {row.company_name}
                </a>
              </td>
              <td className="p-2">{row.rotten_score}</td>
              <td className="p-2">{row.evidence_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

