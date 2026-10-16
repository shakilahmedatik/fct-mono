"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Switch,
} from "@repo/ui";
import { ArrowRight, Check, HelpCircle, Mail, Minus, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = React.useState(true);

  return (
    <div className="container mx-auto max-w-6xl py-20 px-4 sm:px-6">
      {/* ================================================================= */}
      {/* 1. Header & Billing Cadence Toggle                                */}
      {/* ================================================================= */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <Badge variant="outline" className="mb-4">
          Transparent Pricing
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
          Invest in High-Signal Tech Intelligence
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          Start with a 14-day unrestricted Pro trial. Upgrade, downgrade, or cancel anytime with
          zero lock-in.
        </p>

        {/* Cadence Toggle */}
        <div className="mt-8 inline-flex items-center justify-center gap-3 p-1.5 rounded-full border border-border bg-card shadow-xs">
          <button
            type="button"
            className={`text-sm font-medium transition-colors cursor-pointer px-2 bg-transparent border-none ${
              !isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </button>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            aria-label="Toggle annual billing cadence"
          />
          <button
            type="button"
            className={`text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer px-2 bg-transparent border-none ${
              isAnnual ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
            onClick={() => setIsAnnual(true)}
          >
            <span>Annual</span>
            <Badge variant="success" className="text-[10px] px-2 py-0.5 font-bold">
              Save 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. Three Structured Pricing Tier Cards                            */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Tier 1: Community / Starter */}
        <Card className="flex flex-col justify-between p-8 border-border bg-card shadow-sm">
          <div>
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-2xl font-bold">Community</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Essential weekly summaries for individual developers and hobbyists.
              </CardDescription>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">$0</span>
                <span className="text-muted-foreground text-xs font-medium">/ forever</span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 border-t border-border/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                What&apos;s Included
              </div>
              <ul className="space-y-3.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Weekly email intelligence newsletter</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Web dashboard archive access</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>General technology topic feed</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Daily 3-minute studio audio briefing</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Telegram & WhatsApp delivery</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Custom stack filtering & weights</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Team seats & shared channels</span>
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 pt-8">
            <a href="http://localhost:3001" className="w-full">
              <Button variant="outline" className="w-full h-11 cursor-pointer">
                Get Started Free
              </Button>
            </a>
          </CardFooter>
        </Card>

        {/* Tier 2: Executive Pro (Highlighted) */}
        <Card className="relative flex flex-col justify-between p-8 border-2 border-primary bg-card shadow-xl ring-1 ring-primary/20 lg:-translate-y-2">
          <Badge
            variant="success"
            className="absolute -top-3.5 right-6 px-3 py-1 font-semibold shadow-sm gap-1"
          >
            <Sparkles className="h-3 w-3" />
            <span>Most Popular</span>
          </Badge>

          <div>
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-2xl font-bold text-foreground">Executive Pro</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Daily personalized voice & text briefings tailored to your specific stack.
              </CardDescription>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  ${isAnnual ? "7" : "9"}
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  / month {isAnnual && "(billed $84/yr)"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 border-t border-border/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-4">
                Everything in Community, plus
              </div>
              <ul className="space-y-3.5 text-sm text-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Daily 3-minute studio audio briefing (7:00 AM)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Direct delivery via Telegram, WhatsApp, & RSS</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Custom stack weighting (AI, Systems, Rust, Cloud)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Vector-clustered semantic deduplication</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Interactive feedback & adaptive topic tuning</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Full intelligence search across historical archive</span>
                </li>
                <li className="flex items-center gap-2.5 opacity-60">
                  <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Multi-user team seats & shared channels</span>
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 pt-8">
            <a href="http://localhost:3001" className="w-full">
              <Button variant="primary" className="w-full h-11 cursor-pointer shadow-md">
                Start 14-Day Free Trial
              </Button>
            </a>
          </CardFooter>
        </Card>

        {/* Tier 3: Team Intelligence */}
        <Card className="flex flex-col justify-between p-8 border-border bg-card shadow-sm">
          <div>
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-2xl font-bold">Team Intelligence</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                For engineering squads and tech leadership seeking shared intelligence.
              </CardDescription>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  ${isAnnual ? "23" : "29"}
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  / month {isAnnual && "(billed $276/yr)"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 border-t border-border/40">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Everything in Pro, plus
              </div>
              <ul className="space-y-3.5 text-sm text-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>5 team member accounts included</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Shared team Slack & Discord channel delivery</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Role presets: SRE, ML Platform, Frontend, Core</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Centralized team billing & seat administration</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Priority source indexing & custom feed requests</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0" />
                  <span>Dedicated onboarding & private support channel</span>
                </li>
              </ul>
            </CardContent>
          </div>

          <CardFooter className="p-0 pt-8">
            <a href="http://localhost:3001" className="w-full">
              <Button variant="outline" className="w-full h-11 cursor-pointer">
                Start Team Trial
              </Button>
            </a>
          </CardFooter>
        </Card>
      </div>

      {/* ================================================================= */}
      {/* 3. Enterprise Inquiry Callout Banner                              */}
      {/* ================================================================= */}
      <div className="mt-16">
        <Card className="p-8 sm:p-10 border-border bg-muted/20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <Badge variant="outline" className="mb-1">
                Enterprise & Custom Scale
              </Badge>
              <h3 className="text-2xl font-bold text-foreground">
                Need Custom Deployments or 20+ Seats?
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                We support enterprise requirements including internal repository and Confluence
                ingestion, custom fine-tuned neural voices, SSO/SAML 2.0 authentication, dedicated
                SLAs, and procurement invoicing.
              </p>
            </div>
            <Link href="/contact" className="shrink-0">
              <Button variant="secondary" size="lg" className="gap-2 cursor-pointer">
                <Mail className="h-4 w-4" />
                <span>Contact Enterprise Sales</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* ================================================================= */}
      {/* 4. Pricing & Billing FAQ Section                                  */}
      {/* ================================================================= */}
      <div className="mt-24 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">
            <HelpCircle className="h-3 w-3 mr-1" />
            Pricing FAQ
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Frequently Asked Questions About Billing
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Clear, transparent answers with zero fine print.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              Can I switch between monthly and annual billing?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yes, you can toggle between monthly and annual billing anytime in your console billing
              settings. Upgrades apply immediately with prorated billing, and annual plans lock in a
              20% discount.
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              How does the 14-day free trial work?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You receive unrestricted access to all Pro or Team capabilities for 14 days without
              entering credit card details. You can cancel with a single click at any time.
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              What payment methods do you accept?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We accept all major credit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and
              bank transfers for annual and enterprise invoices.
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              Can we add additional seats to the Team plan?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yes, additional seats can be added directly from your console settings for
              $5/seat/month, or you can inquire about an Enterprise organization agreement.
            </p>
          </Card>

          <Card className="p-6 md:col-span-2">
            <h4 className="font-semibold text-foreground text-sm mb-2">
              What is your cancellation and refund policy?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You can cancel your subscription at any time with a single click. Your access will
              remain active until the end of your paid billing cycle. We also offer a 30-day
              money-back guarantee if you are not satisfied.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
