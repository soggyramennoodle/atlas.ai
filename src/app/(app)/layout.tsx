import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards these routes; defence in depth.
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppSidebar email={user.email ?? ""} />
      <div className="lg:pl-64">
        <div className="pt-16 lg:pt-0">{children}</div>
      </div>
    </div>
  );
}
