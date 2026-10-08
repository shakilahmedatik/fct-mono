import "./globals.css";
import { Badge } from "@repo/ui";
import { Coffee, CreditCard, ExternalLink, LayoutDashboard, Sliders } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "First Cup Console — Executive Dashboard",
  description: "Personalized intelligence feed, audio briefings, and preferences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/40 bg-card/50 backdrop-blur-md p-6 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg mb-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
                <Coffee className="h-5 w-5" />
              </div>
              <span>
                First Cup <span className="text-emerald-500">Console</span>
              </span>
            </div>

            <nav className="space-y-1.5 text-sm font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Today&apos;s Digest</span>
              </Link>
              <Link
                href="/preferences"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <Sliders className="h-4 w-4" />
                <span>Preferences</span>
              </Link>
              <Link
                href="/billing"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                <span>Subscription</span>
              </Link>
            </nav>
          </div>

          <div className="pt-6 border-t border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                  SC
                </div>
                <div className="text-xs">
                  <div className="font-semibold">Shakil Ahmed</div>
                  <div className="text-muted-foreground">Pro Member</div>
                </div>
              </div>
              <Badge variant="success">PRO</Badge>
            </div>

            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Marketing Site</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
