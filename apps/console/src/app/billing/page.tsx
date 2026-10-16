"use client";

import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import {
  Archive,
  ArrowUpRight,
  Bell,
  Check,
  CreditCard,
  Download,
  ExternalLink,
  Flame,
  Headphones,
  Newspaper,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import * as React from "react";

const INVOICE_HISTORY = [
  {
    id: "INV-2026-004",
    date: "Oct 14, 2026",
    description: "Executive Pro Plan — Monthly Subscription",
    amount: "$29.00",
    status: "Paid",
    statusVariant: "success" as const,
  },
  {
    id: "INV-2026-003",
    date: "Sep 14, 2026",
    description: "Executive Pro Plan — Monthly Subscription",
    amount: "$29.00",
    status: "Paid",
    statusVariant: "success" as const,
  },
  {
    id: "INV-2026-002",
    date: "Aug 14, 2026",
    description: "Executive Pro Plan — Monthly Subscription",
    amount: "$29.00",
    status: "Paid",
    statusVariant: "success" as const,
  },
  {
    id: "INV-2026-001",
    date: "Jul 14, 2026",
    description: "14-Day Executive Pro Trial (Verification)",
    amount: "$0.00",
    status: "Settled",
    statusVariant: "secondary" as const,
  },
];

const UPGRADE_TIERS = [
  {
    id: "pro",
    name: "Executive Pro",
    price: "$29",
    cadence: "per month",
    description:
      "Essential intelligence briefing for senior individual contributors and team leads.",
    isCurrent: true,
    features: [
      "Daily 3-minute executive voice brief",
      "7 custom tracked tech topics",
      "Telegram & Email morning delivery",
      "Personal intelligence archive",
    ],
  },
  {
    id: "team",
    name: "Team Intelligence",
    price: "$79",
    cadence: "per month",
    popular: true,
    description: "Collaborative synthesis across engineering leadership cohorts.",
    features: [
      "Up to 5 engineering lead seats",
      "All 5 Neural Voice personas",
      "25 customizable topic pipelines",
      "Slack & Microsoft Teams live bot sync",
      "Shared team bookmark repository",
      "Priority pipeline crawling",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Command",
    price: "$249",
    cadence: "per month",
    description: "Organization-wide autonomous research and bespoke crawler pipelines.",
    features: [
      "Unlimited team seats",
      "Dedicated crawler instances",
      "Private vector embedding models",
      "Custom voice synthesis fine-tuning",
      "SSO & SAML authentication",
      "99.9% uptime SLA & dedicated lead",
    ],
  },
];

export default function BillingPage() {
  const [selectedTier, setSelectedTier] = React.useState<string>("team");
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const handleDownloadInvoice = (id: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
    }, 1200);
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Header */}
      <div className="border-b border-border/40 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Subscription & Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription tier, monitor monthly compute quotas, and view Paddle invoice
          receipts.
        </p>
      </div>

      {/* 1. Active Plan Overview Card */}
      <Card className="border-accent/30 bg-card/90 shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <CardTitle className="text-xl font-bold">Executive Pro Plan</CardTitle>
              <Badge variant="success">Active Trial</Badge>
              <Badge variant="outline" className="font-mono text-xs">
                Paddle Managed
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Automatic monthly renewal on{" "}
              <strong className="text-foreground">November 14, 2026</strong>.
            </CardDescription>
          </div>

          <div className="text-right sm:text-right">
            <div className="text-2xl font-extrabold text-foreground tracking-tight">$29.00</div>
            <div className="text-xs text-muted-foreground">per month • billed monthly</div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Payment Method</div>
                <div className="text-muted-foreground">
                  Mastercard ending in •••• 4242 (Exp 12/28)
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Processor Security</div>
                <div className="text-muted-foreground">PCI-DSS Level 1 Encrypted via Paddle</div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-border/40">
          <div className="text-xs text-muted-foreground">
            Questions regarding billing? Contact{" "}
            <span className="text-accent">billing@firstcup.dev</span>
          </div>

          <div className="flex items-center gap-2.5">
            <a href="https://paddle.com" target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer text-xs">
                <span>Manage via Paddle</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </a>

            {/* Plan Upgrade Dialog Trigger */}
            <Dialog>
              <DialogTrigger
                className={buttonVariants({
                  variant: "primary",
                  size: "sm",
                  className: "gap-1.5 cursor-pointer font-semibold text-xs",
                })}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Upgrade / Change Plan</span>
              </DialogTrigger>

              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Upgrade Your First Cup Subscription</DialogTitle>
                  <DialogDescription>
                    Scale from personal executive intelligence to team-wide autonomous briefings and
                    custom crawler instances.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                  {UPGRADE_TIERS.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                      <div
                        key={tier.id}
                        className={`rounded-xl border p-4 flex flex-col justify-between transition-all relative ${
                          tier.popular
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/40 bg-card"
                        }`}
                      >
                        {tier.popular && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Popular
                          </span>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-foreground">{tier.name}</h4>
                            {tier.isCurrent && (
                              <Badge variant="secondary" className="text-[10px]">
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold tracking-tight text-foreground">
                              {tier.price}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              /{tier.cadence}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {tier.description}
                          </p>

                          <ul className="mt-4 space-y-2 text-xs">
                            {tier.features.map((feat) => (
                              <li key={feat} className="flex items-center gap-2 text-foreground/90">
                                <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-6 pt-3 border-t border-border/40">
                          {tier.isCurrent ? (
                            <Button variant="outline" size="sm" disabled className="w-full text-xs">
                              Current Plan
                            </Button>
                          ) : (
                            <Button
                              variant={tier.popular ? "primary" : "outline"}
                              size="sm"
                              className="w-full text-xs cursor-pointer"
                              onClick={() => setSelectedTier(tier.id)}
                            >
                              {tier.id === "enterprise" ? "Contact Enterprise" : "Select Tier"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogClose
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "cursor-pointer text-xs",
                    })}
                  >
                    Cancel
                  </DialogClose>
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1.5 cursor-pointer font-semibold"
                  >
                    <span>Proceed to Paddle Checkout</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      </Card>

      {/* 2. Monthly Resource Quota Meters Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" />
            <CardTitle className="text-base font-bold">Monthly Quota & Consumption</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Resource usage for current billing period (Oct 14, 2026 – Nov 14, 2026).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-2">
          {/* Quota Meter 1: Daily Briefings */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Newspaper className="h-3.5 w-3.5 text-accent" />
                <span className="font-semibold text-foreground">Daily Briefings</span>
              </div>
              <span className="font-mono text-muted-foreground">
                <strong className="text-foreground">26</strong> / 30 briefs (86.7%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300 w-[86.7%]" />
            </div>
          </div>

          {/* Quota Meter 2: Voice Audio Minutes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Headphones className="h-3.5 w-3.5 text-accent" />
                <span className="font-semibold text-foreground">Voice Audio Minutes</span>
              </div>
              <span className="font-mono text-muted-foreground">
                <strong className="text-foreground">78</strong> / 100 mins (78.0%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300 w-[78.0%]" />
            </div>
          </div>

          {/* Quota Meter 3: Instant Alerts & Webhooks */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-accent" />
                <span className="font-semibold text-foreground">Instant Alerts & Webhooks</span>
              </div>
              <span className="font-mono text-muted-foreground">
                <strong className="text-foreground">1,420</strong> / 5,000 dispatched (28.4%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300 w-[28.4%]" />
            </div>
          </div>

          {/* Quota Meter 4: Archived Briefings */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Archive className="h-3.5 w-3.5 text-accent" />
                <span className="font-semibold text-foreground">Archived Briefings</span>
              </div>
              <span className="font-mono text-muted-foreground">
                <strong className="text-foreground">45</strong> / 500 saved (9.0%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-300 w-[9.0%]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Invoice History Table Card */}
      <Card className="border-border/80 bg-card shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-accent" />
            <CardTitle className="text-base font-bold">Billing & Invoice History</CardTitle>
          </div>
          <CardDescription className="text-xs mt-1">
            Download past official invoices and tax receipts processed through Paddle.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Invoice #</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Amount</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[110px] text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INVOICE_HISTORY.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {invoice.id}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="text-xs text-foreground/90">
                    {invoice.description}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {invoice.amount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={invoice.statusVariant} className="text-[10px]">
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      disabled={downloadingId === invoice.id}
                      className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{downloadingId === invoice.id ? "Saving..." : "PDF"}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
