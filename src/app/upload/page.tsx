import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Uploader } from "@/components/upload/uploader";

export const metadata: Metadata = { title: "Upload a lecture" };

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
      <main className="flex-1 px-4 pb-20 pt-32">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Upload a{" "}
            <span className="font-serif font-normal italic text-primary">
              lecture
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
            Drop in a recording and Atlas will return thorough, structured notes
            — saved straight to your library.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <Uploader userId={user.id} />
        </div>
      </main>
    </>
  );
}
