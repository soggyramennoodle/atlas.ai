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
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
