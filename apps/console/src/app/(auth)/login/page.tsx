import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";
import { Coffee } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <CardHeader className="p-0 pb-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm">
              <Coffee className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Sign In to First Cup</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Access your personalized executive tech intelligence console.
          </p>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Email
            </label>
            <Input id="auth-email" type="email" placeholder="you@company.com" className="mt-1" />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Password
            </label>
            <Input id="auth-password" type="password" placeholder="••••••••" className="mt-1" />
          </div>
          <Button variant="primary" className="w-full">
            Sign In
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href="http://localhost:3000" className="text-emerald-400 hover:underline">
              Start 14-day trial
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
