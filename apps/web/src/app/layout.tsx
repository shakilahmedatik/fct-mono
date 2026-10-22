import "./globals.css";
import { ThemeProvider, ThemeScript } from "@repo/ui";
import type { Metadata } from "next";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const metadata: Metadata = {
  title: "First Cup Tech — AI Executive Briefings for Tech Leaders",
  description:
    "Your daily 3-minute personalized audio briefing and concise tech intelligence synthesized before your first sip of coffee.",
};

/**
 * RootLayout for First Cup Tech marketing web application.
 * Shell integrates SiteHeader (with brand "First Cup", navigation routes including Pricing, Contact, and Console /login link)
 * and SiteFooter.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme="system" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col selection:bg-accent/20 selection:text-accent">
        <ThemeProvider defaultTheme="system">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
