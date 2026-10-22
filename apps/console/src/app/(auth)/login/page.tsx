"use client";

import { authClient } from "@repo/api-client";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ThemeToggle,
} from "@repo/ui";
import { ArrowLeft, Coffee } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { webUrl } from "../../../lib/config";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name.trim(),
        });
        if (res.error) {
          setErrorMsg(res.error.message || "Failed to create account.");
          setIsLoading(false);
          return;
        }
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        });
        if (res.error) {
          setErrorMsg(res.error.message || "Invalid credentials.");
          setIsLoading(false);
          return;
        }
      }

      router.push("/dashboard");
    } catch {
      setErrorMsg("An unexpected connection error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-foreground relative selection:bg-accent/20 selection:text-accent">
      {/* Top Bar Utilities */}
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

      {/* Centered Authentication Card */}
      <Card className="w-full max-w-md border-border shadow-xl backdrop-blur-md bg-card">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
              <Coffee className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isRegister ? "Create Your Account" : "Sign In to First Cup"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1.5">
            {isRegister
              ? "Start your 14-day trial of executive intelligence briefs."
              : "Access your personalized executive tech intelligence console."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-name" required>
                  Full Name
                </Label>
                <Input
                  id="auth-name"
                  name="name"
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="auth-email" required>
                Email
              </Label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                placeholder="alex@techcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password" required>
                  Password
                </Label>
                {!isRegister && (
                  <span className="text-xs text-muted-foreground">Min 8 characters</span>
                )}
              </div>
              <Input
                id="auth-password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
            </div>

            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              className="w-full font-semibold shadow-sm mt-2 cursor-pointer"
            >
              {isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs text-accent hover:underline font-medium cursor-pointer transition-colors"
          >
            {isRegister
              ? "Already have an account? Sign in instead"
              : "Need an account? Start 14-day trial"}
          </button>
          <p className="text-[11px] text-center text-muted-foreground">
            By continuing, you agree to First Cup&apos;s Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
