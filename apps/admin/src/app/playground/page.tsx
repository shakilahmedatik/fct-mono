"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { Headphones, Layers, Sparkles, Workflow } from "lucide-react";
import { AiConfigPanel } from "./components/AiConfigPanel";
import { AudioConfigPanel } from "./components/AudioConfigPanel";
import { AudioWorkbench } from "./components/AudioWorkbench";
import { Header } from "./components/Header";
import { PipelineInspectorWorkbench } from "./components/PipelineInspectorWorkbench";
import { PromptWorkbench } from "./components/PromptWorkbench";
import { SourcesPanel } from "./components/SourcesPanel";
import { StepsRow } from "./components/StepsRow";
import { VectorSearchWorkbench } from "./components/VectorSearchWorkbench";
import { usePipeline } from "./lib/usePipeline";

export default function PlaygroundPage() {
  const p = usePipeline();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Session Management & Quick Toggles */}
      <Header
        sessionId={p.sessionId}
        pastSessions={p.pastSessions}
        sources={p.sources}
        onLoadSession={p.loadSession}
        onNewSession={p.startNewSession}
        onClear={p.clearCurrentSession}
        onToggleAi={() => p.setShowAiConfig(!p.showAiConfig)}
        onToggleAudio={() => p.setShowAudioConfig(!p.showAudioConfig)}
        onToggleSources={() => p.setShowSourceConfig(!p.showSourceConfig)}
      />

      {p.showAiConfig && (
        <AiConfigPanel
          settings={p.aiSettings}
          providers={p.aiProviders}
          onRefresh={p.loadAiSettings}
        />
      )}

      {p.showAudioConfig && (
        <AudioConfigPanel
          settings={p.audioSettings}
          providers={p.audioStatuses}
          onRefresh={() => {
            p.loadAudioSettings();
            p.loadSourceConfig();
          }}
        />
      )}

      {/* Conditionally Expanded Data Sources Panel with AddCustomRssDialog */}
      {p.showSourceConfig && (
        <SourcesPanel
          sources={p.sources}
          setSources={p.setSources}
          onAdd={p.addCustomRss}
          onRemove={p.removeCustomRss}
        />
      )}

      {/* Pipeline Step-by-Step Orchestrator */}
      <StepsRow
        isRunning={p.isRunning}
        activeStep={p.activeStep}
        completedSteps={p.completedSteps}
        getStepStatus={p.getStepStatus}
        onRunStep={p.executeStep}
        onRunFull={p.runFullPipeline}
      />

      {/* Tabbed Interactive AI & Pipeline Workbench */}
      <Tabs defaultValue="prompt" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Interactive AI & Pipeline Workbench
            </h2>
            <p className="text-xs text-muted-foreground">
              Directly experiment with LLM prompt templates, Kokoro & Neural TTS synthesis, and
              semantic vector embeddings.
            </p>
          </div>

          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="prompt" className="gap-2 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Prompt Engineering</span>
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2 text-xs font-semibold">
              <Headphones className="h-3.5 w-3.5 text-emerald-500" />
              <span>Audio Generation</span>
            </TabsTrigger>
            <TabsTrigger value="vector" className="gap-2 text-xs font-semibold">
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              <span>Vector Search</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2 text-xs font-semibold">
              <Workflow className="h-3.5 w-3.5 text-violet-500" />
              <span>Pipeline Logs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Prompt Engineering */}
        <TabsContent value="prompt">
          <PromptWorkbench />
        </TabsContent>

        {/* Tab 2: Audio Generation */}
        <TabsContent value="audio">
          <AudioWorkbench
            settings={p.audioSettings}
            providers={p.audioStatuses}
            onRefresh={() => {
              p.loadAudioSettings();
              p.loadSourceConfig();
            }}
          />
        </TabsContent>

        {/* Tab 3: Vector Search */}
        <TabsContent value="vector">
          <VectorSearchWorkbench
            clusterThreshold={p.params.clusterThreshold}
            rankLimit={p.params.rankLimit}
            onUpdateClusterThreshold={(val) => p.updateParam("clusterThreshold", val)}
            onUpdateRankLimit={(val) => p.updateParam("rankLimit", val)}
            clusterCount={p.clusterCount}
            rankedCount={p.rankedCount}
          />
        </TabsContent>

        {/* Tab 4: Pipeline Logs & Inspector */}
        <TabsContent value="pipeline">
          <PipelineInspectorWorkbench pipeline={p} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
