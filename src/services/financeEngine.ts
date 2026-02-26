// ============================================================
// financeEngine.ts — The "Accountant" for Finex AI
// Deterministic Logic Layer | Zero LLM Math
// ============================================================

import { db } from "./db"; // your existing Dexie db
import type { Transaction } from "../models/Transaction";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface GroundTruth {
  totalSpent: number;
  totalIncome: number;
  currentBalance: number;
  dailyAverage: number;
  daysRemainingInMonth: number;
  projectedMonthlySpend: number;
  categoryBreakdown: Record<string, CategoryStat>;
  anomalies: Anomaly[];
  billShocks: BillShock[];
  riskScore: number; // 0–100
  riskLabel: "SAFE" | "CAUTION" | "DANGER";
  snapshotDate: string;
}

export interface CategoryStat {
  total: number;
  percentage: number;
  avg30Day: number;
  transactionCount: number;
}

export interface Anomaly {
  transactionId: string | number;
  description: string;
  amount: number;
  category: string;
  deviationPercent: number;
}

export interface BillShock {
  name: string;
  amount: number;
  dueInDays: number;
  canAfford: boolean;
  balanceAfter: number;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDayOfMonth(date: Date): number {
  return date.getDate();
}

// ─────────────────────────────────────────────
// FINANCE ENGINE CLASS
// ─────────────────────────────────────────────

export class FinanceEngine {
  private now: Date;
  private monthStart: Date;
  private thirtyDaysAgo: Date;

  constructor() {
    this.now = new Date();
    this.monthStart = new Date(this.now.getFullYear(), this.now.getMonth(), 1);
    this.thirtyDaysAgo = new Date(this.now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  /** Main entry point — returns the full GroundTruth object */
  async analyze(): Promise<GroundTruth> {
    // Fetch all transactions from DB once
    const allTx: Transaction[] = await db.transactions.toArray();

    const thisMonthTx = allTx.filter(
      (t) => new Date(t.date) >= this.monthStart
    );
    const last30Tx = allTx.filter(
      (t) => new Date(t.date) >= this.thirtyDaysAgo
    );

    const expenses = thisMonthTx.filter((t) => t.amount < 0);
    const income = thisMonthTx.filter((t) => t.amount > 0);

    const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);
    const currentBalance = totalIncome - totalSpent;

    const dayOfMonth = getDayOfMonth(this.now);
    const daysInMonth = getDaysInMonth(this.now);
    const daysRemainingInMonth = daysInMonth - dayOfMonth;

    const dailyAverage = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
    const projectedMonthlySpend = dailyAverage * daysInMonth;

    const categoryBreakdown = this.calcCategoryBreakdown(expenses, last30Tx, totalSpent);
    const anomalies = this.detectAnomalies(expenses, categoryBreakdown);
    const billShocks = this.detectBillShocks(currentBalance, daysRemainingInMonth);

    const riskScore = this.calcRiskScore(
      currentBalance,
      projectedMonthlySpend,
      totalIncome,
      anomalies.length,
      billShocks.filter((b) => !b.canAfford).length
    );

    const riskLabel =
      riskScore >= 70 ? "DANGER" : riskScore >= 40 ? "CAUTION" : "SAFE";

    return {
      totalSpent,
      totalIncome,
      currentBalance,
      dailyAverage,
      daysRemainingInMonth,
      projectedMonthlySpend,
      categoryBreakdown,
      anomalies,
      billShocks,
      riskScore,
      riskLabel,
      snapshotDate: this.now.toISOString(),
    };
  }

  // ── Category Breakdown ──────────────────────
  private calcCategoryBreakdown(
    thisMonthExpenses: Transaction[],
    last30Tx: Transaction[],
    totalSpent: number
  ): Record<string, CategoryStat> {
    const breakdown: Record<string, CategoryStat> = {};

    // Build 30-day category averages
    const last30Expenses = last30Tx.filter((t) => t.amount < 0);
    const avg30Map: Record<string, number> = {};
    for (const t of last30Expenses) {
      const cat = t.category ?? "Other";
      avg30Map[cat] = (avg30Map[cat] ?? 0) + Math.abs(t.amount);
    }

    // This month's data
    for (const t of thisMonthExpenses) {
      const cat = t.category ?? "Other";
      if (!breakdown[cat]) {
        breakdown[cat] = { total: 0, percentage: 0, avg30Day: 0, transactionCount: 0 };
      }
      breakdown[cat].total += Math.abs(t.amount);
      breakdown[cat].transactionCount += 1;
    }

    for (const cat in breakdown) {
      breakdown[cat].percentage =
        totalSpent > 0 ? (breakdown[cat].total / totalSpent) * 100 : 0;
      breakdown[cat].avg30Day = avg30Map[cat] ?? breakdown[cat].total;
    }

    return breakdown;
  }

  // ── Risk Score (0–100) ──────────────────────
  private calcRiskScore(
    balance: number,
    projectedSpend: number,
    income: number,
    anomalyCount: number,
    unaffordableBills: number
  ): number {
    let score = 0;
    if (income > 0) {
      const burnRatio = projectedSpend / income;
      score += Math.min(burnRatio * 50, 50); // up to 50 pts
    }
    if (balance < 0) score += 30;
    score += Math.min(anomalyCount * 5, 15);  // up to 15 pts
    score += Math.min(unaffordableBills * 5, 5); // up to 5 pts
    return Math.round(Math.min(score, 100));
  }
}

// ─────────────────────────────────────────────
// ANOMALY DETECTION (standalone export)
// ─────────────────────────────────────────────

export function detectAnomalies(
  expenses: Transaction[],
  categoryBreakdown: Record<string, CategoryStat>
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const t of expenses) {
    const cat = t.category ?? "Other";
    const stat = categoryBreakdown[cat];
    if (!stat || stat.avg30Day === 0) continue;

    const avg = stat.avg30Day / (stat.transactionCount || 1);
    const amount = Math.abs(t.amount);
    const deviation = ((amount - avg) / avg) * 100;

    if (deviation > 200) {
      anomalies.push({
        transactionId: t.id ?? "",
        description: t.description ?? t.category ?? "Unknown",
        amount,
        category: cat,
        deviationPercent: Math.round(deviation),
      });
    }
  }

