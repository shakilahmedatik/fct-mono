"use client";

import { authClient } from "@repo/api-client";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";
import { Coffee, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || "Engineering Lead",
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
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md p-8 border-border/80 bg-card">
        <CardHeader className="p-0 pb-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/20 shadow-xs">
              <Coffee className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isRegister ? "Create Your Account" : "Sign In to First Cup"}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Access your personalized executive tech intelligence console.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-lg bg-destructive/15 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                {errorMsg}
              </div>
            )}

            {isRegister && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="text-xs font-semibold uppercase text-muted-foreground"
                >
                  Full Name
                </label>
                <Input
                  id="auth-name"
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="text-xs font-semibold uppercase text-muted-foreground"
              >
                Email
              </label>
              <Input
                id="auth-email"
                type="email"
                placeholder="alex@techcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="text-xs font-semibold uppercase text-muted-foreground"
              >
                Password
              </label>
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <Button variant="primary" type="submit" disabled={isLoading} className="w-full gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isRegister ? "Create Account" : "Sign In"}</span>
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setErrorMsg(null);
                }}
                className="text-xs text-accent hover:underline font-medium cursor-pointer"
              >
                {isRegister
                  ? "Already have an account? Sign in instead"
                  : "Need an account? Start 14-day trial"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
