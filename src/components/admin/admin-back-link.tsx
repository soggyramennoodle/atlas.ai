"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function AdminBackLink({
  fallbackHref = "/admin",
  label = "Back",
}: {
  fallbackHref?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className="inline-flex items-center gap-1.5 rounded-full text-sm text-[#0d0d0d]/55 outline-none transition hover:-translate-x-0.5 hover:text-[#0d0d0d] focus-visible:ring-2 focus-visible:ring-black/25"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
