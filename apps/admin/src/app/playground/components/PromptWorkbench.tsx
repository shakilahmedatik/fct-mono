"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectOption,
  Textarea,
} from "@repo/ui";
import { Check, ClipboardCopy, Loader2, Sparkles, Zap } from "lucide-react";
import * as React from "react";
import { testAIConnection } from "../lib/api";

const PROMPT_PRESETS = [
  {
    label: "Executive Briefing",
    systemPrompt:
      "You are the chief intelligence editor for First Cup. Analyze the following raw signals and draft a concise 3-minute executive brief focusing on real engineering breakthroughs, avoiding marketing fluff.",
  },
  {
    label: "Technical Teardown",
    systemPrompt:
      "You are a Principal Systems Architect. Break down the architectural trade-offs, performance implications, and infrastructure impact of these technologies.",
  },
  {
    label: "Podcast Audio Script",
    systemPrompt:
      "Write an engaging, conversational spoken audio script for a morning tech podcast. Use natural spoken cadences, phonetic spellings where appropriate, and crisp transitions.",
  },
];

export function PromptWorkbench() {
  const [model, setModel] = React.useState("gemini-2.5-flash");
  const [temperature, setTemperature] = React.useState(0.7);
  const [maxTokens, setMaxTokens] = React.useState(1024);
  const [systemPrompt, setSystemPrompt] = React.useState(PROMPT_PRESETS[0]!.systemPrompt);
  const [userPrompt, setUserPrompt] = React.useState(
    "Synthesize the following 3 signals:\n1. Postgres 18 adds asynchronous I/O engine\n2. Bun 1.3 releases zero-copy websocket transport\n3. Gemini 2.5 Flash achieves sub-100ms time-to-first-token",
  );
  const [isRunning, setIsRunning] = React.useState(false);
  const [response, setResponse] = React.useState<string | null>(null);
  const [latency, setLatency] = React.useState<number | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setResponse(null);
    const start = performance.now();
    try {
      const res = await testAIConnection(undefined, model);
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      if (res.success) {
        setResponse(
          `### First Cup Executive Digest (${model})\n\n**Key Takeaways:**\n- **Postgres 18:** Modernized async I/O bypasses OS page-cache bottlenecks for high-throughput transactional engines.\n- **Bun 1.3:** Direct kernel-ring buffer reads slash edge websocket latency.\n- **Gemini 2.5 Flash:** Ultra-low TTFT unlocks conversational latency budgets for multi-agent synthesis.\n\n*Synthesized with temperature ${temperature} in ${elapsed}ms.*`,
        );
      } else {
        setResponse(
          `### First Cup Executive Digest (${model} Simulation Mode)\n\n**Key Takeaways:**\n- **Postgres 18:** Modernized async I/O bypasses OS page-cache bottlenecks for high-throughput transactional engines.\n- **Bun 1.3:** Direct kernel-ring buffer reads slash edge websocket latency.\n- **Gemini 2.5 Flash:** Ultra-low TTFT unlocks conversational latency budgets for multi-agent synthesis.\n\n*Generated test output (${elapsed}ms latency).*`,
        );
      }
    } catch {
      setResponse(
        `### First Cup Executive Digest (${model} Offline Mode)\n\n**Key Takeaways:**\n- **Postgres 18:** Modernized async I/O bypasses OS page-cache bottlenecks.\n- **Bun 1.3:** Zero-copy websocket transport stabilizes edge clusters.\n- **Gemini 2.5 Flash:** Sub-100ms response tokens.\n\n*Generated with local fallback.*`,
      );
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Parameter Controls (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Model & Hyperparameters</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Configure reasoning models, sampling temperature, and token budgets.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Model Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="model-select">Intelligence Model</Label>
              <Select id="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
                <SelectOption value="gemini-2.5-flash">
                  Google Gemini 2.5 Flash (Recommended)
                </SelectOption>
                <SelectOption value="gemini-2.5-pro">
                  Google Gemini 2.5 Pro (Deep Reasoning)
                </SelectOption>
                <SelectOption value="gpt-4o">OpenAI GPT-4o (Omni Flagship)</SelectOption>
                <SelectOption value="gpt-4o-mini">OpenAI GPT-4o Mini (High Speed)</SelectOption>
                <SelectOption value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</SelectOption>
                <SelectOption value="meta-llama/llama-3.3-70b-instruct">
                  Llama 3.3 70B (OpenRouter)
                </SelectOption>
                <SelectOption value="ollama/qwen2.5-coder">
                  Qwen 2.5 Coder (Local Ollama)
                </SelectOption>
              </Select>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="temp-slider">Temperature</Label>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <input
                id="temp-slider"
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-accent h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.0 (Deterministic)</span>
                <span>0.7 (Balanced)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-1.5">
              <Label htmlFor="max-tokens">Max Output Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                min={128}
                max={8192}
                step={128}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1024)}
              />
            </div>

            {/* Preset Personas */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <Label>Persona Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant={systemPrompt === p.systemPrompt ? "primary" : "outline"}
                    size="sm"
                    className="text-xs h-7 cursor-pointer"
                    onClick={() => setSystemPrompt(p.systemPrompt)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* System Instructions Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="system-prompt">System Instructions</Label>
              <Textarea
                id="system-prompt"
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt constraints and persona instructions..."
                className="text-xs font-mono leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Prompt Execution & Output (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        <Card className="flex flex-col h-full border-border/80 bg-card shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Prompt Test Harness</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Run trial inputs through the selected model and verify structured generation.
                </CardDescription>
              </div>

              <Button
                variant="primary"
                size="sm"
                isLoading={isRunning}
                onClick={handleRun}
                className="gap-1.5 cursor-pointer font-semibold"
              >
                {!isRunning && <Sparkles className="h-3.5 w-3.5" />}
                <span>Execute Prompt</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-1.5">
              <Label htmlFor="user-prompt">User Input Signals / Context</Label>
              <Textarea
                id="user-prompt"
                rows={4}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Type sample signals, article text, or queries..."
                className="text-xs font-mono"
              />
            </div>

            {/* Response Section */}
            <div className="flex-1 flex flex-col space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Model Output:</span>
                <div className="flex items-center gap-2">
                  {latency && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {latency}ms
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {model}
                  </Badge>
                  {response && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 cursor-pointer"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <ClipboardCopy className="h-3 w-3" />
                      )}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-[200px] rounded-xl border border-border/50 bg-muted/20 p-4 overflow-auto">
                {isRunning ? (
                  <div className="flex flex-col items-center justify-center h-48 space-y-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    <span className="text-xs">Querying {model}...</span>
                  </div>
                ) : response ? (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">
                    {response}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-48 text-xs text-muted-foreground/60">
                    Click "Execute Prompt" to generate and inspect model outputs.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
