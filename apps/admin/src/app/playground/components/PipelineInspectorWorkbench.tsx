"use client";

import { Button } from "@repo/ui";
import type { usePipeline } from "../lib/usePipeline";
import { DataInspector } from "./DataInspector";
import { LogsPanel } from "./LogsPanel";
import { OutputProducts } from "./OutputProducts";
import { ParametersPanel } from "./ParametersPanel";
import { QueueDashboard } from "./QueueDashboard";

interface PipelineInspectorWorkbenchProps {
  pipeline: ReturnType<typeof usePipeline>;
}

export function PipelineInspectorWorkbench({ pipeline: p }: PipelineInspectorWorkbenchProps) {
  return (
    <div className="space-y-6">
      {/* Parameter Tuning + Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ParametersPanel
          params={p.params}
          updateParam={p.updateParam}
          audioProviders={p.audioProviders}
          presets={p.presets}
          activePresetId={p.activePresetId}
          onSavePreset={p.savePreset}
          onApplyPreset={p.applyPreset}
          onDeletePreset={p.deletePreset}
          clusterCount={p.clusterCount}
          normalizedCount={p.normalizedCount}
          rankedCount={p.rankedCount}
        />

        <div className="lg:col-span-2 space-y-4">
          <div
            className="flex gap-1.5 border-b border-border/40 pb-2"
            role="tablist"
            aria-label="Inspector view tabs"
          >
            {(["data", "logs", "output"] as const).map((tab) => (
              <Button
                key={tab}
                type="button"
                role="tab"
                aria-selected={p.activeTab === tab}
                variant={p.activeTab === tab ? "primary" : "outline"}
                size="sm"
                onClick={() => p.setActiveTab(tab)}
                className="text-xs font-semibold cursor-pointer h-8"
              >
                {tab === "data"
                  ? "📊 Data Inspector"
                  : tab === "logs"
                    ? "📝 Execution Logs"
                    : "📦 Output Products"}
              </Button>
            ))}
          </div>

          {p.activeTab === "data" && (
            <DataInspector
              currentResult={p.currentResult}
              displayedInspectorStep={p.displayedInspectorStep}
              onPickStep={(s) => p.setInspectorStep(s)}
            />
          )}

          {p.activeTab === "logs" && (
            <LogsPanel
              logs={p.logs}
              logsEndRef={p.logsEndRef}
              onScroll={p.trackLogScroll}
              onJumpToLatest={p.jumpToLatestLogs}
              isScrolledUp={p.logsScrolledUp}
            />
          )}

          {p.activeTab === "output" && (
            <OutputProducts
              outputTab={p.outputTab}
              setOutputTab={p.setOutputTab}
              stepResults={p.stepResults}
              sessionId={p.sessionId}
            />
          )}
        </div>
      </div>

      <QueueDashboard queues={p.queueStatuses} onRefresh={p.loadQueueStatus} />
    </div>
  );
}
