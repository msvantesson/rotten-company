"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function NavMenu({
  user,
}: {
  user: { email?: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 border rounded text-sm"
      >
        {user?.email ?? "Account"}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow">
          <Link
            href="/submit-evidence"
            className="block px-4 py-2 hover:bg-gray-50"
          >
            Submit evidence
          </Link>

          <Link
            href="/my-evidence"
            className="block px-4 py-2 hover:bg-gray-50"
          >
            My evidence
          </Link>

          <div className="border-t my-1" />

          <Link
            href="/logout"
            className="block px-4 py-2 hover:bg-gray-50"
          >
            Log out
          </Link>
        </div>
      )}
    </div>
  );
}
