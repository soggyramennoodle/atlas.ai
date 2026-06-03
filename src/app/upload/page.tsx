import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
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
    <>
      <SiteHeader />
      <main className="relative flex-1 px-4 pb-24 pt-32">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-aurora opacity-70" />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
            New lecture
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Press record.
            <br />
            We&apos;ll take the{" "}
            <span className="font-serif text-5xl font-normal italic text-primary sm:text-6xl">
              notes.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-pretty text-muted-foreground">
            Record the lecture right here in your browser and Atlas returns
            thorough, structured notes — saved straight to your library.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-2xl">
          <CapturePanel userId={user.id} />
        </div>
      </main>
    </>
  );
}
