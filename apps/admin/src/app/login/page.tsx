"use client";

import { authClient } from "@repo/api-client";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ThemeToggle,
} from "@repo/ui";
import { ArrowLeft, LogIn, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { webUrl } from "../../lib/config";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // `authClient` talks to the API's Better Auth handler at `/api/auth`.
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setErrorMsg(res.error.message || "Invalid credentials.");
        setIsLoading(false);
        return;
      }

      // Read the callback from the URL directly: `useSearchParams()` would
      // require a Suspense boundary for the statically prerendered route.
      const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
      router.push(callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard");
    } catch {
      setErrorMsg("An unexpected connection error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-foreground relative selection:bg-accent/20 selection:text-accent">
      <div className="absolute top-4 sm:top-8 left-4 sm:left-8">
        <a
          href={webUrl("/")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to First Cup</span>
        </a>
      </div>
      <div className="absolute top-4 sm:top-8 right-4 sm:right-8">
        <ThemeToggle variant="dropdown" />
      </div>

      <Card className="w-full max-w-md border-border shadow-xl backdrop-blur-md bg-card">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Sign In to Admin</CardTitle>
          <CardDescription className="text-xs mt-1.5">
            Platform operations are restricted to authenticated administrators.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive" className="py-2.5 text-xs" role="alert">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="admin-email" required>
                Email
              </Label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                placeholder="admin@firstcup.tech"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" required>
                Password
              </Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full gap-2 cursor-pointer"
              isLoading={isLoading}
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Sessions are issued by the First Cup API.{" "}
              <Link href={webUrl("/")} className="underline underline-offset-2">
                Back to the marketing site
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
