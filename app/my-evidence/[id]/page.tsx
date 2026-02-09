import { headers } from "next/headers";

export default function MyEvidenceDebugPage({
  params,
}: {
  params: { id?: string };
}) {
  const h = headers();

  console.log("🔥🔥🔥 HIT app/my-evidence/[id]/page.tsx");
  console.log("🧩 params:", params);
  console.log("🌐 x-pathname:", h.get("x-pathname"));
  console.log("🌐 x-url:", h.get("x-url"));
  console.log("🌐 referer:", h.get("referer"));

  return (
    <pre style={{ padding: 24, fontSize: 14 }}>
{JSON.stringify(
  {
    file: "app/my-evidence/[id]/page.tsx",
    params,
    headers: {
      "x-pathname": h.get("x-pathname"),
      "x-url": h.get("x-url"),
      referer: h.get("referer"),
    },
  },
  null,
  2
)}
    </pre>
  );
}
