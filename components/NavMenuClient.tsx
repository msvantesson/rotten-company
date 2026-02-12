"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/app/logout/actions";

type Props = {
  email: string | null;
  isModerator: boolean;
};

export default function NavMenuClient({ email, isModerator }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  if (!email) {
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
            <>
              <Link
                href="/moderation"
                className="block px-3 py-2 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                Moderation
              </Link>

              <Link
                href="/moderation/company-requests"
                className="block px-3 py-2 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                Company requests
              </Link>
            </>
          )}

          <form
            action={logout}
            onSubmit={() => setOpen(false)}
          >
            <button
              type="submit"
              className="w-full text-left block px-3 py-2 text-red-600 hover:bg-gray-100"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
