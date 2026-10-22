"use client";

import { Button } from "@repo/ui";
import { Play } from "lucide-react";
import { type PlaygroundStep, STEPS } from "../lib/types";
import type { StepStatus } from "../lib/usePipeline";

interface Props {
  isRunning: boolean;
  activeStep: PlaygroundStep | null;
  completedSteps: Set<PlaygroundStep>;
  getStepStatus: (s: PlaygroundStep) => StepStatus;
  onRunStep: (s: PlaygroundStep) => void;
  onRunFull: () => void;
}

const STATUS_CLASS: Record<StepStatus, string> = {
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  active: "border-amber-500/40 bg-amber-500/10 text-amber-400 animate-pulse",
  available: "border-accent/40 bg-accent/5 text-accent hover:bg-accent/15 cursor-pointer",
  locked: "border-border/20 bg-muted/10 text-muted-foreground/50 cursor-not-allowed",
};

export function StepsRow({ isRunning, activeStep, getStepStatus, onRunStep, onRunFull }: Props) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-foreground">Pipeline Steps</h3>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isRunning}
          isLoading={isRunning}
          onClick={onRunFull}
          className="text-xs font-semibold gap-1.5 cursor-pointer"
        >
          {!isRunning && <Play className="h-3 w-3" />}
          <span>Run Full Pipeline</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.id);
          const isInteractive = status === "completed" || status === "active";
          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={status === "locked" || isRunning}
                onClick={() => onRunStep(step.id)}
                title={
                  status === "locked"
                    ? "Run previous step first"
                    : status === "completed"
                      ? "Re-run (downstream will be invalidated)"
                      : `Run ${step.label}`
                }
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 ${STATUS_CLASS[status]} ${
                  isInteractive ? "ring-1 ring-inset ring-current/10" : ""
                }`}
              >
                <span className="text-base">{step.icon}</span>
                <div className="text-left">
                  <div>{step.label}</div>
                  <div className="text-[10px] opacity-70 font-normal">{step.description}</div>
                </div>
                {status === "completed" && <span className="text-emerald-400 ml-1">✓</span>}
                {status === "active" && (
                  <span className="ml-1 h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                )}
              </button>
              {idx < STEPS.length - 1 && (
                <span className="text-muted-foreground/30 text-xs">→</span>
              )}
            </div>
          );
        })}
      </div>
      {activeStep && (
        <p className="text-[10px] text-muted-foreground mt-3 italic">
          Active: {STEPS.find((s) => s.id === activeStep)?.label}
        </p>
      )}
    </div>
  );
}
