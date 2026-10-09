import "./globals.css";
import { Badge } from "@repo/ui";
import { Activity, ExternalLink, Radio, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "First Cup Admin — Command Center",
  description: "Platform operations, pipeline status, and user management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
        {/* Admin Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/40 bg-card/60 backdrop-blur-md p-6 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg mb-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
                <Shield className="h-5 w-5" />
              </div>
              <span>
                First Cup <span className="text-accent">Admin</span>
              </span>
            </div>

            <nav className="space-y-1.5 text-sm font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent/15 text-accent font-semibold"
              >
                <Activity className="h-4 w-4" />
                <span>Overview</span>
              </Link>
              <Link
                href="/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>Users & Roles</span>
              </Link>
              <Link
                href="/digests"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <Radio className="h-4 w-4" />
                <span>Pipeline Log</span>
              </Link>
            </nav>
          </div>

          <div className="pt-6 border-t border-border/40 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-muted-foreground">API Node: Online</span>
              </div>
              <Badge variant="outline">Bun 1.3</Badge>
            </div>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>User Console</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </aside>

        {/* Admin Main Content */}
        <main className="flex-1 p-6 md:p-10 max-w-6xl overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
