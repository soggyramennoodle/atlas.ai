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
      <div className="relative mx-auto max-w-2xl text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#0d0d0d]/45">
          New lecture
        </p>
        <h1 className="mt-4 text-balance text-4xl font-normal leading-[1.02] tracking-[-0.02em] sm:text-5xl">
          Press record.
          <br />
          We&apos;ll take the{" "}
          <span className="font-instrument italic">notes.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-pretty text-[#0d0d0d]/60">
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
