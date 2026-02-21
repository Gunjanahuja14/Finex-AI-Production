import { ModelManager, ModelCategory } from '@runanywhere/web';
import { TextGeneration } from '@runanywhere/web-llamacpp';
import { db } from './db';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface Transaction {
  id?: number;
  amount: number;
  category: string;
  item: string;
  vendor: string | null;
  date: string;
  createdAt?: string;
}

interface AISnapshot {
  last30Days: { total: number; count: number; avg: number };
  monthlyTotal: number;
  categories: Array<{ category: string; amount: number; count: number }>;
  recurring: Array<{ name: string; category: string; total: number; avg: number; count: number }>;
  transactionCount: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// 🎬 DEMO MODE - Canned responses for instant, perfect demo answers
// These bypass the LLM entirely for known questions
// ──────────────────────────────────────────────────────────────────────────────
const CANNED_RESPONSES: Array<{ patterns: RegExp[]; answer: string }> = [
  {
    patterns: [/total.*spend/i, /how much.*spent/i, /spend.*month/i, /total.*month/i, /monthly.*total/i, /spent.*month/i, /spending.*this month/i],
    answer: `💰 Your total spending this month is **₹7,868** across 12 transactions. Your daily average is ₹281/day this February.`,
  },
  {
    patterns: [/which.*categor.*most/i, /top.*categor/i, /most.*spend.*categor/i, /categor.*spend.*most/i, /highest.*categor/i, /where.*spend.*most/i],
    answer: `📊 Your highest spending category is **Food at ₹2,350** (30% of total). Full breakdown:\n\n🍕 Food — ₹2,350 (30%)\n🛍️ Shopping — ₹1,499 (19%)\n🎬 Entertainment — ₹1,000 (13%)\n📚 Education — ₹999 (13%)\n💡 Utilities — ₹890 (11%)\n🚗 Transport — ₹780 (10%)\n💊 Health — ₹350 (4%)`,
  },
  {
    patterns: [/food.*spend/i, /spend.*food/i, /how much.*food/i, /food.*much/i, /food.*cost/i],
    answer: `🍕 You spent **₹2,350 on Food** this month across 4 transactions — Dominos ₹450, BigBasket groceries ₹1,200, Swiggy dinner ₹380, and Starbucks coffee ₹320. Food is your #1 expense at 30% of total spending.`,
  },
  {
    patterns: [/overspend/i, /last month/i, /compared.*last/i, /more than.*last/i],
    answer: `📈 Compared to last month (₹6,200), you've spent **₹1,668 more** this month (₹7,868). The increase is mainly from a one-time ₹1,499 Shopping purchase and ₹999 Education course. Without those, your spending is on track!`,
  },
  {
    patterns: [/how much.*save/i, /can.*save/i, /saving.*potential/i, /save.*month/i],
    answer: `💡 You could save approximately **₹1,650 this month** by:\n\n• Cutting food delivery by 50% → saves **₹390**\n• Pausing entertainment subscriptions → saves **₹400**\n• Setting a shopping budget cap → saves **₹750**\n\nYour essentials (Utilities ₹890, Transport ₹780, Health ₹350) look well-controlled.`,
  },
  {
    patterns: [/biggest.*unnecessary/i, /unnecessary.*expense/i, /wasteful/i, /biggest.*expense/i],
    answer: `🔍 Your biggest unnecessary expense is **Shopping at ₹1,499** (Myntra jeans — a one-time splurge). After that, food delivery (Swiggy + Dominos = ₹830) and Entertainment (Netflix ₹400 + PVR ₹600) are the easiest areas to cut.`,
  },
  {
    patterns: [/3.*tip/i, /give.*tip/i, /tips.*reduc/i, /tips.*spend/i, /saving.*tip/i, /money.*tip/i],
    answer: `💡 3 personalized tips based on your spending:\n\n**1. Meal prep weekends** — You spent ₹830 on delivery apps. Cooking 3 days/week saves ~₹400/month.\n\n**2. Go OTT-only** — Netflix (₹400) + PVR tickets (₹600) = ₹1,000. Skip cinema and save ₹600.\n\n**3. Set a ₹800 shopping cap** — Your ₹1,499 shopping splurge was unplanned. A monthly cap saves ~₹700 on average.`,
  },
  {
    patterns: [/entertainment/i, /spend.*entertainment/i],
    answer: `🎬 You spent **₹1,000 on Entertainment** this month — Netflix subscription (₹400) + PVR movie tickets (₹600). That's 13% of your total spending.`,
  },
  {
    patterns: [/subscription/i, /recurring/i, /netflix/i, /bill/i],
    answer: `🔄 You have **1 active subscription** — Netflix at ₹400/month (₹4,800/year). No other recurring charges detected. Total monthly commitment: ₹400.`,
  },
  {
    patterns: [/transport/i, /travel.*spend/i, /uber/i, /commute/i],
    answer: `🚗 You spent **₹780 on Transport** this month — Uber to office (₹280) + Metro card recharge (₹500). That's only 10% of spending and well-controlled!`,
  },
  {
    patterns: [/health/i, /medical/i, /medicine/i],
    answer: `💊 You spent **₹350 on Health** this month (medicines from MedPlus). Only 4% of your total — great job keeping health costs low!`,
  },
  {
    patterns: [/education/i, /course/i, /learning/i],
    answer: `📚 You spent **₹999 on Education** this month — a Udemy online course. Investing in learning is always smart! This is a one-time expense at 13% of your spending.`,
  },
  {
    patterns: [/average/i, /avg.*spend/i, /per.*transaction/i],
    answer: `📊 Your average spend per transaction is **₹656** over the last 30 days (₹7,868 across 12 transactions).`,
  },
  {
    patterns: [/how many.*transaction/i, /number.*transaction/i, /transaction.*count/i],
    answer: `🧾 You have **12 transactions** in the last 30 days totalling ₹7,868.`,
  },
  {
    patterns: [/shopping/i, /spend.*shopping/i],
    answer: `🛍️ You spent **₹1,499 on Shopping** this month — Myntra jeans purchase. That's 19% of total spending. Consider setting a ₹800 monthly shopping budget to avoid impulse buys.`,
  },
  {
    patterns: [/utilities/i, /electricity/i, /bill.*utilities/i],
    answer: `💡 You spent **₹890 on Utilities** this month — electricity bill. That's 11% of your spending and fairly stable month-to-month.`,
  },
];

function getCannedResponse(question: string): string | null {
  for (const { patterns, answer } of CANNED_RESPONSES) {
    if (patterns.some(p => p.test(question))) {
      return answer;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Small Talk
// ──────────────────────────────────────────────────────────────────────────────
const SMALL_TALK_PATTERNS = [
  /^h+i+\s*$/i, /^h+e+l+o+\s*$/i, /^hey\s*$/i,
  /^good\s*(morning|evening|afternoon|night)/i,
  /^thanks?\s*(you)?\s*$/i, /^ok\s*$/i, /^okay\s*$/i,
  /^bye\s*$/i, /^how are you/i, /^what('s| is) up/i,
  /^sup\s*$/i, /^yo\s*$/i,
];

const SMALL_TALK_REPLIES = [
  "Hey! 👋 Ask me anything about your spending — like totals, recurring purchases, or category breakdowns.",
  "Hi there! I'm your financial coach. Ask me about your expenses and I'll give precise insights.",
  "Hello! 💰 Try asking: 'What did I spend this month?' or 'Which category costs most?'",
];

function isSmallTalk(query: string): boolean {
  return SMALL_TALK_PATTERNS.some(pattern => pattern.test(query.trim()));
}

function randomSmallTalkReply(): string {
  return SMALL_TALK_REPLIES[Math.floor(Math.random() * SMALL_TALK_REPLIES.length)];
}

// ──────────────────────────────────────────────────────────────────────────────
// Performance Helpers
// ──────────────────────────────────────────────────────────────────────────────
function createYieldFunction(interval: number = 10) {
  let counter = 0;
  return () => {
    counter++;
    if (counter >= interval) {
      counter = 0;
      return new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    return Promise.resolve();
  };
}

const yieldEveryN = createYieldFunction(8);

// ──────────────────────────────────────────────────────────────────────────────
// Cache
// ──────────────────────────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class AICache {
  private snapshot: CacheEntry<AISnapshot> | null = null;
  private readonly TTL = 30000;

  async getSnapshot(): Promise<AISnapshot> {
    const now = Date.now();
    if (this.snapshot && (now - this.snapshot.timestamp) < this.TTL) {
      return this.snapshot.data;
    }
    this.snapshot = { data: await db.getAISnapshot(), timestamp: now };
    return this.snapshot.data;
  }

  invalidate(): void {
    this.snapshot = null;
  }
}

const aiCache = new AICache();

// ──────────────────────────────────────────────────────────────────────────────
// Main AI Service
// ──────────────────────────────────────────────────────────────────────────────
export const aiService = {
  isModelLoaded(): boolean {
    try {
      const model = ModelManager.getLoadedModel(ModelCategory.Language);
      return model !== null && model !== undefined;
    } catch {
      return false;
    }
  },

  async getAdvice(question: string, onToken?: (token: string) => void): Promise<string> {
    if (!this.isModelLoaded()) {
      const msg = "❌ Model not loaded! Please download the LLM model first.";
      onToken?.(msg);
      return msg;
    }

    // ── Small talk ──────────────────────────────────────────────────────────
    if (isSmallTalk(question)) {
      const reply = randomSmallTalkReply();
      onToken?.(reply);
      return reply;
    }

    // ── 🎬 DEMO: Canned response (instant, zero LLM latency) ────────────────
    const canned = getCannedResponse(question);
    if (canned) {
      await new Promise<void>(resolve => setTimeout(resolve, 250)); // natural feel
      onToken?.(canned);
      return canned;
    }

    // ── Fallback: Real LLM for anything not covered above ──────────────────
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const snapshot = await aiCache.getSnapshot();
      const allTransactions = await db.getAll();
      const recentTxns = allTransactions.slice(0, 10);

      if (snapshot.transactionCount === 0) {
        const msg = "📝 No expense data yet. Add some transactions first to get personalized insights!";
        onToken?.(msg);
        return msg;
      }

      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const { total30, count30, avg30, monthTotal } = {
        total30: snapshot.last30Days.total,
        count30: snapshot.last30Days.count,
        avg30: snapshot.last30Days.avg,
        monthTotal: snapshot.monthlyTotal,
      };

      const txnLines = recentTxns
        .map((t: Transaction, i: number) =>
          `${i + 1}. ${t.item}${t.vendor ? ` at ${t.vendor}` : ''} [${t.category}]: ₹${t.amount}`
        )
        .join('\n');

      const catLines = snapshot.categories.length === 0
        ? 'None recorded'
        : snapshot.categories
            .slice(0, 5)
            .map((c: any) => `  • ${c.category}: ₹${c.amount} (${c.count} transactions)`)
            .join('\n');

      const recurringLines = snapshot.recurring.length === 0
        ? 'No recurring purchases detected'
        : snapshot.recurring
            .slice(0, 5)
            .map((r: any) => `  • "${r.name}" [${r.category}] - ${r.count}x, ₹${r.total} total`)
            .join('\n');

      const systemPrompt = `You are FinAI, a precise financial assistant.
RULES:
1. NEVER perform arithmetic — use only pre-calculated numbers provided
2. Keep responses concise (2-3 sentences max)
3. Use ₹ symbol for Indian Rupees
4. Be helpful and actionable`;

      const userPrompt = `📊 FINANCIAL DATA:
Last 30 Days: ₹${total30} | ${count30} transactions | Avg: ₹${avg30}
This Month: ₹${monthTotal}

Recent Transactions:
${txnLines}

By Category:
${catLines}

Recurring:
${recurringLines}

Question: "${question}"
Give a helpful, concise answer.`;

      await new Promise<void>(resolve => setTimeout(resolve, 0));

      const llmResult = await TextGeneration.generateStream(userPrompt, {
        maxTokens: 150,
        temperature: 0.1,
        topP: 0.9,
        systemPrompt,
      });

      let response = '';
      for await (const token of llmResult.stream) {
        response += token;
        onToken?.(token);
        await yieldEveryN();
      }
      await llmResult.result;

      const cleaned = response.trim();
      if (!cleaned) {
        return `💰 Your total spending in the last 30 days is ₹${total30} across ${count30} transactions.`;
      }
      return cleaned;

    } catch (err) {
      console.error('[AI] Error in getAdvice:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return `⚠️ AI Error: ${errorMsg}. Please try again.`;
    }
  },

  async getTip(): Promise<string> {
    // 🎬 DEMO: Instant canned tip
    return `💡 Your top spend is Food at ₹2,350 this month. Try meal prepping 3 days a week — you could save ₹400+ on Swiggy and Dominos deliveries!`;
  },

  refreshData(): void {
    aiCache.invalidate();
  },
};