"use client";

import { API_BASE } from "../lib/types";

interface OutputProductsProps {
  outputTab: "blog" | "email" | "audio" | "digest" | "dataset";
  setOutputTab: (tab: "blog" | "email" | "audio" | "digest" | "dataset") => void;
  stepResults: Record<string, unknown>;
  sessionId: string;
}

const TAB_LABEL: Record<OutputProductsProps["outputTab"], string> = {
  blog: "📰 Blog",
  email: "📧 Email",
  audio: "🎙️ Audio",
  digest: "📋 Digest",
  dataset: "📊 Dataset",
};

function getData<T = Record<string, unknown>>(result: unknown): T | undefined {
  if (!result || typeof result !== "object") return undefined;
  return (result as { data?: T }).data;
}

export function OutputProducts({
  outputTab,
  setOutputTab,
  stepResults,
  sessionId,
}: OutputProductsProps) {
  const blogData = getData<{ title: string; contentHtml: string }>(stepResults.blog);
  const emailData = getData<{ html: string }>(stepResults.email);
  const audioScriptData = getData<{
    script: string;
    durationSec: number;
    wordCount: number;
  }>(stepResults.audio_script);
  const audioGenData = getData<{
    audioBase64: string;
    provider: string;
    sizeBytes: number;
    format?: string;
  }>(stepResults.audio_generate);
  const digestData = getData(stepResults.digest);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap" role="tablist">
        {(Object.keys(TAB_LABEL) as OutputProductsProps["outputTab"][]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={outputTab === tab}
            onClick={() => setOutputTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              outputTab === tab
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-muted-foreground hover:text-foreground bg-muted/30"
            }`}
          >
            {TAB_LABEL[tab]}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 min-h-[350px] max-h-[600px] overflow-auto">
        {outputTab === "blog" &&
          (blogData ? (
            <div>
              <h4 className="font-bold text-sm mb-2">{blogData.title}</h4>
              <div
                className="prose prose-sm max-w-none text-foreground/80"
                dangerouslySetInnerHTML={{ __html: blogData.contentHtml || "" }}
              />
            </div>
          ) : (
            <div className="text-muted-foreground/50 text-sm">Run the Blog step to see preview</div>
          ))}

        {outputTab === "email" &&
          (emailData ? (
            <iframe
              title="Email Preview"
              className="w-full min-h-[600px] rounded border-none bg-white"
              srcDoc={emailData.html || ""}
            />
          ) : (
            <div className="text-muted-foreground/50 text-sm">
              Run the Email Preview step to see output
            </div>
          ))}

        {outputTab === "audio" && (
          <div className="space-y-4">
            {audioScriptData && (
              <div>
                <h4 className="font-bold text-sm mb-2">Audio Script</h4>
                <div className="text-xs bg-muted/20 rounded-xl p-4 whitespace-pre-wrap font-mono max-h-[200px] overflow-auto">
                  {audioScriptData.script}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Duration: {audioScriptData.durationSec}s</span>
                  <span>Words: {audioScriptData.wordCount}</span>
                </div>
              </div>
            )}
            {audioGenData && (
              <div>
                <h4 className="font-bold text-sm mb-2">Generated Audio</h4>
                {audioGenData.audioBase64 ? (
                  <audio
                    controls
                    className="w-full"
                    src={`data:audio/mpeg;base64,${audioGenData.audioBase64}`}
                    aria-label="Generated audio briefing"
                  >
                    <track kind="captions" srcLang="en" label="Audio briefing transcript" />
                  </audio>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Audio buffer is large; download instead.
                  </p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Provider: {audioGenData.provider}</span>
                  <span>Size: {(Number(audioGenData.sizeBytes) / 1024).toFixed(1)}KB</span>
                </div>
                <a
                  href={`${API_BASE}/admin/playground/audio/${sessionId}`}
                  download="briefing.mp3"
                  className="inline-block mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
                >
                  ⬇️ Download Audio
                </a>
              </div>
            )}
            {!audioScriptData && !audioGenData && (
              <div className="text-muted-foreground/50 text-sm">
                Run Audio Script / Generate steps to see output
              </div>
            )}
          </div>
        )}

        {outputTab === "digest" &&
          (digestData ? (
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(digestData, null, 2)}
            </pre>
          ) : (
            <div className="text-muted-foreground/50 text-sm">Run the Digest step to see data</div>
          ))}

        {outputTab === "dataset" && (
          <div>
            <a
              href={`${API_BASE}/admin/playground/export/${sessionId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
            >
              ⬇️ Export Full Dataset (JSON)
            </a>
            <p className="text-xs text-muted-foreground mt-2">
              Downloads all cached pipeline data for this session as a single JSON file.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
