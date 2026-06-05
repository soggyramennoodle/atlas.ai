import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CapturePanel } from "@/components/upload/capture-panel";

export const metadata: Metadata = { title: "Record a lecture" };

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guards this route; this is defence in depth.
  if (!user) redirect("/login?next=/upload");

  return (
    <main className="relative px-4 pb-24 pt-10 lg:pt-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-aurora opacity-40" />
      <div className="relative mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          New lecture
        </p>
        <h1 className="mt-4 text-balance font-display text-5xl font-extrabold leading-[0.9] tracking-[-0.03em] sm:text-6xl">
          Press record.
          <br />
          We&apos;ll take the{" "}
          <span className="text-gradient-brand">notes.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-pretty text-muted-foreground">
          Record the lecture right here in your browser and Atlas returns
          thorough, structured notes, saved straight to your library.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-5xl">
        <CapturePanel userId={user.id} />
      </div>
    </main>
  );
}
