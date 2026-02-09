export default function MyEvidencePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <pre style={{ padding: 24 }}>
{JSON.stringify(
  {
    id: params.id,
  },
  null,
  2
)}
    </pre>
  );
}
