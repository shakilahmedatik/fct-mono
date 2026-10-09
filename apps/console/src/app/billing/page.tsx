import { Badge, Button, Card } from "@repo/ui";
import { Check, CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Subscription & Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan, payment methods, and invoice history via Paddle.
        </p>
      </div>

      <Card className="p-6 border-accent/30 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">Executive Pro Plan</h3>
              <Badge variant="success">Active Trial</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your 14-day trial is active ($12/month thereafter).
            </p>
          </div>
          <Button variant="primary" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Manage via Paddle</span>
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4 border-border/80 bg-card">
        <h3 className="font-semibold text-base">Plan Features Included</h3>
        <ul className="space-y-2.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2 text-foreground">
            <Check className="h-4 w-4 text-accent" /> Daily customized voice intelligence brief
          </li>
          <li className="flex items-center gap-2 text-foreground">
            <Check className="h-4 w-4 text-accent" /> Telegram & WhatsApp instant delivery
          </li>
          <li className="flex items-center gap-2 text-foreground">
            <Check className="h-4 w-4 text-accent" /> Priority vector clustering and story ranking
          </li>
        </ul>
      </Card>
    </div>
  );
}
