import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@repo/ui";

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-xl py-20 px-4 sm:px-6">
      <Card className="p-8">
        <CardHeader className="p-0 pb-6 text-center">
          <CardTitle className="text-2xl font-bold">Contact Our Team</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Have a question or custom enterprise delivery need? Reach out directly.
          </p>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div>
            <label
              htmlFor="contact-name"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Name
            </label>
            <Input id="contact-name" placeholder="Alex Chen" className="mt-1" />
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Email
            </label>
            <Input
              id="contact-email"
              type="email"
              placeholder="alex@company.com"
              className="mt-1"
            />
          </div>
          <div>
            <label
              htmlFor="contact-message"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              rows={4}
              placeholder="Tell us about your team or question..."
              className="mt-1 flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1"
            />
          </div>
          <Button variant="primary" className="w-full">
            Send Message
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
