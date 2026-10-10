"use client";

import { AiConfigPanel } from "./components/AiConfigPanel";
import { DataInspector } from "./components/DataInspector";
import { Header } from "./components/Header";
import { LogsPanel } from "./components/LogsPanel";
import { OutputProducts } from "./components/OutputProducts";
import { ParametersPanel } from "./components/ParametersPanel";
import { QueueDashboard } from "./components/QueueDashboard";
import { SourcesPanel } from "./components/SourcesPanel";
import { StepsRow } from "./components/StepsRow";
import { usePipeline } from "./lib/usePipeline";

export default function PlaygroundPage() {
  const p = usePipeline();

  return (
    <div className="space-y-6 max-w-350">
      <Header
        sessionId={p.sessionId}
        pastSessions={p.pastSessions}
        sources={p.sources}
        onLoadSession={p.loadSession}
        onNewSession={p.startNewSession}
        onClear={p.clearCurrentSession}
        onToggleAi={() => p.setShowAiConfig(!p.showAiConfig)}
        onToggleSources={() => p.setShowSourceConfig(!p.showSourceConfig)}
      />

      {p.showAiConfig && <AiConfigPanel aiConfig={p.aiConfig} setAiConfig={p.setAiConfig} />}

      {p.showSourceConfig && (
        <SourcesPanel
          sources={p.sources}
          setSources={p.setSources}
          onAdd={p.addCustomRss}
          onRemove={p.removeCustomRss}
        />
      )}

      <StepsRow
        isRunning={p.isRunning}
        activeStep={p.activeStep}
        completedSteps={p.completedSteps}
        getStepStatus={p.getStepStatus}
        onRunStep={p.executeStep}
        onRunFull={p.runFullPipeline}
      />

      {/* Parameter Tuning + Results */}
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
            className="flex gap-1 border-b border-border/40 pb-0"
            role="tablist"
            aria-label="Result view"
          >
            {(["data", "logs", "output"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={p.activeTab === tab}
                onClick={() => p.setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-lg border border-b-0 transition-colors ${
                  p.activeTab === tab
                    ? "bg-card border-border/60 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "data"
                  ? "📊 Data Inspector"
                  : tab === "logs"
                    ? "📝 Logs"
                    : "📦 Output Products"}
              </button>
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
