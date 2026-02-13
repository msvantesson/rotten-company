"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/app/logout/actions";

type Props = {
  email: string | null;
  isModerator: boolean;
};

type GateStatus = {
  pendingEvidence: number;
  requiredModerations: number;
  userModerations: number;
  allowed: boolean;
};

async function fetchGateStatus(): Promise<GateStatus | null> {
  try {
    const res = await fetch("/api/moderation/gate", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    return (await res.json()) as GateStatus;
  } catch {
    return null;
  }
}

export default function NavMenuClient({ email, isModerator }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [gate, setGate] = useState<GateStatus | null>(null);

  // Load moderation gate status once for signed‑in users
  useEffect(() => {
    if (!email) return;
    void fetchGateStatus().then(setGate);
  }, [email]);

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
  if (gate && isModerator) {
    if (!hasRequirement) {
      // No backlog at all
      moderationLine = "No pending cases – you’re all caught up.";
    } else if (moderated === 0) {
      // Hasn't helped yet; keep it neutral and inviting
      moderationLine = `You’ve moderated 0 of ${required} required items. Please help by reviewing a couple of cases.`;
    } else if (!hasMetRequirement) {
      // Started helping but not at requirement yet
      moderationLine = `You’ve moderated ${moderated} of ${required} required items – thank you, keep going.`;
    } else {
      // Requirement met or exceeded
      moderationLine = `You’ve moderated ${moderated} items – thank you for your help.`;
    }
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
        <div className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-white shadow-lg z-50 text-sm">
          <div className="px-3 py-2 border-b text-xs text-gray-500 break-all">
            Signed in as
            <br />
            <span className="font-medium text-gray-800">{email}</span>
          </div>

          {isModerator && moderationLine && (
            <div className="px-3 py-2 border-b text-xs text-gray-600 leading-snug">
              {moderationLine}
            </div>
          )}

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

          <form action={logout} onSubmit={() => setOpen(false)}>
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
