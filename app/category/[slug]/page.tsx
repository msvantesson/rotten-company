export default function CategoryDetail({ params }: { params: { slug: string } }) {
  return (
    <div>
      <h1>Category: {params.slug}</h1>
      <p>This is a test page for dynamic routing.</p>
    </div>
  )
}
