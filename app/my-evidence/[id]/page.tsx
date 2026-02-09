export default function MyEvidencePage({
  params,
}: {
  params: Record<string, string>;
}) {
  return (
    <pre style={{ padding: 24 }}>
{JSON.stringify(params, null, 2)}
    </pre>
  );
}
