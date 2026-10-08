import { Badge, Card } from "@repo/ui";

export default function BlogPage() {
  return (
    <div className="container mx-auto max-w-4xl py-20 px-4 sm:px-6">
      <div className="mb-12">
        <Badge variant="outline" className="mb-4">
          Intelligence Archive
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Curated Technology Briefings
        </h1>
        <p className="text-muted-foreground">
          Historical briefings and deep-dives synthesized across the engineering ecosystem.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>October 8, 2026</span>
            <Badge variant="success">Daily Audio</Badge>
          </div>
          <h2 className="text-xl font-bold mb-2">
            Next.js 16 and Bun 1.3: The Serverless Convergence
          </h2>
          <p className="text-sm text-muted-foreground">
            An executive overview of full-stack TypeScript runtime evolutions and containerized
            deployment models.
          </p>
        </Card>

        <Card className="p-6 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>October 7, 2026</span>
            <Badge variant="secondary">Weekly Digest</Badge>
          </div>
          <h2 className="text-xl font-bold mb-2">The State of Open Source AI Quantization</h2>
          <p className="text-sm text-muted-foreground">
            Why FP8 and 4-bit KV caching are revolutionizing private cloud LLM inference economics.
          </p>
        </Card>
      </div>
    </div>
  );
}
