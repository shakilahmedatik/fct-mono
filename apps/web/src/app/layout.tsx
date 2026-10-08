import "./globals.css";
import { ArrowRight, Coffee } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "First Cup Tech — AI Executive Briefings for Tech Leaders",
  description:
    "Your daily 3-minute personalized audio briefing and concise tech intelligence synthesized before your first sip of coffee.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col selection:bg-emerald-500/20 selection:text-emerald-400">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
                <Coffee className="h-5 w-5" />
              </div>
              <span>
                First Cup <span className="text-emerald-500">Tech</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
              <Link href="/#features" className="hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Intelligence
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <a
                href="http://localhost:3001/login"
                className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Sign In
              </a>
              <a
                href="http://localhost:3001"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition-all"
              >
                <span>Console</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-border/40 bg-card py-12 text-sm text-muted-foreground">
          <div className="container mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-emerald-500" />
              <span>© {new Date().getFullYear()} First Cup Tech Inc. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Support
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
