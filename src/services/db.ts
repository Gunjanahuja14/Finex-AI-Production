import type { Transaction } from '../models/Transaction';

export class SimpleDB {
  private txns: Transaction[] = [];
  private nextId = 1;

  async initialize() {
    try {
      const saved = localStorage.getItem('zenith-txns');
      if (saved) {
        this.txns = JSON.parse(saved) || [];
        this.nextId = this.txns.length > 0
          ? Math.max(...this.txns.map(t => t.id || 0)) + 1
          : 1;
      }
    } catch (err) {
      console.error("DB init failed:", err);
      this.txns = [];
      this.nextId = 1;
    }
  }

  /**
   * Seeds realistic sample data ONLY if the DB is empty.
   * All seeded data is fully editable/deletable by the user.
   */
  async seedSampleDataIfEmpty(): Promise<void> {
    if (this.txns.length > 0) return; // never overwrite real data

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    // Helper: date string for day D in current month
    const d = (day: number, monthOffset = 0) => {
      const dt = new Date(y, m + monthOffset, day);
      return dt.toISOString().split('T')[0];
    };

    const samples: Omit<Transaction, 'id' | 'createdAt'>[] = [
      // ── Current month expenses ─────────────────────────────────────
      { amount: 650,  category: 'Food',          item: 'Grocery Shopping',      vendor: 'DMart',           date: d(2)  },
      { amount: 349,  category: 'Food',          item: 'Dinner with friends',    vendor: 'Zomato',          date: d(3)  },
      { amount: 180,  category: 'Transport',     item: 'Office commute',         vendor: 'Ola',             date: d(4)  },
      { amount: 649,  category: 'Entertainment', item: 'Netflix subscription',   vendor: 'Netflix',         date: d(5)  },
      { amount: 299,  category: 'Health',        item: 'Multivitamins',          vendor: 'Apollo Pharmacy', date: d(6)  },
      { amount: 520,  category: 'Food',          item: 'Weekly groceries',       vendor: 'Big Bazaar',      date: d(7)  },
      { amount: 250,  category: 'Transport',     item: 'Cab to airport',         vendor: 'Uber',            date: d(8)  },
      { amount: 1499, category: 'Shopping',      item: 'T-shirts × 3',          vendor: 'Myntra',          date: d(10) },
      { amount: 119,  category: 'Entertainment', item: 'Spotify Premium',        vendor: 'Spotify',         date: d(11) },
      { amount: 450,  category: 'Food',          item: 'Team lunch',             vendor: 'Swiggy',          date: d(13) },
      { amount: 750,  category: 'Health',        item: 'Doctor consultation',    vendor: 'Practo',          date: d(14) },
      { amount: 200,  category: 'Utilities',     item: 'Electricity bill',       vendor: 'BSES',            date: d(15) },
      { amount: 380,  category: 'Food',          item: 'Coffee & snacks',        vendor: 'Starbucks',       date: d(17) },
      { amount: 600,  category: 'Transport',     item: 'Petrol',                 vendor: 'HP Petrol Pump',  date: d(18) },
      { amount: 999,  category: 'Shopping',      item: 'Skincare products',      vendor: 'Nykaa',           date: d(19) },
      { amount: 199,  category: 'Utilities',     item: 'Internet recharge',      vendor: 'Jio',             date: d(20) },
      { amount: 480,  category: 'Food',          item: 'Birthday dinner',        vendor: 'Social',          date: d(21) },
      { amount: 349,  category: 'Education',     item: 'Udemy course',           vendor: 'Udemy',           date: d(22) },
      { amount: 160,  category: 'Transport',     item: 'Auto rides',             vendor: 'Rapido',          date: d(23) },
      { amount: 550,  category: 'Food',          item: 'Fruits & veggies',       vendor: 'Local Market',    date: d(24) },
      { amount: 2500, category: 'Shopping',      item: 'Running shoes',          vendor: 'Decathlon',       date: d(25) },
      { amount: 320,  category: 'Health',        item: 'Yoga mat & resistance bands', vendor: 'Amazon',    date: d(26) },
      { amount: 450,  category: 'Food',          item: 'Weekend brunch',         vendor: 'Cafe Coffee Day', date: d(27) },
      { amount: 280,  category: 'Entertainment', item: 'Movie tickets × 2',      vendor: 'PVR',             date: d(28) },

      // ── Current month savings ──────────────────────────────────────
      { amount: 15000, category: 'Savings', item: 'Monthly SIP',               vendor: 'Zerodha Coin',    date: d(1)  },
      { amount: 5000,  category: 'Savings', item: 'Emergency fund top-up',     vendor: 'HDFC Bank FD',    date: d(10) },
      { amount: 3000,  category: 'Savings', item: 'Recurring deposit',         vendor: 'SBI RD',          date: d(15) },

      // ── Last month expenses (for trend & comparison) ───────────────
      { amount: 720,  category: 'Food',          item: 'Grocery Shopping',      vendor: 'DMart',           date: d(3, -1)  },
      { amount: 649,  category: 'Entertainment', item: 'Netflix subscription',  vendor: 'Netflix',         date: d(5, -1)  },
      { amount: 119,  category: 'Entertainment', item: 'Spotify Premium',       vendor: 'Spotify',         date: d(11, -1) },
      { amount: 320,  category: 'Transport',     item: 'Cab rides',             vendor: 'Ola',             date: d(12, -1) },
      { amount: 1200, category: 'Shopping',      item: 'Jeans & tops',          vendor: 'Zara',            date: d(14, -1) },
      { amount: 550,  category: 'Food',          item: 'Team outing dinner',    vendor: 'Barbeque Nation', date: d(16, -1) },
      { amount: 199,  category: 'Utilities',     item: 'Internet bill',         vendor: 'Jio',             date: d(20, -1) },
      { amount: 380,  category: 'Health',        item: 'Pharmacy',              vendor: 'MedPlus',         date: d(22, -1) },
      { amount: 600,  category: 'Transport',     item: 'Petrol',                vendor: 'HP Petrol Pump',  date: d(25, -1) },
      { amount: 430,  category: 'Food',          item: 'Groceries',             vendor: 'Nature Basket',   date: d(27, -1) },

      // ── Last month savings ─────────────────────────────────────────
      { amount: 15000, category: 'Savings', item: 'Monthly SIP',              vendor: 'Zerodha Coin',     date: d(1, -1) },
      { amount: 4000,  category: 'Savings', item: 'Emergency fund',           vendor: 'HDFC Bank FD',     date: d(10, -1) },

      // ── 2 months ago (for 6-month trend) ──────────────────────────
      { amount: 800,  category: 'Food',          item: 'Monthly groceries',    vendor: 'DMart',            date: d(5, -2)  },
      { amount: 649,  category: 'Entertainment', item: 'Netflix',              vendor: 'Netflix',          date: d(5, -2)  },
      { amount: 450,  category: 'Transport',     item: 'Cab rides',            vendor: 'Ola',              date: d(12, -2) },
      { amount: 900,  category: 'Shopping',      item: 'Home decor',           vendor: 'IKEA',             date: d(18, -2) },
      { amount: 300,  category: 'Health',        item: 'Gym membership',       vendor: 'Cult Fit',         date: d(20, -2) },
      { amount: 199,  category: 'Utilities',     item: 'Internet',             vendor: 'Jio',              date: d(21, -2) },
      { amount: 12000, category: 'Savings', item: 'Monthly SIP',              vendor: 'Zerodha Coin',     date: d(1, -2)  },

      // ── 3 months ago ───────────────────────────────────────────────
      { amount: 750,  category: 'Food',          item: 'Groceries',            vendor: 'DMart',            date: d(4, -3)  },
      { amount: 649,  category: 'Entertainment', item: 'Netflix',              vendor: 'Netflix',          date: d(5, -3)  },
      { amount: 2200, category: 'Shopping',      item: 'Diwali shopping',      vendor: 'Amazon',           date: d(10, -3) },
      { amount: 500,  category: 'Transport',     item: 'Cab & auto rides',     vendor: 'Uber',             date: d(15, -3) },
      { amount: 350,  category: 'Health',        item: 'Pharmacy',             vendor: 'Apollo Pharmacy',  date: d(20, -3) },
      { amount: 199,  category: 'Utilities',     item: 'Internet',             vendor: 'Jio',              date: d(21, -3) },
      { amount: 10000, category: 'Savings', item: 'Monthly SIP',              vendor: 'Zerodha Coin',     date: d(1, -3)  },

      // ── 4 months ago ───────────────────────────────────────────────
      { amount: 680,  category: 'Food',          item: 'Groceries',            vendor: 'Big Bazaar',       date: d(3, -4)  },
      { amount: 649,  category: 'Entertainment', item: 'Netflix',              vendor: 'Netflix',          date: d(5, -4)  },
      { amount: 400,  category: 'Transport',     item: 'Transport',            vendor: 'Ola',              date: d(12, -4) },
      { amount: 600,  category: 'Health',        item: 'Annual health checkup',vendor: 'Thyrocare',        date: d(18, -4) },
      { amount: 199,  category: 'Utilities',     item: 'Internet',             vendor: 'Jio',              date: d(21, -4) },
      { amount: 10000, category: 'Savings', item: 'Monthly SIP',              vendor: 'Zerodha Coin',     date: d(1, -4)  },

      // ── 5 months ago ───────────────────────────────────────────────
      { amount: 700,  category: 'Food',          item: 'Monthly groceries',    vendor: 'DMart',            date: d(4, -5)  },
      { amount: 649,  category: 'Entertainment', item: 'Netflix',              vendor: 'Netflix',          date: d(5, -5)  },
      { amount: 350,  category: 'Transport',     item: 'Cab rides',            vendor: 'Ola',              date: d(14, -5) },
      { amount: 800,  category: 'Shopping',      item: 'Festive shopping',     vendor: 'Flipkart',         date: d(16, -5) },
      { amount: 199,  category: 'Utilities',     item: 'Internet',             vendor: 'Jio',              date: d(21, -5) },
      { amount: 8000, category: 'Savings', item: 'Monthly SIP',               vendor: 'Zerodha Coin',     date: d(1, -5)  },
    ];

    for (const t of samples) {
      this.txns.push({ ...t, id: this.nextId++, createdAt: new Date().toISOString() });
    }
    this.save();

    // Seed default balance
    if (localStorage.getItem('zenith-balance') === null) {
      localStorage.setItem('zenith-balance', '90000');
    }
  }

