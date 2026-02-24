"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/logout/actions";

type ModerationGateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

async function fetchGateStatus(): Promise<ModerationGateStatus | null> {
  try {
    const res = await fetch("/api/moderation/gate-status", {
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as ModerationGateStatus;
  } catch {
    return null;
  }
}

export default function NavMenuClient({
  email,
  isLoggedIn,
  moderationHref,
}: {
  email: string | null;
  isLoggedIn: boolean;
  moderationHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState<ModerationGateStatus | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!email || !isLoggedIn) {
      setGate(null);
      return;
    }

    void fetchGateStatus().then(setGate);
  }, [email, pathname, isLoggedIn]);

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

  const moderated = gate?.userModerations ?? 0;
  const required = gate?.requiredModerations ?? 0;
  const hasRequirement = required > 0;
  const hasMetRequirement = gate?.allowed ?? false;

  let moderationLine: string | null = null;
  if (gate && isLoggedIn) {
    if (!hasRequirement) {
      moderationLine = "No pending cases – you’re all caught up.";
    } else if (moderated === 0) {
      moderationLine = `You’ve moderated 0 of ${required} required items. Please help by reviewing a couple of cases.`;
    } else if (!hasMetRequirement) {
      moderationLine = `You’ve moderated ${moderated} of ${required} required items – thank you, keep going.`;
    } else {
      moderationLine = `You’ve moderated ${moderated} items – thank you for your help.`;
    }
  }

  return (
    <div className="sm:relative flex items-center min-w-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium hover:underline min-w-0"
      >
        <span className="truncate">{email}</span>
        <span className="text-xs shrink-0">&#9662;</span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 mx-2 sm:left-auto sm:right-0 sm:mx-0 sm:w-56 rounded-md border border-gray-200 bg-white text-gray-900 shadow-lg z-50 text-base sm:text-sm max-h-[70vh] overflow-auto dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700">
          <div className="px-3 py-3 sm:py-2 border-b border-gray-200 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-700 break-all">
            Signed in as
            <br />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {email}
            </span>
          </div>

          {isLoggedIn && moderationLine && (
            <div className="px-3 py-3 sm:py-2 border-b border-gray-200 text-xs text-gray-600 dark:text-gray-300 dark:border-gray-700 leading-snug">
              {moderationLine}
            </div>
          )}

          {isLoggedIn && (
            <>
              <Link
                href={moderationHref}
                className="block px-3 py-3 sm:py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpen(false)}
              >
                Moderation
              </Link>

              <Link
                href="/moderation"
                className="block px-3 py-3 sm:py-2 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpen(false)}
              >
                Evidence queue
              </Link>
            </>
          )}

          <form action={logout} onSubmit={() => setOpen(false)}>
            <button
              type="submit"
              className="w-full text-left block px-3 py-3 sm:py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
