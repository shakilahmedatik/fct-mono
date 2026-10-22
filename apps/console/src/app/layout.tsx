import "./globals.css";
import { ThemeProvider, ThemeScript } from "@repo/ui";
import type { Metadata } from "next";
import { ConsoleShell } from "../components/console-shell";

export const metadata: Metadata = {
  title: "First Cup Console — Executive Dashboard",
  description: "Personalized intelligence feed, audio briefings, and preferences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme="system" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
        <ThemeProvider defaultTheme="system">
          <ConsoleShell>{children}</ConsoleShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
