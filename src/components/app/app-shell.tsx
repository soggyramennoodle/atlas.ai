"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { UiTour } from "@/components/onboarding/ui-tour";

export function AppShell({
  email,
  name,
  avatarR2Key,
  isAdmin,
  adminUnreadReports = 0,
  showUiTour,
  children,
}: {
  email: string;
  name?: string;
  avatarR2Key?: string | null;
  isAdmin?: boolean;
  adminUnreadReports?: number;
  showUiTour: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <AppSidebar
        email={email}
        name={name}
        avatarR2Key={avatarR2Key}
        isAdmin={isAdmin}
        adminUnreadReports={adminUnreadReports}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      {/* Offset for the floating glass rail (left-3 + w-60 + breathing room). */}
      <div className="lg:pl-[16.5rem]">
        <div className="pt-16 lg:pt-0">{children}</div>
      </div>
      <UiTour active={showUiTour} onMobileSidebarOpen={setMobileOpen} />
    </>
  );
}
