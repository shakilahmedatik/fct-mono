"use client";

import { usePathname } from "next/navigation";
import type * as React from "react";
import { AdminSidebar } from "./admin-sidebar";

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname?.startsWith("/login");

  if (isAuthRoute) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-10 max-w-6xl overflow-y-auto w-full">{children}</main>
    </div>
  );
}
