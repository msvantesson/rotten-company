"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { canModerate } from "@/lib/moderation-guards";

export default function NavMenu() {
  const [user, setUser] = useState<any>(null);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        setIsModerator(await canModerate(data.user.id));
      }
    });
  }, []);

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

  return (
    <div className="flex gap-4 items-center">
      <span className="text-sm">{user.email}</span>

      {isModerator && (
        <Link href="/moderation" className="text-sm font-medium">
          Moderation
        </Link>
      )}

      <Link href="/logout" className="text-sm">
        Log out
      </Link>
    </div>
  );
}
