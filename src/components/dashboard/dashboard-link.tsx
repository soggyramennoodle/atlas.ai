"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { markDashboardStale } from "@/lib/dashboard-cache";

type DashboardLinkProps = ComponentProps<typeof Link> & {
  /** When true, dashboard revalidates in the background after navigation. */
  refresh?: boolean;
};

export function DashboardLink({ refresh, onClick, ...props }: DashboardLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (refresh) markDashboardStale();
        onClick?.(event);
      }}
    />
  );
}