  return anomalies;
}

// Attach to class too (DRY convenience)
FinanceEngine.prototype["detectAnomalies"] = function (
  expenses: Transaction[],
  breakdown: Record<string, CategoryStat>
) {
  return detectAnomalies(expenses, breakdown);
};

// ─────────────────────────────────────────────
// BILL SHOCK DETECTION (inside class for private use; exported separately too)
// ─────────────────────────────────────────────

// Hardcoded recurring bills — replace/extend with DB lookup if you store subscriptions
const RECURRING_BILLS: { name: string; amount: number; dueDayOfMonth: number }[] = [
  { name: "Netflix", amount: 649, dueDayOfMonth: 5 },
  { name: "Hotstar", amount: 299, dueDayOfMonth: 10 },
  { name: "Spotify", amount: 119, dueDayOfMonth: 15 },
  // Add more here
];

export function detectBillShocks(
  currentBalance: number,
  daysRemaining: number
): BillShock[] {
  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = getDaysInMonth(today);

  return RECURRING_BILLS
    .map((bill) => {
      let daysUntilDue = bill.dueDayOfMonth - currentDay;
      if (daysUntilDue < 0) daysUntilDue += daysInMonth; // already passed → next month
      const balanceAfter = currentBalance - bill.amount;
      return {
        name: bill.name,
        amount: bill.amount,
        dueInDays: daysUntilDue,
        canAfford: balanceAfter >= 0,
        balanceAfter,
      };
    })
    .filter((b) => b.dueInDays <= daysRemaining + 5); // only upcoming ones
}

// Attach to class
FinanceEngine.prototype["detectBillShocks"] = function (
  balance: number,
  daysRemaining: number
) {
  return detectBillShocks(balance, daysRemaining);
};

// ─────────────────────────────────────────────
// PROMPT ARCHITECT
// ─────────────────────────────────────────────

export function buildSystemPrompt(truth: GroundTruth): string {
  const anomalySummary =
    truth.anomalies.length > 0
      ? truth.anomalies
          .map(
            (a) =>
              `  • "${a.description}" (₹${a.amount.toFixed(0)}) in ${a.category} — ${a.deviationPercent}% above your normal`
          )
          .join("\n")
      : "  None detected.";

  const billShockSummary =
    truth.billShocks.length > 0
      ? truth.billShocks
          .map(
            (b) =>
              `  • ${b.name}: ₹${b.amount} due in ${b.dueInDays} days — ${
                b.canAfford ? "✅ affordable" : `❌ shortfall of ₹${Math.abs(b.balanceAfter).toFixed(0)}`
              }`
          )
          .join("\n")
      : "  No upcoming bill shocks.";

  const topCategories = Object.entries(truth.categoryBreakdown)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([cat, s]) => `  • ${cat}: ₹${s.total.toFixed(0)} (${s.percentage.toFixed(1)}%)`)
    .join("\n");

  return `
=== FINEX AI — IMMUTABLE FINANCIAL GROUND TRUTH ===
[Snapshot: ${truth.snapshotDate}]

You are Finex AI — a "Kind but Brutal" financial coach.
You are NOT a calculator. The numbers below are 100% accurate.
You are FORBIDDEN from inventing, estimating, or rounding any financial figures.
Your ONLY job: translate these facts into warm, direct, no-BS coaching.

── FINANCIAL FACTS ──────────────────────────────────
Balance Today:        ₹${truth.currentBalance.toFixed(2)}
Spent This Month:     ₹${truth.totalSpent.toFixed(2)}
Income This Month:    ₹${truth.totalIncome.toFixed(2)}
Daily Average Spend:  ₹${truth.dailyAverage.toFixed(2)}
Days Left in Month:   ${truth.daysRemainingInMonth}
Projected Month Spend:₹${truth.projectedMonthlySpend.toFixed(2)}

── TOP SPENDING CATEGORIES ──────────────────────────
${topCategories}

── ANOMALIES (unusual transactions) ─────────────────
${anomalySummary}

── UPCOMING BILL SHOCKS ─────────────────────────────
${billShockSummary}

── RISK ASSESSMENT ──────────────────────────────────
Risk Score: ${truth.riskScore}/100 → ${truth.riskLabel}
${truth.riskLabel === "DANGER" ? "⚠️  This person is in financial danger. Be kind but do NOT sugarcoat." : ""}
${truth.riskLabel === "CAUTION" ? "⚡ Caution zone. Encourage mindfulness without panic." : ""}
${truth.riskLabel === "SAFE" ? "✅ Good shape. Reinforce positive habits." : ""}

── YOUR COACHING RULES ───────────────────────────────
1. Use ONLY the numbers above. Never invent figures.
2. Be warm, human, and direct — like a best friend who happens to be a CFO.
3. Keep responses under 120 words unless the user asks for detail.
4. End every response with ONE specific, actionable tip.
5. If the user asks "Can I afford X?", calculate: Balance (₹${truth.currentBalance.toFixed(2)}) minus X, then factor in upcoming bills.
===================================================
`.trim();
}