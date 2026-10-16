#!/usr/bin/env bun
/**
 * FirstCup Automated E2E Test Suite Runner
 * Executable via: `bun run tests/e2e/run-all.ts`
 * Orchestrates Tiers 1-4, tracks metrics, validates tier thresholds, and reports status.
 */

import { spawn } from "node:child_process";
import * as path from "node:path";
import { SuiteReporter } from "./harness/reporter";

interface TierConfig {
  id: "tier1" | "tier2" | "tier3" | "tier4";
  name: string;
  file: string;
  minTests: number;
}

const TIERS: TierConfig[] = [
  {
    id: "tier1",
    name: "Tier 1: Feature Coverage",
    file: "tests/e2e/tier1-feature-coverage.test.ts",
    minTests: 20,
  },
  {
    id: "tier2",
    name: "Tier 2: Boundary & Corner Cases",
    file: "tests/e2e/tier2-boundary-corner.test.ts",
    minTests: 20,
  },
  {
    id: "tier3",
    name: "Tier 3: Cross-Feature Combinations",
    file: "tests/e2e/tier3-cross-feature.test.ts",
    minTests: 10,
  },
  {
    id: "tier4",
    name: "Tier 4: Real-World Scenarios",
    file: "tests/e2e/tier4-real-world.test.ts",
    minTests: 4,
  },
];

async function runTestFile(file: string): Promise<{
  passed: boolean;
  testCount: number;
  output: string;
  durationMs: number;
}> {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn("bun", ["test", file], {
      cwd: path.resolve(__dirname, "../.."),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      const durationMs = Date.now() - start;
      const fullOutput = stdout + stderr;

      // Extract pass count from output
      const passMatch = fullOutput.match(/(\d+)\s+pass/i);
      const testCount = passMatch ? parseInt(passMatch[1], 10) : 0;
      const passed = code === 0 && testCount > 0;

      resolve({
        passed,
        testCount,
        output: fullOutput,
        durationMs,
      });
    });
  });
}

async function main() {
  console.log(`\n${"=".repeat(75)}`);
  console.log("  🚀 FIRSTCUP TECH MONOREPO — E2E TEST RUNNER");
  console.log("  Target: Tiers 1-4 (Features F01 through F34)");
  console.log(`${"=".repeat(75)}\n`);

  const reporter = new SuiteReporter();
  let anyFailed = false;

  for (const tier of TIERS) {
    process.stdout.write(`  ⏳ Running ${tier.name.padEnd(40)} ... `);
    const result = await runTestFile(tier.file);

    if (result.passed && result.testCount >= tier.minTests) {
      console.log(`✅ PASSED (${result.testCount} tests, ${result.durationMs}ms)`);
      for (let i = 0; i < result.testCount; i++) {
        reporter.record({
          name: `${tier.name} #${i + 1}`,
          tier: tier.id,
          passed: true,
          durationMs: Math.round(result.durationMs / result.testCount),
        });
      }
    } else {
      console.log(`❌ FAILED (${result.testCount} tests, code=${result.passed ? 0 : 1})`);
      anyFailed = true;
      reporter.record({
        name: tier.name,
        tier: tier.id,
        passed: false,
        durationMs: result.durationMs,
        error: `Expected at least ${tier.minTests} passing tests. Received ${result.testCount}.`,
      });
    }
  }

  const summary = reporter.printSummary();

  if (!summary.allPassed || anyFailed) {
    console.error("❌ E2E Test Suite Run: One or more tiers failed.");
    process.exit(1);
  } else {
    console.log("✅ All E2E test suites passed successfully! Exit code 0.\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
