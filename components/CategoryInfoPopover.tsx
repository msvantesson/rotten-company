"use client";

import { useState, useRef, useEffect } from "react";
import { getCategoryHelp } from "@/lib/category-help";

type CategoryInfoPopoverProps = {
  categoryName: string;
  categorySlug: string;
  description: string | null;
};

export default function CategoryInfoPopover({
  categoryName,
  categorySlug,
  description,
}: CategoryInfoPopoverProps) {
  const help = getCategoryHelp(categorySlug);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  function handleClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`What is ${categoryName}?`}
        onClick={() => setOpen(true)}
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 rounded-full text-sm leading-none"
      >
        ⓘ
      </button>

      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-info-title"
        onClick={handleBackdropClick}
        onClose={handleClose}
        className="rounded-lg p-6 shadow-xl max-w-sm w-full backdrop:bg-black/40 open:flex open:flex-col open:gap-3"
      >
        <h3
          id="cat-info-title"
          className="text-base font-semibold text-gray-900"
        >
          {categoryName}
        </h3>

        {help ? (
          <>
            <p className="text-sm text-gray-700">{help.definition}</p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Examples:</span> {help.examples}
            </p>
          </>
        ) : description ? (
          <p className="text-sm text-gray-700">{description}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">No description available.</p>
        )}

        <a
          href={`/category/${categorySlug}`}
          className="text-sm text-blue-700 hover:underline"
        >
          View full category page →
        </a>

        <button
          type="button"
          onClick={handleClose}
          className="mt-1 self-end text-sm text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          Close
        </button>
      </dialog>
    </>
  );
}
