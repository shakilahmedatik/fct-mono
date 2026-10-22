/**
 * FirstCup E2E Test Suite Reporter
 * Collects, summarizes, and formats test execution results across all 4 tiers.
 */

export interface TestResult {
  name: string;
  tier: "tier1" | "tier2" | "tier3" | "tier4";
  featureId?: string;
  passed: boolean;
  durationMs: number;
  error?: Error | string;
}

export interface TierSummary {
  tierName: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
}

export class SuiteReporter {
  private results: TestResult[] = [];
  private startTime = Date.now();

  record(result: TestResult): void {
    this.results.push(result);
  }

  getResults(): TestResult[] {
    return [...this.results];
  }

  getTierSummary(tier: "tier1" | "tier2" | "tier3" | "tier4"): TierSummary {
    const tierResults = this.results.filter((r) => r.tier === tier);
    const total = tierResults.length;
    const passed = tierResults.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = total === 0 ? 100 : Math.round((passed / total) * 100);

    const labels: Record<string, string> = {
      tier1: "Tier 1: Feature Coverage",
      tier2: "Tier 2: Boundary & Corner Cases",
      tier3: "Tier 3: Cross-Feature Pairwise",
      tier4: "Tier 4: Real-World Scenarios",
    };

    return {
      tierName: labels[tier] ?? tier,
      total,
      passed,
      failed,
      skipped: 0,
      passRate,
    };
  }

  printSummary(): { allPassed: boolean; total: number; passed: number; failed: number } {
    const totalDuration = Date.now() - this.startTime;
    const total = this.results.length;
    const passed = this.results.filter((r) => r.passed).length;
    const failed = total - passed;
    const allPassed = failed === 0;

    console.log(`\n${"=".repeat(75)}`);
    console.log("  ☕ FIRSTCUP E2E TEST SUITE EXECUTION REPORT");
    console.log("=".repeat(75));

    const tiers: ("tier1" | "tier2" | "tier3" | "tier4")[] = ["tier1", "tier2", "tier3", "tier4"];
    for (const t of tiers) {
      const summary = this.getTierSummary(t);
      const icon = summary.failed === 0 ? "✅" : "❌";
      console.log(
        `  ${icon} ${summary.tierName.padEnd(35)} | ${String(summary.passed).padStart(2)}/${String(summary.total).padEnd(2)} passed (${summary.passRate}%)`,
      );
    }

    console.log("-".repeat(75));
    console.log(
      `  Total Tests: ${total} | Passed: ${passed} | Failed: ${failed} | Duration: ${totalDuration}ms`,
    );

    if (failed > 0) {
      console.log("\n  FAILED TESTS:");
      for (const res of this.results.filter((r) => !r.passed)) {
        console.log(`    ❌ [${res.tier}] ${res.name}: ${res.error}`);
      }
      console.log(`${"=".repeat(75)}\n`);
    } else {
      console.log("  🎉 ALL 4 TIERS PASSED 100% — TEST SUITE VERIFIED READY");
      console.log(`${"=".repeat(75)}\n`);
    }

    return { allPassed, total, passed, failed };
  }
}
