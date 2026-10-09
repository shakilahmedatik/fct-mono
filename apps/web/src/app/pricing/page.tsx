import { Badge, Button, Card, CardContent, CardHeader } from "@repo/ui";
import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="container mx-auto max-w-5xl py-20 px-4 sm:px-6">
      <div className="text-center max-w-xl mx-auto mb-16">
        <Badge variant="outline" className="mb-4">
          Transparent Pricing
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Invest in High-Signal Tech Intelligence
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Start with a 14-day Pro trial. Cancel anytime with a single click.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="p-8 border-border/60">
          <CardHeader className="p-0 pb-6">
            <h3 className="text-xl font-bold">Community</h3>
            <p className="text-xs text-muted-foreground mt-1">Weekly condensed summaries</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-muted-foreground text-xs">/ forever</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Weekly email intelligence newsletter
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Web dashboard access
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Generic tech topics
              </li>
            </ul>
            <div className="pt-6">
              <a href="http://localhost:3001">
                <Button variant="outline" className="w-full">
                  Get Started
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="p-8 border-accent/40 bg-card relative shadow-xl">
          <Badge variant="success" className="absolute -top-3 right-6">
            Most Popular
          </Badge>
          <CardHeader className="p-0 pb-6">
            <h3 className="text-xl font-bold text-foreground">Executive Pro</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Daily personalized voice & text briefing
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-foreground">$12</span>
              <span className="text-muted-foreground text-xs">/ month</span>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <ul className="space-y-3 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Daily 3-minute studio audio briefing
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Direct delivery via Telegram / WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Custom topic filtering & persona weighting
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> Interactive feedback & adaptive learning
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" /> 14-day full access trial
              </li>
            </ul>
            <div className="pt-6">
              <a href="http://localhost:3001">
                <Button variant="primary" className="w-full">
                  Start 14-Day Free Trial
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
