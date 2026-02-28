/**
 * ai.ts — FINEX-AI (Hybrid Architecture v3.1 — Logic Fixed)
 * ─────────────────────────────────────────────────────────────────────────────
 * FIXES IN v3.1:
 *   • EMI/installment questions now correctly routed to affordability engine
 *     (was being intercepted by 'shopping' keyword match first)
 *   • EMI affordability engine: calculates monthly payment impact, not just
 *     one-time purchase cost
 *   • Risk score fix: savings bonus capped so it can't mask a genuinely
 *     dangerous spending pattern (e.g. near-zero balance)
 *   • classifyQuestion now catches EMI/loan/installment as 'affordability'
 *   • computeAnswer() shopping branch skips questions that are actually
 *     affordability questions to avoid wrong routing
 *   • financeEngine.ts consolidated — that file used negative amounts for
 *     expenses which conflicted with SimpleDB (positive amounts). All logic
 *     now lives here in ai.ts using the correct positive-amount convention.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { llamaService, type DownloadProgress, type GenerateOptions } from './llama-wasm';
import { db } from './db';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AIModelState = {
  status: 'idle' | 'downloading' | 'initializing' | 'ready' | 'error';
  progress: number;
  error?: string;
};

interface ManualBill {
  id: string;
  name: string;
  amount: number;
  cycle: 'monthly' | 'yearly' | 'weekly';
  category: string;
}

interface CategoryStat {
  total: number;
  percentage: number;
  avg30Day: number;
  transactionCount: number;
}

interface Anomaly {
  transactionId: string | number;
  description: string;
  amount: number;
  category: string;
  deviationPercent: number;
}

interface BillShock {
  name: string;
  amount: number;
  dueInDays: number;
  canAfford: boolean;
  balanceAfter: number;
  spendUntilDue?: number;
}

export interface WeekendVsWeekday {
  weekendTotal: number;
  weekdayTotal: number;
  isHigh: boolean;
  message: string;
}

export interface BudgetProgress {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'ok' | 'warning' | 'danger';
}

export interface GroundTruth {
  totalSpent: number;
  totalSavings: number;
  savingsGrowthPct: number | null;
  savingsRate: number;
  totalIncome: number;
  currentBalance: number;
  userBalance: number | null;
  dailyAverage: number;
  daysRemainingInMonth: number;
  projectedMonthlySpend: number;
  categoryBreakdown: Record<string, CategoryStat>;
  anomalies: Anomaly[];
  billShocks: BillShock[];
  billShockAlert: string | null;
  truthSerumMessages: string[];
  riskScore: number;
  riskLabel: 'SAFE' | 'CAUTION' | 'DANGER';
  healthLabel: 'Excellent' | 'Good' | 'Needs Work' | 'Critical';
  lastMonthDailyAverage: number;
  weekendVsWeekday: WeekendVsWeekday | null;
  budgetProgress: BudgetProgress[];
  snapshotDate: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET STORAGE
// ─────────────────────────────────────────────────────────────────────────────

const BUDGET_STORAGE_KEY = 'zenith-budgets';

export const DEFAULT_BUDGETS: Record<string, number> = {
  Food:          6000,
  Transport:     3000,
  Entertainment: 5000,
  Health:        5000,
  Shopping:      8000,
  Utilities:     4000,
  Education:     5000,
  Other:         5000,
};

export function getBudgets(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BUDGETS };
    return { ...DEFAULT_BUDGETS, ...JSON.parse(raw) as Record<string, number> };
  } catch {
    return { ...DEFAULT_BUDGETS };
  }
}

export function setBudget(category: string, amount: number): void {
  const current = getBudgets();
  current[category] = amount;
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(current));
}

export function setAllBudgets(budgets: Record<string, number>): void {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
}

export function resetBudgets(): void {
  localStorage.removeItem(BUDGET_STORAGE_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7-DAY SPENDING TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface DailySpending {
  date: string;
  label: string;
  dayLabel: string;
  amount: number;
  categories: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION COMPLEXITY CLASSIFIER
// FIX: EMI/loan/installment patterns added to affordability BEFORE shopping
//      keywords can intercept them in computeAnswer()
// ─────────────────────────────────────────────────────────────────────────────

type QuestionComplexity = 'simple' | 'complex' | 'affordability';

function classifyQuestion(q: string): QuestionComplexity {
  const lower = q.toLowerCase();

  const affordabilityPatterns = [
    /can i (buy|afford|get|purchase|order)/,
    /should i (buy|afford|get|purchase|order)/,
    /is it (ok|okay|fine|safe|good) to (buy|spend|purchase)/,
    /afford/,
    /worth buying/,
    /good time to buy/,
    /have enough (for|to buy)/,
    // FIX: EMI / loan / installment patterns — must be caught here
    /\bemi\b/,
    /installment/,
    /\bloan\b/,
    /on emi/,
    /in emi/,
    /pay.*monthly/,
    /monthly.*pay/,
    /equated monthly/,
  ];
  if (affordabilityPatterns.some(p => p.test(lower))) return 'affordability';

  const complexPatterns = [
    /how (long|many months|many days) (will|until|to)/,
    /when (can|will|should) i/,
    /if i (save|spend|cut|stop|reduce)/,
    /what (happens|would happen) if/,
    /plan|budget|strategy|goal/,
    /compare|versus|vs\b/,
    /next (month|week|year)/,
    /by (end of|december|january|february|march|april|may|june|july|august|september|october|november)/,
    /reach|achieve|target|milestone/,
    /invest|mutual fund|stock|fd|fixed deposit|rd|recurring deposit/,
    /improve|increase|boost (my )?savings/,
    /what should i do/,
    /advice|suggest|recommend/,
    /am i on track/,
    /breakdown|detail|explain/,
  ];
  if (complexPatterns.some(p => p.test(lower))) return 'complex';

  return 'simple';
}

// ─────────────────────────────────────────────────────────────────────────────
// AMOUNT EXTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

function extractAmount(text: string): number | null {
  const lower = text.toLowerCase().replace(/,/g, '');

  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*lakh/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;

  const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;

  const rupeeMatch = lower.match(/(?:₹|rs\.?\s*|inr\s*)(\d+(?:\.\d+)?)/);
  if (rupeeMatch) return parseFloat(rupeeMatch[1]);

  const numbers = lower.match(/\d+(?:\.\d+)?/g);
  if (numbers) {
    const vals = numbers.map(Number).filter(n => n >= 100);
    if (vals.length > 0) return Math.max(...vals);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMI CALCULATOR
// FIX: New helper — calculates monthly EMI payment for affordability checks
// ─────────────────────────────────────────────────────────────────────────────

function calculateEMI(principal: number, annualRatePercent: number, tenureMonths: number): number {
  if (annualRatePercent === 0) return principal / tenureMonths;
  const r = annualRatePercent / 12 / 100;
  return Math.round(principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1));
}

function extractEMIParams(text: string): { tenure: number; rate: number } {
  const lower = text.toLowerCase();

  // Extract tenure: "12 months", "2 years", "6 months EMI"
  let tenure = 12; // default 12 months
  const monthMatch = lower.match(/(\d+)\s*(?:month|mo\b)/);
  const yearMatch  = lower.match(/(\d+)\s*year/);
  if (monthMatch) tenure = parseInt(monthMatch[1]);
  else if (yearMatch) tenure = parseInt(yearMatch[1]) * 12;

  // Extract rate: "at 14%", "16% interest", "0% emi"
  let rate = 14; // default 14% p.a. (typical consumer loan India)
  const rateMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/);
  const zeroEMI   = /zero.?emi|0.?%|no.?interest|interest.?free/i.test(lower);
  if (zeroEMI) rate = 0;
  else if (rateMatch) rate = parseFloat(rateMatch[1]);

  return { tenure, rate };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

function getManualBills(): ManualBill[] {
  try {
    return JSON.parse(localStorage.getItem('zenith-manual-bills') ?? '[]');
  } catch {
    return [];
  }
}

function toMonthly(amount: number, cycle: string): number {
  if (cycle === 'weekly') return amount * 4.33;
  if (cycle === 'yearly') return amount / 12;
  return amount;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKEND vs WEEKDAY ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

function computeWeekendVsWeekday(sevenDayData: DailySpending[]): WeekendVsWeekday {
  let weekendTotal = 0, weekdayTotal = 0, weekendDays = 0, weekdayDays = 0;

  for (const d of sevenDayData) {
    const dow = new Date(d.date).getDay();
    const isWeekend = dow === 0 || dow === 6;
    if (isWeekend) { weekendTotal += d.amount; weekendDays++; }
    else           { weekdayTotal += d.amount; weekdayDays++; }
  }

  const avgWeekend = weekendDays > 0 ? weekendTotal / weekendDays : 0;
  const avgWeekday = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0;
  const isHigh     = avgWeekend > avgWeekday * 1.5 && weekendTotal > 500;

  let message = '';
  if (isHigh) {
    const pct = avgWeekday > 0 ? Math.round(((avgWeekend - avgWeekday) / avgWeekday) * 100) : 0;
    message = `Your weekend spending (₹${weekendTotal.toLocaleString('en-IN')}) is ${pct}% higher per day than weekdays.`;
  } else if (weekendTotal > 0 || weekdayTotal > 0) {
    message = `Weekend spending (₹${weekendTotal.toLocaleString('en-IN')}) is in line with your weekday pace. Good balance!`;
  }

  return { weekendTotal, weekdayTotal, isHigh, message };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGET PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

function computeBudgetProgress(
  categoryBreakdown: Record<string, CategoryStat>
): BudgetProgress[] {
  const budgets = getBudgets();
  return Object.entries(categoryBreakdown)
    .filter(([cat]) => cat !== 'Savings' && budgets[cat] !== undefined)
    .map(([category, stat]) => {
      const budget      = budgets[category];
      const spent       = stat.total;
      const remaining   = budget - spent;
      const percentUsed = Math.round((spent / budget) * 100);
      const status: BudgetProgress['status'] =
        percentUsed >= 100 ? 'danger' : percentUsed >= 80 ? 'warning' : 'ok';
      return { category, budget, spent, remaining, percentUsed, status };
    })
    .filter(b => b.spent > 0)
    .sort((a, b) => b.percentUsed - a.percentUsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE ENGINE — buildGroundTruth
// ─────────────────────────────────────────────────────────────────────────────

export async function buildGroundTruth(): Promise<GroundTruth> {
  const now           = new Date();
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const allTx        = await db.getAll();
  const thisMonthTx  = allTx.filter(t => new Date(t.date) >= monthStart);
  const last30Tx     = allTx.filter(t => new Date(t.date) >= thirtyDaysAgo);

  const expenses     = thisMonthTx.filter(t => t.category !== 'Savings');
  const savingsTx    = thisMonthTx.filter(t => t.category === 'Savings');

  const totalSpent   = expenses.reduce((s, t) => s + t.amount, 0);
  const totalSavings = savingsTx.reduce((s, t) => s + t.amount, 0);
  const totalIncome  = 0;

  const dayOfMonth           = now.getDate();
  const daysInMonth          = getDaysInMonth(now);
  const daysRemainingInMonth = daysInMonth - dayOfMonth;
  const dailyAverage         = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const projectedMonthlySpend = dailyAverage * daysInMonth;

  const totalActivity = totalSpent + totalSavings;
  const savingsRate   = totalActivity > 0 ? (totalSavings / totalActivity) * 100 : 0;

  // Last month
  const lastMonthNum  = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthTx   = allTx.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === lastMonthNum && d.getFullYear() === lastMonthYear;
  });
  const lastMonthSavings = lastMonthTx.filter(t => t.category === 'Savings').reduce((s, t) => s + t.amount, 0);
  const lastMonthSpent   = lastMonthTx.filter(t => t.category !== 'Savings').reduce((s, t) => s + t.amount, 0);
  const daysInLastMonth  = new Date(lastMonthYear, lastMonthNum + 1, 0).getDate();
  const lastMonthDailyAverage = lastMonthSpent > 0 ? lastMonthSpent / daysInLastMonth : dailyAverage;

  const savingsGrowthPct =
    lastMonthSavings > 0
      ? parseFloat((((totalSavings - lastMonthSavings) / lastMonthSavings) * 100).toFixed(1))
      : null;

  // 30-day category averages
  const avg30Map: Record<string, { total: number; count: number }> = {};
  for (const t of last30Tx.filter(t => t.category !== 'Savings')) {
    const cat = t.category ?? 'Other';
    if (!avg30Map[cat]) avg30Map[cat] = { total: 0, count: 0 };
    avg30Map[cat].total += t.amount;
    avg30Map[cat].count += 1;
  }

  // Category breakdown
  const categoryBreakdown: Record<string, CategoryStat> = {};
  for (const t of expenses) {
    const cat = t.category ?? 'Other';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { total: 0, percentage: 0, avg30Day: 0, transactionCount: 0 };
    }
    categoryBreakdown[cat].total += t.amount;
    categoryBreakdown[cat].transactionCount += 1;
  }
  for (const cat in categoryBreakdown) {
    categoryBreakdown[cat].percentage =
      totalSpent > 0 ? (categoryBreakdown[cat].total / totalSpent) * 100 : 0;
    categoryBreakdown[cat].avg30Day = avg30Map[cat]?.total ?? categoryBreakdown[cat].total;
  }

  // Anomaly detection
  const anomalies: Anomaly[] = [];
  for (const t of expenses) {
    const cat  = t.category ?? 'Other';
    const stat = categoryBreakdown[cat];
    if (!stat || stat.transactionCount === 0) continue;
    const avgPerTx  = stat.avg30Day / stat.transactionCount;
    if (avgPerTx === 0) continue;
    const deviation = ((t.amount - avgPerTx) / avgPerTx) * 100;
    if (deviation > 200) {
      anomalies.push({
        transactionId:    (t as any).id ?? '',
        description:      t.item ?? t.category ?? 'Unknown',
        amount:           t.amount,
        category:         cat,
        deviationPercent: Math.round(deviation),
      });
    }
  }

  // Bill shocks
  const manualBills  = getManualBills();
  const userBalance  = db.getBalance();
  const billShocks: BillShock[] = manualBills
    .map(bill => {
      const dueDay        = 5;
      let daysUntilDue    = dueDay - dayOfMonth;
      if (daysUntilDue < 0) daysUntilDue += daysInMonth;
      const monthlyAmt    = toMonthly(bill.amount, bill.cycle);
      const spendUntilDue = dailyAverage * daysUntilDue;
      const projectedBalanceAtDue = userBalance !== null
        ? userBalance - spendUntilDue - monthlyAmt
        : null;
      const canAfford = projectedBalanceAtDue !== null ? projectedBalanceAtDue >= 0 : true;
      return {
        name: bill.name, amount: monthlyAmt, dueInDays: daysUntilDue,
        canAfford, balanceAfter: projectedBalanceAtDue ?? 0,
        spendUntilDue: Math.round(spendUntilDue),
      };
    })
    .filter(b => b.dueInDays <= daysRemainingInMonth + 5);

  // ─────────────────────────────────────────────────────────────────────────
  // RISK SCORE — FIX v3.1
  // Old code: savingsBonus could reduce risk to near-zero even when balance
  // was critically low. A 98% savings rate with ₹500 balance is still risky.
  //
  // New approach:
  //   Base risk = spending pace vs last-30-day average (max 40pts)
  //             + anomalies (max 15pts)
  //             + unaffordable bills (max 5pts)
  //   Balance penalty: if balance < 2x monthly spend → +15 to +30 pts
  //   Savings REWARD: capped at 20pts max (not enough to mask balance risk)
  // ─────────────────────────────────────────────────────────────────────────
  let riskScore = 0;
  const last30Spend = last30Tx
    .filter(t => t.category !== 'Savings')
    .reduce((s, t) => s + t.amount, 0);
  const budgetProxy = last30Spend > 0 ? last30Spend : 10000;
  riskScore += Math.min((projectedMonthlySpend / budgetProxy) * 40, 40);
  riskScore += Math.min(anomalies.length * 5, 15);
  riskScore += Math.min(billShocks.filter(b => !b.canAfford).length * 5, 5);

  // Balance penalty — critical fix: low balance raises risk regardless of savings rate
  if (userBalance !== null) {
    const monthlySpendEstimate = dailyAverage * 30;
    if (userBalance < monthlySpendEstimate * 0.5)  riskScore += 30;
    else if (userBalance < monthlySpendEstimate)   riskScore += 15;
    else if (userBalance < monthlySpendEstimate * 2) riskScore += 5;
  }

  // Savings reward — capped at 20 (was 25, but more importantly: now capped
  // so it cannot mask a genuine balance/anomaly risk)
  const savingsBonus = Math.min(Math.floor(savingsRate / 10) * 4, 20);
  riskScore = Math.round(Math.max(0, Math.min(riskScore - savingsBonus, 100)));

  const riskLabel: GroundTruth['riskLabel'] =
    riskScore >= 70 ? 'DANGER' : riskScore >= 40 ? 'CAUTION' : 'SAFE';

  const healthLabel: GroundTruth['healthLabel'] =
    riskScore <= 20 && savingsRate >= 20 ? 'Excellent' :
    riskScore <= 40 && savingsRate >= 10 ? 'Good' :
    riskScore <= 65                      ? 'Needs Work' :
                                           'Critical';

  const worstShock   = billShocks.find(b => !b.canAfford);
  const billShockAlert = worstShock && userBalance !== null
    ? `Hey! You have a ₹${worstShock.amount.toFixed(0)} ${worstShock.name} bill in ${worstShock.dueInDays} days. At your current spending pace (₹${dailyAverage.toFixed(0)}/day), you'll spend ₹${worstShock.spendUntilDue} before it hits — leaving you ₹${Math.abs(worstShock.balanceAfter).toFixed(0)} short. Maybe skip a splurge today?`
    : null;

  const truthSerumMessages = anomalies.map(a =>
    `Was that ₹${a.amount.toFixed(0)} ${a.description} an emergency or a 'sad-purchase'? It's ${a.deviationPercent}% above your normal ${a.category} spend.`
  );

  const sevenDayData     = await get7DaySpending();
  const weekendVsWeekday = computeWeekendVsWeekday(sevenDayData);
  const budgetProgress   = computeBudgetProgress(categoryBreakdown);

  return {
    totalSpent, totalSavings, savingsGrowthPct, savingsRate,
    totalIncome, currentBalance: userBalance ?? 0, dailyAverage,
    daysRemainingInMonth, projectedMonthlySpend,
    categoryBreakdown, anomalies, billShocks,
    riskScore, riskLabel, healthLabel,
    billShockAlert, truthSerumMessages,
    userBalance, lastMonthDailyAverage,
    weekendVsWeekday, budgetProgress,
    snapshotDate: now.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AFFORDABILITY ENGINE — v3.1 with EMI support
// FIX: Now detects EMI questions and calculates monthly payment impact
// ─────────────────────────────────────────────────────────────────────────────

async function computeAffordability(question: string): Promise<string> {
  const truth            = await buildGroundTruth();
  const itemAmount       = extractAmount(question);
  const manualBills      = getManualBills();
  const totalMonthlyBills = manualBills.reduce((s, b) => s + toMonthly(b.amount, b.cycle), 0);

  // ── Detect if this is an EMI question ──────────────────────────────────
  const lower      = question.toLowerCase();
  const isEMI      = /\bemi\b|installment|on emi|in emi|equated monthly/.test(lower);
  const emiParams  = isEMI ? extractEMIParams(question) : null;

  // ── No amount provided ─────────────────────────────────────────────────
  if (itemAmount === null) {
    if (truth.userBalance === null) {
      return `To check affordability, I need your current balance. Tap the balance icon on the dashboard to set it! 💡`;
    }
    const projectedSpendRemaining = (truth.lastMonthDailyAverage > 0 ? truth.lastMonthDailyAverage : truth.dailyAverage) * truth.daysRemainingInMonth;
    const safeToSpend = truth.userBalance - projectedSpendRemaining - totalMonthlyBills;
    return `Based on your balance of ₹${truth.userBalance.toFixed(0)}: you'll likely spend ~₹${projectedSpendRemaining.toFixed(0)} more this month + ₹${totalMonthlyBills.toFixed(0)} in bills. That leaves ~₹${safeToSpend.toFixed(0)} safely. Tell me the price and I'll give you a precise yes/no!`;
  }

  const balance             = truth.userBalance;
  const dailyRate           = truth.lastMonthDailyAverage > 0 ? truth.lastMonthDailyAverage : truth.dailyAverage;
  const projectedRemainingSpend = dailyRate * truth.daysRemainingInMonth;
  const upcomingBillsTotal  = truth.billShocks.reduce((s, b) => s + b.amount, 0);
  const committedOutgo      = projectedRemainingSpend + upcomingBillsTotal;

  // ── EMI PATH ───────────────────────────────────────────────────────────
  if (isEMI && emiParams) {
    const { tenure, rate } = emiParams;
    const emiAmount        = calculateEMI(itemAmount, rate, tenure);
    const totalCost        = emiAmount * tenure;
    const totalInterest    = totalCost - itemAmount;
    const newMonthlyCommit = emiAmount + totalMonthlyBills;

    // Can they afford the FIRST EMI right now?
    const canAffordFirstEMI = balance !== null
      ? (balance - committedOutgo - emiAmount) >= 0
      : null;

    // Is the monthly EMI sustainable vs their savings capacity?
    const freeCashPerMonth    = truth.totalSavings > 0 ? truth.totalSavings : Math.max(0, dailyRate * 30 * 0.3);
    const emiToSavingsRatio   = freeCashPerMonth > 0 ? (emiAmount / freeCashPerMonth) * 100 : 100;
    const isSustainable       = emiToSavingsRatio <= 50; // EMI < 50% of monthly savings = sustainable

    let response = `📱 ₹${itemAmount.toLocaleString('en-IN')} on EMI — here's the full picture:\n\n`;
    response += `EMI:                    ₹${emiAmount.toLocaleString('en-IN')}/month\n`;
    response += `Tenure:                 ${tenure} months\n`;
    if (rate > 0) {
      response += `Interest rate:          ${rate}% p.a.\n`;
      response += `Total cost (with interest): ₹${totalCost.toLocaleString('en-IN')} (you pay ₹${totalInterest.toLocaleString('en-IN')} extra)\n`;
    } else {
      response += `Interest:               0% (no extra cost 🎉)\n`;
      response += `Total cost:             ₹${itemAmount.toLocaleString('en-IN')}\n`;
    }
    response += `──────────────────────────────────────\n`;

    if (balance !== null) {
      response += `Your balance:           ₹${balance.toLocaleString('en-IN')}\n`;
      response += `Est. spend this month: −₹${projectedRemainingSpend.toFixed(0)}\n`;
      if (upcomingBillsTotal > 0) response += `Upcoming bills:        −₹${upcomingBillsTotal.toFixed(0)}\n`;
      response += `First EMI:             −₹${emiAmount.toLocaleString('en-IN')}\n`;
      response += `──────────────────────────────────────\n`;
      const afterFirstEMI = balance - committedOutgo - emiAmount;
      response += `Left after first EMI:   ₹${afterFirstEMI.toFixed(0)}\n\n`;

      if (!canAffordFirstEMI) {
        response += `⚠️ First EMI looks tight — you'd be ₹${Math.abs(afterFirstEMI).toFixed(0)} short this month.\n\n`;
      }
    }

    // Sustainability verdict
    if (isSustainable && (canAffordFirstEMI !== false)) {
      response += `✅ This EMI (₹${emiAmount.toLocaleString('en-IN')}/mo) uses ${emiToSavingsRatio.toFixed(0)}% of your monthly savings capacity — manageable!\n`;
    } else if (emiToSavingsRatio > 80) {
      response += `⚠️ This EMI would eat ${emiToSavingsRatio.toFixed(0)}% of your monthly savings — that's a heavy commitment for ${tenure} months. Are you sure?\n`;
    } else {
      response += `🟡 EMI is doable but will reduce your savings buffer for ${tenure} months. Plan accordingly.\n`;
    }

    // Tip: compare to saving up
    const monthsToSaveUp = Math.ceil(itemAmount / (truth.totalSavings > 0 ? truth.totalSavings : dailyRate * 30 * 0.2));
    if (rate > 0 && monthsToSaveUp <= tenure) {
      response += `\n💡 Tip: You could save up in ~${monthsToSaveUp} months and pay cash (saving ₹${totalInterest.toLocaleString('en-IN')} in interest). Worth the wait?`;
    } else if (rate === 0) {
      response += `\n🎯 0% EMI? Go for it — no interest cost, just log each payment as a transaction to stay on track!`;
    } else {
      response += `\n💡 Tip: Pay a larger down payment to reduce tenure and interest if possible.`;
    }

    return response;
  }

  // ── OUTRIGHT PURCHASE PATH (unchanged from v3.0) ───────────────────────
  const canAffordNow = balance !== null ? (balance - committedOutgo - itemAmount) >= 0 : null;

  const monthlySavingsCapacity = truth.totalSavings > 0
    ? truth.totalSavings
    : Math.max(0, (balance ?? 0) - projectedRemainingSpend - upcomingBillsTotal) * 0.3;
  const monthsNeeded = monthlySavingsCapacity > 0
    ? Math.ceil(itemAmount / monthlySavingsCapacity)
    : null;

  const itemLabel = `₹${itemAmount.toLocaleString('en-IN')} purchase`;

  if (balance === null) {
    const netMonthly = truth.totalSavings;
    if (netMonthly >= itemAmount) {
      return `💡 You're saving ₹${netMonthly.toFixed(0)}/month — this ${itemLabel} is doable in one go! Set your balance in the dashboard for a precise answer. 🎯`;
    } else if (netMonthly > 0 && monthsNeeded !== null) {
      return `📊 This ${itemLabel} would take ~${monthsNeeded} month${monthsNeeded > 1 ? 's' : ''} of savings at your current pace (₹${netMonthly.toFixed(0)}/mo). Set your balance for a precise check! 💡`;
    } else {
      return `To properly check this, I need your balance. Set it in the dashboard! Based on spending data: you spend ₹${truth.totalSpent.toFixed(0)} this month and saved ₹${truth.totalSavings.toFixed(0)}.`;
    }
  }

  const remaining = balance - committedOutgo - itemAmount;
  const verdict   = canAffordNow ? '✅ Yes, you can afford it' : '⚠️ Not comfortably right now';

  let response = `${verdict} — here's the math:\n\n`;
  response += `Balance:                  ₹${balance.toLocaleString('en-IN')}\n`;
  response += `Est. spend remaining:    −₹${projectedRemainingSpend.toFixed(0)} (last month's pace)\n`;
  if (upcomingBillsTotal > 0) response += `Upcoming bills:          −₹${upcomingBillsTotal.toFixed(0)}\n`;
  response += `This ${itemLabel}:  −₹${itemAmount.toLocaleString('en-IN')}\n`;
  response += `──────────────────────────\n`;
  response += `Left after:               ₹${remaining.toFixed(0)}`;

  if (canAffordNow && remaining < 2000) {
    response += `\n\n⚡ That's cutting it close. Make sure you have an emergency buffer.`;
  } else if (!canAffordNow) {
    if (monthsNeeded !== null && monthsNeeded <= 6) {
      response += `\n\n📅 At your savings rate (₹${truth.totalSavings.toFixed(0)}/mo), you can have this in ${monthsNeeded} month${monthsNeeded > 1 ? 's' : ''}. Worth the wait?`;
    } else {
      response += `\n\n💡 Consider waiting till next month or splitting the cost if possible.`;
    }
  } else {
    response += `\n\n🎯 Go for it — just log it as a transaction to stay on track!`;
  }

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT ARCHITECT
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(truth: GroundTruth, isComplex: boolean = false): string {
  const anomalySummary =
    truth.anomalies.length > 0
      ? truth.anomalies.map(a => `• "${a.description}" ₹${a.amount.toFixed(0)} in ${a.category} — ${a.deviationPercent}% above normal`).join('\n')
      : 'None detected.';

  const billShockSummary =
    truth.billShocks.length > 0
      ? truth.billShocks.map(b => `• ${b.name}: ₹${b.amount.toFixed(0)}/mo — due in ~${b.dueInDays}d — ${b.canAfford ? '✅ affordable' : `❌ shortfall ₹${Math.abs(b.balanceAfter).toFixed(0)}`}`).join('\n')
      : 'No upcoming bill shocks.';

  const topCategories = Object.entries(truth.categoryBreakdown)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([cat, s]) => `• ${cat}: ₹${s.total.toFixed(0)} (${s.percentage.toFixed(1)}% of expenses)`)
    .join('\n');

  const savingsGrowthStr =
    truth.savingsGrowthPct !== null
      ? `${truth.savingsGrowthPct >= 0 ? '📈 Up' : '📉 Down'} ${Math.abs(truth.savingsGrowthPct)}% vs last month`
      : 'First month of tracking';

  const riskNote =
    truth.riskLabel === 'DANGER'  ? '⚠️  Spending danger zone. Be kind but brutally honest.' :
    truth.riskLabel === 'CAUTION' ? '⚡ Caution zone — encourage mindfulness, no panic.' :
                                    '✅ Good control — reinforce positive habits.';

  const wordLimit = isComplex ? 200 : 80;

  return `You are Finex AI — a "Kind but Brutal" financial coach.
You are NOT a calculator. All numbers below are 100% accurate real data.
You are STRICTLY FORBIDDEN from inventing, estimating, or rounding any financial figure.

═══ IMMUTABLE FINANCIAL GROUND TRUTH ══════════════════════
Snapshot: ${truth.snapshotDate}

Spent This Month:       ₹${truth.totalSpent.toFixed(2)}
Saved This Month:       ₹${truth.totalSavings.toFixed(2)}
Savings Allocation:     ${truth.savingsRate.toFixed(1)}%
Savings Trend:          ${savingsGrowthStr}
Balance Today:          ₹${truth.currentBalance.toFixed(2)}
Daily Avg Spend:        ₹${truth.dailyAverage.toFixed(2)}
Days Left in Month:     ${truth.daysRemainingInMonth}
Projected Month Spend:  ₹${truth.projectedMonthlySpend.toFixed(2)}

── Top Expense Categories ────────────────────────────────
${topCategories || '• No expense data yet.'}

── Anomalies ─────────────────────────────────────────────
${anomalySummary}

── Upcoming Bill Shocks ──────────────────────────────────
${billShockSummary}

── Financial Health ──────────────────────────────────────
Health:     ${truth.healthLabel}
Risk Score: ${truth.riskScore}/100 → ${truth.riskLabel}
${riskNote}

── Savings Benchmarks ────────────────────────────────────
• <10% savings = needs improvement
• 10–20% = good discipline
• >20% = excellent wealth-building
══════════════════════════════════════════════════════════

RULES:
1. Use ONLY the numbers above. Never invent figures.
2. Savings (₹${truth.totalSavings.toFixed(0)}) is a POSITIVE achievement — celebrate it.
3. Under ${wordLimit} words unless user asks for detail.
4. End every response with ONE specific actionable tip.
5. Tone: warm, direct, like a best-friend CFO.
6. For planning questions: think step by step using the data above.
7. If asked about goals/timelines: use daily average and savings rate to project realistically.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE ANSWER — deterministic keyword matching
// FIX v3.1: Shopping branch now checks it's NOT an affordability question
//           before returning shopping budget info, so EMI questions for
//           phones/gadgets are not intercepted here.
// ─────────────────────────────────────────────────────────────────────────────

async function computeAnswer(question: string): Promise<string> {
  const snap         = await db.getAISnapshot();
  const manualBills  = getManualBills();
  const autoDetected = snap.recurring;
  const q            = question.toLowerCase();

  if (
    q.includes('how much have i saved') || q.includes('total savings') ||
    q.includes('savings rate') || q.includes('is my savings') ||
    q.includes('saved this month') || q.includes('sip') ||
    q.includes('investment') || q.includes('emergency fund') ||
    (q.includes('sav') && (q.includes('how') || q.includes('much') || q.includes('rate') || q.includes('health')))
  ) {
    const truth = await buildGroundTruth();
    const growthStr =
      truth.savingsGrowthPct !== null
        ? `${truth.savingsGrowthPct >= 0 ? '📈 Up' : '📉 Down'} ${Math.abs(truth.savingsGrowthPct)}% vs last month.`
        : 'First month of tracking — keep it up!';
    const rateAssessment =
      truth.savingsRate >= 20 ? "🌟 Excellent! You're in wealth-building mode." :
      truth.savingsRate >= 10 ? '👍 Good discipline. Aim for 20% to accelerate.' :
      truth.savingsRate > 0   ? '⚡ A start, but aim for at least 10% of activity.' :
                                '❌ No savings recorded yet this month.';
    return `💰 You've saved ₹${truth.totalSavings.toFixed(0)} this month — ${truth.savingsRate.toFixed(1)}% of all financial activity. ${growthStr} ${rateAssessment}`;
  }

  if (
    q.includes('subscri') || q.includes('netflix') ||
    q.includes('spotify') || q.includes('hotstar') || q.includes('gym') ||
    q.includes('membership') || q.includes('ott') || q.includes('prime')
  ) {
    const allBills = [
      ...manualBills.map(b => `${b.name} ₹${b.amount}/${b.cycle} (${b.category})`),
      ...autoDetected.map(r => `${r.name} ₹${r.avg} avg, ${r.count}x detected (${r.category})`),
    ];
    if (allBills.length === 0) return 'You have no subscriptions tracked yet. Add one in the Bills tab.';
    const totalMonthly =
      manualBills.reduce((s, b) => s + toMonthly(b.amount, b.cycle), 0) +
      autoDetected.reduce((s, r) => s + r.avg, 0);
    return `You have ${allBills.length} bill${allBills.length > 1 ? 's' : ''} tracked: ${allBills.join('; ')}. Total monthly: ₹${totalMonthly.toFixed(0)}.`;
  }

  // ── Bill keyword — keep separate from subscriptions ──────────────────
  if (q.includes('bill') && !q.includes('emi') && !q.includes('afford') && !q.includes('can i')) {
    const allBills = [
      ...manualBills.map(b => `${b.name} ₹${b.amount}/${b.cycle}`),
      ...autoDetected.map(r => `${r.name} ~₹${r.avg}/mo`),
    ];
    if (allBills.length === 0) return 'No bills tracked yet. Add them in the Bills tab.';
    const totalMonthly = manualBills.reduce((s, b) => s + toMonthly(b.amount, b.cycle), 0);
    return `Your bills: ${allBills.join('; ')}. Total monthly: ₹${totalMonthly.toFixed(0)}.`;
  }

  if (q.includes('recurring') || q.includes('repeat') || q.includes('regular')) {
    const all = [
      ...manualBills.map(b => `${b.name} (₹${b.amount}/${b.cycle})`),
      ...autoDetected.map(r => `${r.name} (₹${r.avg} avg, ${r.count}x)`),
    ];
    if (all.length === 0) return 'No recurring expenses detected yet.';
    return `Your recurring expenses: ${all.join(', ')}.`;
  }

  if (q.includes('unusual') || q.includes('anomal') || q.includes('spike') || q.includes('weird')) {
    const truth = await buildGroundTruth();
    if (truth.anomalies.length === 0) return "No unusual spending detected this month. You're consistent!";
    const list = truth.anomalies.map(a => `${a.description} ₹${a.amount.toFixed(0)} (${a.deviationPercent}% above normal)`).join('; ');
    return `⚠️ Unusual spending detected: ${list}.`;
  }

  if (
    q.includes('risk') || q.includes('status') || q.includes('how am i doing') ||
    q.includes('financial health') || q.includes('health score') ||
    q.includes('on track') || q.includes('doing well') || q.includes('doing good')
  ) {
    const truth = await buildGroundTruth();
    return `Financial health: ${truth.healthLabel} (risk ${truth.riskScore}/100 — ${truth.riskLabel}). Spent ₹${truth.totalSpent.toFixed(0)}, saved ₹${truth.totalSavings.toFixed(0)} (${truth.savingsRate.toFixed(1)}% allocation). Projected month total: ₹${truth.projectedMonthlySpend.toFixed(0)}.`;
  }

  if (q.includes('balance') || q.includes('how much do i have') || q.includes('how much money')) {
    const truth = await buildGroundTruth();
    if (truth.userBalance === null) {
      return `I don't have your balance yet. Set it in the Dashboard to unlock full financial insights! 💡`;
    }
    return `Your current balance is ₹${truth.userBalance.toLocaleString('en-IN')}. At your spending pace (₹${truth.dailyAverage.toFixed(0)}/day), you have ~${Math.floor(truth.userBalance / (truth.dailyAverage || 1))} days of runway.`;
  }

  const categoryMap: Record<string, string[]> = {
    health:        ['health', 'medicine', 'medical', 'pharmacy', 'doctor', 'hospital'],
    food:          ['food', 'eat', 'restaurant', 'pizza', 'lunch', 'dinner', 'breakfast', 'swiggy', 'zomato', 'cafe', 'coffee'],
    // FIX: Shopping branch — ONLY match if this is NOT an affordability question.
    // Without this guard, "I want to buy an iPhone on EMI" matched 'buy' here
    // and returned shopping budget info instead of the EMI analysis.
    shopping:      ['shop', 'nykaa', 'amazon', 'flipkart', 'clothes', 'meesho', 'myntra'],
    entertainment: ['entertainment', 'fun', 'movie', 'gaming', 'outing', 'party'],
    transport:     ['transport', 'uber', 'ola', 'travel', 'fuel', 'petrol', 'cab', 'auto', 'rapido'],
    utilities:     ['utilities', 'electricity', 'internet', 'recharge', 'jio', 'wifi', 'water'],
    education:     ['education', 'course', 'udemy', 'book', 'study', 'learning', 'class'],
    other:         ['miscellaneous'],
  };

  // FIX: Skip category matching entirely if this is an affordability question
  const isAffordabilityQ = classifyQuestion(question) === 'affordability';

  if (!isAffordabilityQ) {
    for (const [catKey, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(kw => q.includes(kw))) {
        const catName     = catKey.charAt(0).toUpperCase() + catKey.slice(1);
        const found       = snap.categories.find(c => c.category.toLowerCase() === catKey);
        const userBudgets = getBudgets();
        const budget      = userBudgets[catName];
        const spent       = found?.amount ?? 0;

        let base = found
          ? `You spent ₹${spent.toLocaleString('en-IN')} on ${catName} (${found.count} transaction${found.count > 1 ? 's' : ''}) this month.`
          : `No ${catName} expenses recorded this month.`;

        if (budget) {
          const remaining  = budget - spent;
          const pct        = Math.round((spent / budget) * 100);
          const status     =
            pct >= 100 ? `🔴 Over budget by ₹${Math.abs(remaining).toLocaleString('en-IN')}!` :
            pct >= 80  ? `🟡 ${pct}% used — only ₹${remaining.toLocaleString('en-IN')} left.` :
            pct >= 50  ? `🟠 ${pct}% used — ₹${remaining.toLocaleString('en-IN')} remaining.` :
                         `✅ ${pct}% of budget used — ₹${remaining.toLocaleString('en-IN')} still available.`;
          base += ` Your ${catName} budget is ₹${budget.toLocaleString('en-IN')}. ${status}`;
        } else {
          base += ` 💡 Tip: Set a budget for ${catName} in the Insights tab.`;
        }
        return base;
      }
    }
  }

  if (q.includes('budget')) {
    const userBudgets = getBudgets();
    const truth       = await buildGroundTruth();
    const budgetLines = Object.entries(userBudgets)
      .map(([cat, bud]) => {
        const spent = truth.categoryBreakdown[cat]?.total ?? 0;
        const pct   = Math.round((spent / bud) * 100);
        const ind   = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '✅';
        return `${ind} ${cat}: ₹${spent.toLocaleString('en-IN')} / ₹${bud.toLocaleString('en-IN')} (${pct}%)`;
      })
      .join('\n');
    const totalBudget = Object.values(userBudgets).reduce((s, v) => s + v, 0);
    const totalSpent2 = Object.entries(userBudgets).reduce((s, [cat]) => s + (truth.categoryBreakdown[cat]?.total ?? 0), 0);
    return `📊 Your monthly budgets:\n\n${budgetLines}\n\nTotal: ₹${totalSpent2.toLocaleString('en-IN')} spent of ₹${totalBudget.toLocaleString('en-IN')} budget.`;
  }

  if (
    q.includes('total') || q.includes('how much') || q.includes('spent') ||
    q.includes('spend') || q.includes('where') || q.includes('overview') ||
    q.includes('summary') || q.includes('breakdown')
  ) {
    const catSummary = snap.categories.map(c => `${c.category}: ₹${c.amount}`).join(', ');
    const savingsStr = snap.totalSavings > 0
      ? ` You also saved ₹${(snap.totalSavings as number).toFixed(0)} this month. 💰`
      : '';
    return `You spent ₹${snap.monthlyTotal} this month across ${snap.last30Days.count} transactions. Breakdown — ${catSummary}.${savingsStr}`;
  }

  if (q.includes('cut') || q.includes('reduce') || q.includes('where can i save') || q.includes('save more')) {
    const top   = snap.categories[0];
    const truth = await buildGroundTruth();
    return `Biggest expense: ${top?.category ?? 'N/A'} at ₹${top?.amount ?? 0}. You're saving ₹${truth.totalSavings.toFixed(0)}/mo (${truth.savingsRate.toFixed(1)}% rate). Trimming ${top?.category ?? 'that'} could boost savings further.`;
  }

  if (
    q.includes('saving tip') || q.includes('tips') || q.includes('advice') ||
    q.includes('suggest') || q.includes('improve') || q.includes('recommend')
  ) {
    const truth = await buildGroundTruth();
    const top   = Object.entries(truth.categoryBreakdown).sort((a, b) => b[1].total - a[1].total)[0];
    const manualBillsMonthly = manualBills.reduce((s, b) => s + toMonthly(b.amount, b.cycle), 0);

    const tips: string[] = [];
    if (truth.savingsRate < 20) tips.push(`Automate a ₹${Math.round((truth.totalSpent + truth.totalSavings) * 0.05)} transfer to savings on payday`);
    if (top) tips.push(`${top[0]} is your biggest spend (₹${top[1].total.toFixed(0)}) — try a 10% cut there`);
    if (manualBillsMonthly > 0) tips.push(`Review your ₹${manualBillsMonthly.toFixed(0)}/mo subscriptions for any unused ones`);
    if (truth.anomalies.length > 0) tips.push(`Watch out for unusual spends — ${truth.anomalies.length} anomaly detected this month`);
    tips.push(`Track every transaction — visibility is the first step to control`);

    return `Hey champ! You're crushing it already by hitting ${truth.savingsRate.toFixed(1)}% savings allocation — that's serious financial power! To keep this momentum going, try automating your transfers to the "savings" account each payday so you don't even have to think about it.\n\n**Actionable Tips:**\n${tips.slice(0, 3).map((t, i) => `${i + 1}. ${t}`).join('\n')} 🚀`;
  }

  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

async function buildFallbackPrompt(userMessage: string, isComplex: boolean): Promise<string> {
  const truth        = await buildGroundTruth();
  const systemPrompt = buildSystemPrompt(truth, isComplex);
  return `<start_of_turn>user\n${systemPrompt}\n\nUser question: ${userMessage}<end_of_turn>\n<start_of_turn>model\n`;
}

function cleanOutput(text: string): string {
  return text
    .replace(/<end_of_turn>.*/s, '')
    .replace(/<start_of_turn>.*/s, '')
    .replace(/\b(\w+)([.,]?\s*)\1\b/gi, '$1$2')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export async function initAI(onStateChange?: (state: AIModelState) => void): Promise<void> {
  onStateChange?.({ status: 'downloading', progress: 0 });
  try {
    await llamaService.downloadAndInit((p: DownloadProgress) => {
      onStateChange?.({
        status:   p.stage === 'ready' ? 'ready' : p.stage === 'error' ? 'error' : p.stage,
        progress: p.percent,
      });
    });
  } catch (err) {
    onStateChange?.({
      status: 'error', progress: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }
}

export function isAIReady(): boolean {
  return llamaService.ready;
}

export async function askCoach(
  message: string,
  options?: GenerateOptions
): Promise<string> {
  if (!llamaService.ready) throw new Error('AI model not ready.');

  const complexity = classifyQuestion(message);

  // Affordability (including EMI) always goes to the deterministic engine first
  if (complexity === 'affordability') {
    return computeAffordability(message);
  }

  const computed = await computeAnswer(message);
  if (computed) return computed;

  const isComplex = complexity === 'complex';
  const maxTokens = isComplex ? 300 : 100;
  const prompt    = await buildFallbackPrompt(message, isComplex);
  const raw       = await llamaService.generate(prompt, {
    maxTokens,
    temperature: isComplex ? 0.2 : 0.1,
    topP: 0.9,
    ...options,
  });
  return cleanOutput(raw);
}

export async function getFinancialSnapshot(): Promise<GroundTruth> {
  return buildGroundTruth();
}

export async function getDailyTip(): Promise<string> {
  const truth       = await buildGroundTruth();
  const manualBills = getManualBills();
  const top         = Object.entries(truth.categoryBreakdown)
    .sort((a, b) => b[1].total - a[1].total)[0];
  const totalMonthly = manualBills.reduce((s, b) => s + toMonthly(b.amount, b.cycle), 0);

  if (truth.savingsRate === 0 && truth.totalSpent > 0) {
    return `💡 No savings recorded yet this month. Even ₹500 in a SIP today is a start. Add a "Savings" transaction to track it.`;
  }
  if (truth.savingsRate > 0 && truth.savingsRate < 10) {
    return `⚡ Savings allocation: ${truth.savingsRate.toFixed(1)}% — below the 10% healthy threshold. You've saved ₹${truth.totalSavings.toFixed(0)} so far. Push it a little higher!`;
  }
  if (truth.riskLabel === 'DANGER') {
    return `🚨 Risk score ${truth.riskScore}/100. Projected spend ₹${truth.projectedMonthlySpend.toFixed(0)} this month. Freeze non-essentials now.`;
  }
  if (truth.anomalies.length > 0) {
    const a = truth.anomalies[0];
    return `⚠️ Unusual spend: "${a.description}" was ₹${a.amount.toFixed(0)} — ${a.deviationPercent}% above your normal for ${a.category}.`;
  }
  if (totalMonthly > 0) {
    return `📋 Subscriptions: ₹${totalMonthly.toFixed(0)}/month. Savings: ₹${truth.totalSavings.toFixed(0)} (${truth.savingsRate.toFixed(1)}%) — ${truth.healthLabel}.`;
  }
  if (top) {
    return `${top[1].percentage.toFixed(0)}% of spending goes to ${top[0]} (₹${top[1].total.toFixed(0)}). Savings: ₹${truth.totalSavings.toFixed(0)} (${truth.savingsRate.toFixed(1)}%) — ${truth.healthLabel}.`;
  }
  return `💰 Savings this month: ₹${truth.totalSavings.toFixed(0)} (${truth.savingsRate.toFixed(1)}%). Keep building!`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7-DAY SPENDING DATA
// ─────────────────────────────────────────────────────────────────────────────

export async function get7DaySpending(): Promise<DailySpending[]> {
  const now      = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const result: DailySpending[] = [];
  for (let i = 6; i >= 0; i--) {
    const date    = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const label   = dayNames[date.getDay()];
    result.push({ date: dateStr, label, dayLabel: label, amount: 0, categories: {} });
  }

  const allTx = await db.getAll();
  for (const t of allTx) {
    const txDate  = new Date(t.date).toISOString().split('T')[0];
    const dayData = result.find(d => d.date === txDate);
    if (!dayData || t.category === 'Savings') continue;
    dayData.amount += t.amount;
    const cat = t.category ?? 'Other';
    dayData.categories[cat] = (dayData.categories[cat] ?? 0) + t.amount;
  }

  for (const d of result) {
    d.amount = parseFloat(d.amount.toFixed(2));
    for (const cat in d.categories) {
      d.categories[cat] = parseFloat(d.categories[cat].toFixed(2));
    }
  }

  return result;
}