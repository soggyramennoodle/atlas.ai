import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminHeader } from "@/components/admin/admin-kit";
import { SignatureGenerator } from "@/components/admin/signature-generator";
import { getNewsroomAdmin } from "@/lib/newsroom-server";

export const metadata: Metadata = { title: "Email signature" };
export const dynamic = "force-dynamic";

export default async function AdminSignaturePage() {
  const admin = await getNewsroomAdmin();
  if (!admin) notFound();

  return (
    <main className="px-4 pb-24 pt-8 lg:px-8 lg:pt-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <AdminBackLink fallbackHref="/admin" label="Admin" />
        <AdminHeader
          icon={Mail}
          title={
            <>
              Email <span className="font-instrument italic">signature</span>
            </>
          }
          description="Generate a consistent, on-brand Atlas signature. Fill in your details, then copy it straight into your mail client."
        />

        <SignatureGenerator />
      </div>
    </main>
  );
}