  async add(t: Omit<Transaction, 'id' | 'createdAt'>): Promise<void> {
    this.txns.push({ ...t, id: this.nextId++, createdAt: new Date().toISOString() });
    this.save();
  }

  async update(id: number, changes: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
    const idx = this.txns.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.txns[idx] = { ...this.txns[idx], ...changes };
      this.save();
    }
  }

  async remove(id: number): Promise<void> {
    this.txns = this.txns.filter(t => t.id !== id);
    this.save();
  }

  async getAll(): Promise<Transaction[]> {
    return [...this.txns].reverse();
  }

  // ── User-entered balance (privacy-first: stored only in localStorage) ──────
  getBalance(): number | null {
    const raw = localStorage.getItem('zenith-balance');
    if (raw === null) return null;
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }

  setBalance(amount: number): void {
    localStorage.setItem('zenith-balance', String(amount));
  }

  // ── Summary excludes Savings ───────────────────────────────────────────────
  async getSummary() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const txns = this.txns.filter(t =>
      new Date(t.date) >= cutoff && t.category !== 'Savings'
    );
    const total = txns.reduce((sum, t) => sum + t.amount, 0);
    const count = txns.length;
    return {
      total: parseFloat(total.toFixed(2)),
      count,
      avg: parseFloat((count > 0 ? total / count : 0).toFixed(2)),
    };
  }

  // ── Categories excludes Savings ────────────────────────────────────────────
  async getCategories() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const txns = this.txns.filter(t =>
      new Date(t.date) >= cutoff && t.category !== 'Savings'
    );
    const cats: Record<string, { amount: number; count: number }> = {};
    txns.forEach(t => {
      if (!cats[t.category]) cats[t.category] = { amount: 0, count: 0 };
      cats[t.category].amount += t.amount;
      cats[t.category].count += 1;
    });
    return Object.entries(cats)
      .map(([category, data]) => ({
        category,
        amount: parseFloat(data.amount.toFixed(2)),
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  async getRecurring() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const txns = this.txns.filter(t => new Date(t.date) >= cutoff);
    const byKey: Record<string, Transaction[]> = {};
    txns.forEach(t => {
      const vendor = t.vendor?.trim() ?? '';
      const item   = t.item?.trim() ?? '';
      const key = (vendor !== '' ? vendor : item !== '' ? item : t.category).toLowerCase();
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(t);
    });
    return Object.entries(byKey)
      .filter(([_, ts]) => ts.length >= 2)
      .map(([key, ts]) => {
        const totalSpent = ts.reduce((s, t) => s + t.amount, 0);
        return {
          name: key,
          category: ts[0].category,
          avg: parseFloat((totalSpent / ts.length).toFixed(2)),
          total: parseFloat(totalSpent.toFixed(2)),
          count: ts.length,
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // ── Current month EXPENSE total (Savings excluded) ────────────────────────
  async getCurrentMonthTotal() {
    const now = new Date();
    const txns = this.txns.filter(t => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        t.category !== 'Savings'
      );
    });
    return parseFloat(txns.reduce((sum, t) => sum + t.amount, 0).toFixed(2));
  }

  // ── Savings this month ────────────────────────────────────────────────────
  async getCurrentMonthSavings() {
    const now = new Date();
    const txns = this.txns.filter(t => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        t.category === 'Savings'
      );
    });
    return parseFloat(txns.reduce((sum, t) => sum + t.amount, 0).toFixed(2));
  }

  // ── Savings last month ────────────────────────────────────────────────────
  async getLastMonthSavings() {
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const txns = this.txns.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear && t.category === 'Savings';
    });
    return parseFloat(txns.reduce((sum, t) => sum + t.amount, 0).toFixed(2));
  }

  async getAISnapshot() {
    const [summary, categories, recurring, monthTotal, totalSavings, lastMonthSavings] =
      await Promise.all([
        this.getSummary(),
        this.getCategories(),
        this.getRecurring(),
        this.getCurrentMonthTotal(),
        this.getCurrentMonthSavings(),
        this.getLastMonthSavings(),
      ]);

    const savingsGrowthPct =
      lastMonthSavings > 0
        ? parseFloat((((totalSavings - lastMonthSavings) / lastMonthSavings) * 100).toFixed(1))
        : null;

    return {
      last30Days: summary,
      monthlyTotal: monthTotal,
      categories,
      recurring,
      transactionCount: this.txns.length,
      totalSavings,
      lastMonthSavings,
      savingsGrowthPct,
    };
  }

  private save() {
    localStorage.setItem('zenith-txns', JSON.stringify(this.txns));
  }
}

export const db = new SimpleDB();