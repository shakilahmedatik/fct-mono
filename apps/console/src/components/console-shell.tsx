"use client";

import { usePathname } from "next/navigation";
import type * as React from "react";
import { ConsoleSidebar } from "./console-sidebar";

export interface ConsoleShellProps {
  children: React.ReactNode;
}

export function ConsoleShell({ children }: ConsoleShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname?.startsWith("/login");

  if (isAuthRoute) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row w-full">
      <ConsoleSidebar />
      <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">{children}</main>
    </div>
  );
}
