"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { UiTour } from "@/components/onboarding/ui-tour";

export function AppShell({
  email,
  name,
  avatarR2Key,
  isAdmin,
  showUiTour,
  children,
}: {
  email: string;
  name?: string;
  avatarR2Key?: string | null;
  isAdmin?: boolean;
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
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <div className="lg:pl-64">
        <div className="pt-16 lg:pt-0">{children}</div>
      </div>
      <UiTour active={showUiTour} onMobileSidebarOpen={setMobileOpen} />
    </>
  );
}
