"use client";

import type * as React from "react";
import { AdminSidebar } from "./admin-sidebar";

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-10 max-w-6xl overflow-y-auto w-full">{children}</main>
    </div>
  );
}
