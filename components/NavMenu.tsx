"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { canModerate } from "@/lib/canModerate";

export default function NavMenu() {
  const [user, setUser] = useState<any>(null);
  const [isModerator, setIsModerator] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    // 1) Initial check on mount
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        setIsModerator(await canModerate(u.id));
      } else {
        setIsModerator(false);
      }
    });

    // 2) Subscribe to auth state changes (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setIsModerator(await canModerate(u.id));
      } else {
        setIsModerator(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Signed‑out state
  if (!user) {
    return (
      <div className="flex gap-4">
        <Link href="/signup" className="text-sm font-medium">
          Sign up
        </Link>
        <Link href="/login" className="text-sm font-medium">
          Log in
        </Link>
      </div>
    );
  }

  const email = user.email as string;

  // Signed‑in with dropdown
  return (
    <div className="relative flex items-center" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <span>{email}</span>
        <span className="text-xs">&#9662;</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-white shadow-lg z-50 text-sm">
          <div className="px-3 py-2 border-b text-xs text-gray-500 break-all">
            Signed in as
            <br />
            <span className="font-medium text-gray-800">{email}</span>
          </div>

          {isModerator && (
            <Link
              href="/moderation"
              className="block px-3 py-2 hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              Moderation
            </Link>
          )}

          <Link
            href="/logout"
            className="block px-3 py-2 text-red-600 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
            Log out
          </Link>
        </div>
      )}
    </div>
  );
}
