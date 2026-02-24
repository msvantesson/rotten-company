"use client";

import { useFormStatus } from "react-dom";

type Props = {
  idleText: string;
  pendingText?: string;
  className?: string;
};

export default function FormSubmitButton({
  idleText,
  pendingText = "Working…",
  className,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={[
        className ?? "",
        pending ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {pending ? pendingText : idleText}
    </button>
  );
}
