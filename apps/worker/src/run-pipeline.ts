import { workerLogger } from "./lib/logger";
import { redisConnection } from "./lib/redis";
import { runAutonomousPipeline } from "./pipeline/orchestrator";

async function main() {
  workerLogger.info("Starting standalone manual pipeline run...");
  const report = await runAutonomousPipeline({ triggerSource: "manual" });
  console.log("\n================ PIPELINE REPORT ================");
  console.log(JSON.stringify(report, null, 2));
  console.log("=================================================\n");

  await redisConnection.quit();
  process.exit(report.success ? 0 : 1);
}

main().catch((err) => {
  console.error("Pipeline run error:", err);
  process.exit(1);
});
