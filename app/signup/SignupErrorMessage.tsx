"use client";

import { useEffect } from "react";

export default function SignupErrorMessage({ message }: { message: string }) {
  useEffect(() => {
    document.cookie = "signup_error=; Max-Age=0; path=/signup; SameSite=Lax";
  }, []);

  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 mb-4">
      {message}
    </div>
  );
}
