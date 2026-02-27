/**
 * InsightsTab.tsx — FINEX-AI
 * 100% real data from DB. Zero hardcoded values.
 * Includes full Budget Management UI — view, edit & reset category budgets.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getFinancialSnapshot,
  get7DaySpending,
  type GroundTruth,
  type DailySpending,
  getBudgets,
  setBudget,
  resetBudgets,
  DEFAULT_BUDGETS,
} from '../services/ai';
import { db } from '../services/db';

// ── Constants ─────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Food: '#F97316', Transport: '#3B82F6', Entertainment: '#8B5CF6',
  Health: '#10B981', Shopping: '#EC4899', Utilities: '#F59E0B',
  Education: '#06B6D4', Other: '#6B7280', Savings: '#059669',
};

const CAT_ICONS: Record<string, string> = {
  Food: '🍜', Transport: '🚗', Entertainment: '🎮',
  Health: '💊', Shopping: '🛍️', Utilities: '⚡',
  Education: '📚', Other: '📦', Savings: '💰',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getMonthlyTrend(): Promise<{ month: string; amount: number }[]> {
  const allTx = await db.getAll();
  const now   = new Date();
  const result: { month: string; amount: number }[] = [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const total = allTx
      .filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y && t.category !== 'Savings';
      })
      .reduce((s, t) => s + t.amount, 0);
    result.push({ month: monthNames[m], amount: parseFloat(total.toFixed(0)) });
  }
  return result;
}

// ── SparkLine Chart ───────────────────────────────────────────────────────────

function SparkLine({ data }: { data: { month: string; amount: number }[] }) {
  if (!data || data.length < 2) return null;

  const W = 600, H = 160;
  const maxVal = Math.max(...data.map(d => d.amount), 1);
  const minVal = Math.min(...data.map(d => d.amount), 0);
  const range  = maxVal - minVal || 1;
  const pad    = { top: 16, bottom: 36, left: 48, right: 16 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * innerW,
    y: pad.top + (1 - (d.amount - minVal) / range) * innerH,
    ...d,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const gridSteps = 4;
  const gridVals  = Array.from({ length: gridSteps + 1 }, (_, i) =>
    Math.round(minVal + (range * i) / gridSteps)
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {gridVals.map((val, i) => {
        const y = pad.top + (1 - (val - minVal) / range) * innerH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
            </text>
          </g>
        );
      })}
      <path
        d={`${pathD} L${pts[pts.length-1].x},${pad.top + innerH} L${pts[0].x},${pad.top + innerH} Z`}
        fill="url(#areaGrad)" opacity="0.18"
      />
      <path d={pathD} fill="none" stroke="#14B8A6" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#14B8A6" stroke="var(--card)" strokeWidth="2" />
      ))}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
          {p.month}
        </text>
      ))}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="1" />
          <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Budget Editor Modal ───────────────────────────────────────────────────────

interface BudgetEditorProps {
  budgets: Record<string, number>;
  spent: Record<string, number>;
  onSave: (updated: Record<string, number>) => void;
  onClose: () => void;
}

function BudgetEditor({ budgets, spent, onSave, onClose }: BudgetEditorProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    Object.keys(DEFAULT_BUDGETS).forEach(cat => {
      init[cat] = String(budgets[cat] ?? DEFAULT_BUDGETS[cat]);
    });
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    Object.entries(draft).forEach(([cat, val]) => {
      const n = Number(val);
      if (isNaN(n) || n < 0) errs[cat] = 'Must be ≥ 0';
      else if (n > 9999999) errs[cat] = 'Too large';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const result: Record<string, number> = {};
    Object.entries(draft).forEach(([cat, val]) => {
      result[cat] = Number(val);
    });
    onSave(result);
  };

  const handleReset = () => {
    const init: Record<string, string> = {};
    Object.keys(DEFAULT_BUDGETS).forEach(cat => {
      init[cat] = String(DEFAULT_BUDGETS[cat]);
    });
    setDraft(init);
    setErrors({});
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--card-border)',
        borderRadius: '20px',
        width: '100%', maxWidth: '520px',
        maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              🎯 Edit Monthly Budgets
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Set limits per category. Saved to your device only.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflow: 'auto', padding: '16px 24px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.keys(DEFAULT_BUDGETS).map(cat => {
              const spentAmt   = spent[cat] ?? 0;
              const budgetAmt  = Number(draft[cat]) || 0;
              const pct        = budgetAmt > 0 ? Math.min(Math.round((spentAmt / budgetAmt) * 100), 100) : 0;
              const barColor   = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';

              return (
                <div key={cat} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '12px',
                  padding: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{CAT_ICONS[cat] ?? '📦'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{cat}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        ₹{spentAmt.toLocaleString('en-IN')} spent this month
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '11px', color: 'var(--muted)',
                        fontWeight: 500, paddingRight: '4px',
                      }}>₹</span>
                      <input
                        type="number"
                        value={draft[cat]}
                        min="0"
                        step="500"
                        onChange={e => setDraft(prev => ({ ...prev, [cat]: e.target.value }))}
                        style={{
                          width: '90px',
                          background: 'var(--surface, #1e2530)',
                          border: `1px solid ${errors[cat] ? '#EF4444' : 'var(--card-border)'}`,
                          borderRadius: '8px',
                          color: 'var(--text)',
                          padding: '6px 10px',
                          fontSize: '13px',
                          fontWeight: 600,
                          outline: 'none',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                  </div>

                  {/* Progress bar */}
                  {budgetAmt > 0 && (
                    <div>
                      <div style={{
                        height: '4px', background: 'rgba(0,0,0,0.15)',
                        borderRadius: '4px', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: barColor, borderRadius: '4px',
                          transition: 'width 0.4s ease, background 0.3s',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: barColor, fontWeight: 600 }}>{pct}% used</span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                          ₹{Math.max(0, budgetAmt - spentAmt).toLocaleString('en-IN')} left
                        </span>
                      </div>
                    </div>
                  )}

                  {errors[cat] && (
                    <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>{errors[cat]}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--card-border)',
          display: 'flex', gap: '10px',
        }}>
          <button
            onClick={handleReset}
            style={{
              flex: 0, padding: '10px 16px',
              background: 'none',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              color: 'var(--muted)', cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Reset defaults
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px',
              background: 'none',
              border: '1px solid var(--card-border)',
              borderRadius: '10px',
              color: 'var(--muted)', cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '10px',
              background: 'linear-gradient(135deg, #14B8A6, #10B981)',
              border: 'none',
              borderRadius: '10px',
              color: '#000', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700,
            }}
          >
            Save Budgets
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Budget Overview Card ──────────────────────────────────────────────────────

interface BudgetOverviewProps {
  budgets: Record<string, number>;
  spent: Record<string, number>;
  onEditClick: () => void;
}

function BudgetOverview({ budgets, spent, onEditClick }: BudgetOverviewProps) {
  const categories = Object.keys(DEFAULT_BUDGETS);
  const totalBudget = categories.reduce((s, cat) => s + (budgets[cat] ?? 0), 0);
  const totalSpent  = categories.reduce((s, cat) => s + (spent[cat] ?? 0), 0);
  const totalPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const catRows = categories
    .map(cat => ({
      cat,
      budget: budgets[cat] ?? DEFAULT_BUDGETS[cat],
      spent:  spent[cat]  ?? 0,
    }))
    .filter(r => r.budget > 0)
    .sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget));

  return (
    <div className="card">
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
            🎯 Monthly Budgets
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            Spending limits you set per category
          </div>
        </div>
        <button
          onClick={onEditClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(20,184,166,0.1)',
            border: '1px solid rgba(20,184,166,0.3)',
            borderRadius: '20px',
            color: '#14B8A6',
            padding: '6px 14px',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; }}
        >
          ✏️ Edit Budgets
        </button>
      </div>

      {/* Overall summary */}
      <div style={{
        background: 'rgba(20,184,166,0.06)',
        border: '1px solid rgba(20,184,166,0.15)',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Total budget used</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: totalPct >= 90 ? '#EF4444' : totalPct >= 70 ? '#F59E0B' : '#10B981' }}>
            {totalPct}%
          </span>
        </div>
        <div style={{ height: '6px', background: 'rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(totalPct, 100)}%`,
            background: totalPct >= 90 ? 'linear-gradient(90deg,#EF4444,#DC2626)' : totalPct >= 70 ? 'linear-gradient(90deg,#F59E0B,#D97706)' : 'linear-gradient(90deg,#14B8A6,#10B981)',
            borderRadius: '4px', transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            ₹{totalSpent.toLocaleString('en-IN')} spent
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            ₹{totalBudget.toLocaleString('en-IN')} total limit
          </span>
        </div>
      </div>

      {/* Per-category rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {catRows.map(({ cat, budget, spent: spentAmt }) => {
          const pct       = budget > 0 ? Math.round((spentAmt / budget) * 100) : 0;
          const barColor  = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
          const remaining = Math.max(0, budget - spentAmt);
          const catColor  = CAT_COLORS[cat] ?? '#6B7280';

          return (
            <div key={cat} style={{
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${pct >= 100 ? 'rgba(239,68,68,0.2)' : pct >= 80 ? 'rgba(245,158,11,0.2)' : 'var(--card-border)'}`,
              borderRadius: '12px',
            }}>
              {/* Row top */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: `${catColor}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                }}>
                  {CAT_ICONS[cat] ?? '📦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{cat}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        ₹{spentAmt.toLocaleString('en-IN')} / ₹{budget.toLocaleString('en-IN')}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        color: barColor,
                        background: `${barColor}18`,
                        border: `1px solid ${barColor}35`,
                        borderRadius: '10px', padding: '1px 7px',
                      }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '5px', background: 'rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(pct, 100)}%`,
                  background: barColor, borderRadius: '4px',
                  transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>

              {/* Footer: remaining or over budget */}
              <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'flex-end' }}>
                {pct >= 100 ? (
                  <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 600 }}>
                    ₹{(spentAmt - budget).toLocaleString('en-IN')} over budget
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    ₹{remaining.toLocaleString('en-IN')} remaining
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {catRows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '13px' }}>
            No spending data yet. Add transactions to see budget tracking.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InsightsTab() {
  const [truth,         setTruth]         = useState<GroundTruth | null>(null);
  const [trend,         setTrend]         = useState<{ month: string; amount: number }[]>([]);
  const [sevenDay,      setSevenDay]      = useState<DailySpending[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [budgets,       setBudgets]       = useState<Record<string, number>>(() => getBudgets());
  const [showEditor,    setShowEditor]    = useState(false);
  const [budgetVersion, setBudgetVersion] = useState(0); // force re-render after save

  const loadData = useCallback(async () => {
    try {
      const [snapshot, monthTrend, daily] = await Promise.all([
        getFinancialSnapshot(),
        getMonthlyTrend(),
        get7DaySpending(),
      ]);
      setTruth(snapshot);
      setTrend(monthTrend);
      setSevenDay(daily);
      setBudgets(getBudgets());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadData().then(() => { if (!mounted) return; });
    return () => { mounted = false; };
  }, [loadData, budgetVersion]);

  const handleBudgetSave = useCallback((updated: Record<string, number>) => {
    // Persist each category to localStorage via ai.ts
    Object.entries(updated).forEach(([cat, amt]) => setBudget(cat, amt));
    setBudgets(updated);
    setShowEditor(false);
    setBudgetVersion(v => v + 1); // trigger refresh
  }, []);

  const handleBudgetReset = useCallback(() => {
    resetBudgets();
    setBudgets({ ...DEFAULT_BUDGETS });
    setShowEditor(false);
    setBudgetVersion(v => v + 1);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--muted)', fontSize: '14px' }}>
        Loading insights...
      </div>
    );
  }

  if (!truth) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
        <p style={{ fontSize: '14px' }}>Could not load insights. Please try refreshing.</p>
      </div>
    );
  }

  // ── Derived data from real DB ──────────────────────────────────────────────

  const currentMonthAmount = trend[trend.length - 1]?.amount ?? 0;
  const lastMonthAmount    = trend[trend.length - 2]?.amount ?? 0;
  const changePct = lastMonthAmount > 0
    ? parseFloat((((currentMonthAmount - lastMonthAmount) / lastMonthAmount) * 100).toFixed(1))
    : null;
  const changeIsDown = changePct !== null && changePct <= 0;

  // Top 3 categories by spend (excluding savings)
  const topCats = Object.entries(truth.categoryBreakdown)
    .filter(([cat]) => cat !== 'Savings')
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);

  // Overspending alerts — categories above 70% of user budget
  const overspendAlerts = Object.entries(truth.categoryBreakdown)
    .filter(([cat]) => cat !== 'Savings' && budgets[cat])
    .map(([cat, stat]) => {
      const budget = budgets[cat];
      const pct    = Math.round((stat.total / budget) * 100);
      return { cat, spent: stat.total, budget, pct };
    })
    .filter(a => a.pct >= 70)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  // Build spent map for BudgetOverview
  const spentMap: Record<string, number> = {};
  Object.entries(truth.categoryBreakdown)
    .filter(([cat]) => cat !== 'Savings')
    .forEach(([cat, stat]) => { spentMap[cat] = stat.total; });

  // AI Recommendations
  const recommendations: {
    id: string; icon: string; title: string;
    impact: 'high' | 'medium' | 'low'; body: string;
  }[] = [];

  if (changePct !== null && changePct < 0) {
    recommendations.push({
      id: 'progress', icon: '✅', impact: 'high',
      title: 'Excellent Progress',
      body: `Your spending decreased by ${Math.abs(changePct)}% this month (₹${currentMonthAmount.toLocaleString('en-IN')} vs ₹${lastMonthAmount.toLocaleString('en-IN')} last month). Keep up the disciplined approach!`,
    });
  } else if (changePct !== null && changePct > 0) {
    recommendations.push({
      id: 'overspend', icon: '⚠️', impact: 'high',
      title: 'Spending Increased',
      body: `Your spending rose by ${changePct}% this month (₹${currentMonthAmount.toLocaleString('en-IN')} vs ₹${lastMonthAmount.toLocaleString('en-IN')} last month). Review your top categories.`,
    });
  }

  if (truth.weekendVsWeekday?.isHigh) {
    const { weekendTotal, weekdayTotal } = truth.weekendVsWeekday;
    const wPct = weekdayTotal > 0
      ? Math.round(((weekendTotal - weekdayTotal) / weekdayTotal) * 100)
      : 0;
    recommendations.push({
      id: 'weekend', icon: '📅', impact: 'medium',
      title: 'Weekend Spending Pattern',
      body: `Your weekend expenses are ${wPct}% higher than weekdays (₹${weekendTotal.toLocaleString('en-IN')} vs ₹${weekdayTotal.toLocaleString('en-IN')}). Setting a weekend budget could help.`,
    });
  }

  if (truth.billShocks.length > 0) {
    const totalBills = truth.billShocks.reduce((s, b) => s + b.amount, 0);
    recommendations.push({
      id: 'subs', icon: '💡', impact: 'high',
      title: 'Subscription Audit',
      body: `You have ${truth.billShocks.length} upcoming bill${truth.billShocks.length > 1 ? 's' : ''} totalling ₹${totalBills.toLocaleString('en-IN')} this cycle. Review which ones you actively use.`,
    });
  }

  const topCat = topCats[0];
  if (topCat) {
    const [cat, stat] = topCat;
    recommendations.push({
      id: `top-cat-${cat}`, icon: CAT_ICONS[cat] ?? '📦', impact: 'medium',
      title: `${cat} is Your Top Expense`,
      body: `₹${stat.total.toLocaleString('en-IN')} spent on ${cat} this month (${stat.percentage.toFixed(0)}% of expenses). Even a 10% reduction saves ₹${Math.round(stat.total * 0.1).toLocaleString('en-IN')}.`,
    });
  }

  if (truth.savingsRate < 10 && truth.totalSpent > 0) {
    recommendations.push({
      id: 'savings-low', icon: '💰', impact: 'high',
      title: 'Boost Your Savings Rate',
      body: `Your savings rate is ${truth.savingsRate.toFixed(1)}% — below the 10% healthy threshold. Try automating a small transfer on payday to hit 10%+.`,
    });
  }

  const IMPACT_STYLE: Record<string, { color: string; bg: string; border: string; cardBg: string; cardBorder: string }> = {
    high:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  cardBg: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))',  cardBorder: '1px solid rgba(239,68,68,0.15)'  },
    medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', cardBg: 'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02))', cardBorder: '1px solid rgba(245,158,11,0.15)' },
    low:    { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', cardBg: 'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(16,185,129,0.02))', cardBorder: '1px solid rgba(16,185,129,0.15)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Budget Editor Modal */}
      {showEditor && (
        <BudgetEditor
          budgets={budgets}
          spent={spentMap}
          onSave={handleBudgetSave}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px', margin: 0 }}>
          Insights
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>
          AI-powered analysis of your financial behavior
        </p>
      </div>

      {/* ── Monthly Spending Trend ── */}
      <div className="card">
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>📈 Monthly Spending Trend</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            6-month comparison showing your progress
          </div>
        </div>
        {trend.every(d => d.amount === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: '13px' }}>
            No spending data yet. Add some transactions to see your trend.
          </div>
        ) : (
          <SparkLine data={trend} />
        )}
      </div>

      {/* ── Current Month Summary ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Current Month
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.8px', lineHeight: 1 }}>
              ₹{currentMonthAmount.toLocaleString('en-IN')}
            </div>
          </div>
          {changePct !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: changeIsDown ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${changeIsDown ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: '20px', padding: '8px 14px',
              color: changeIsDown ? '#10B981' : '#EF4444',
              fontWeight: 700, fontSize: '13px',
            }}>
              <span>{changeIsDown ? '↘' : '↗'}</span>
              {Math.abs(changePct)}% vs last month
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--card-border)', fontSize: '12px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'var(--muted)' }}>Daily avg: </span>
            <span style={{ fontWeight: 700 }}>₹{truth.dailyAverage.toFixed(0)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Savings rate: </span>
            <span style={{ fontWeight: 700, color: '#059669' }}>{truth.savingsRate.toFixed(1)}%</span>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Risk: </span>
            <span style={{ fontWeight: 700, color: truth.riskLabel === 'SAFE' ? '#10B981' : truth.riskLabel === 'CAUTION' ? '#F59E0B' : '#EF4444' }}>
              {truth.riskLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Budget Overview (NEW) ── */}
      <BudgetOverview
        budgets={budgets}
        spent={spentMap}
        onEditClick={() => setShowEditor(true)}
      />

      {/* ── Top Categories + Overspending Alerts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

        {/* Top Spending Categories */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            🏆 Top Spending Categories
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '16px' }}>
            Your highest expense areas this month
          </div>
          {topCats.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '13px', padding: '16px 0' }}>
              No expense data yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topCats.map(([cat, stat]) => {
                const color = CAT_COLORS[cat] ?? '#6B7280';
                const avg30 = stat.avg30Day;
                const diff  = avg30 > 0 ? ((stat.total - avg30) / avg30) * 100 : null;
                return (
                  <div key={cat} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.03)',
                    borderRadius: '12px', border: '1px solid var(--card-border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '10px',
                        background: `${color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', flexShrink: 0,
                      }}>
                        {CAT_ICONS[cat] ?? '📦'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>{cat}</div>
                        {diff !== null && (
                          <div style={{ fontSize: '11px', marginTop: '2px', color: diff < 0 ? '#10B981' : '#EF4444' }}>
                            {diff < 0 ? '↓' : '↑'} {Math.abs(diff).toFixed(0)}% vs 30-day avg
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                      ₹{stat.total.toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overspending Alerts */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            ⚠️ Overspending Alerts
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '16px' }}>
            Categories requiring attention
          </div>
          {overspendAlerts.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center',
              background: 'rgba(16,185,129,0.05)',
              border: '1px solid rgba(16,185,129,0.15)',
              borderRadius: '12px',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>All categories in budget</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                No category exceeds 70% of its limit
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {overspendAlerts.map(alert => {
                const statusColor = alert.pct >= 100 ? '#EF4444' : '#F59E0B';
                return (
                  <div key={alert.cat} style={{
                    background: 'rgba(245,158,11,0.05)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '12px', padding: '14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '18px' }}>⚠️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>{alert.cat}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Approaching monthly limit</div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: statusColor }}>{alert.pct}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>₹{alert.spent.toLocaleString('en-IN')} spent</span>
                      <span>₹{alert.budget.toLocaleString('en-IN')} limit</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(alert.pct, 100)}%`,
                        background: statusColor, borderRadius: '4px',
                        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Recommendations ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>✨ AI Recommendations</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
              Personalized insights based on your real spending
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Based on data up to today</div>
        </div>
        {recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: '13px' }}>
            Add more transactions to get personalized recommendations.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {recommendations.map(rec => {
              const style = IMPACT_STYLE[rec.impact];
              return (
                <div key={rec.id} style={{
                  background: style.cardBg, border: style.cardBorder,
                  borderRadius: '14px', padding: '16px',
                  transition: 'transform 0.18s, box-shadow 0.18s', cursor: 'default',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        background: style.bg, border: `1px solid ${style.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', flexShrink: 0,
                      }}>
                        {rec.icon}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', lineHeight: '1.3' }}>
                        {rec.title}
                      </div>
                    </div>
                    <span style={{
                      background: `${style.color}18`, color: style.color,
                      border: `1px solid ${style.color}35`,
                      borderRadius: '20px', padding: '2px 9px',
                      fontSize: '10px', fontWeight: 700,
                      whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '8px',
                    }}>
                      {rec.impact} impact
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
                    {rec.body}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Savings Summary ── */}
      {truth.totalSavings > 0 && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(5,150,105,0.07), rgba(16,185,129,0.03))',
          border: '1px solid rgba(5,150,105,0.2)',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669', marginBottom: '12px' }}>
            💰 Savings Overview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>This Month</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>₹{truth.totalSavings.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Savings Rate</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#059669' }}>{truth.savingsRate.toFixed(1)}%</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>vs Last Month</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: truth.savingsGrowthPct !== null && truth.savingsGrowthPct >= 0 ? '#059669' : '#EF4444' }}>
                {truth.savingsGrowthPct !== null
                  ? `${truth.savingsGrowthPct >= 0 ? '+' : ''}${truth.savingsGrowthPct}%`
                  : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Goal (20%)</div>
              <div style={{ marginTop: '6px' }}>
                <div style={{ height: '6px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min((truth.savingsRate / 20) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #10B981, #059669)',
                    borderRadius: '4px', transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  {truth.savingsRate >= 20 ? '✅ Goal reached!' : `${(20 - truth.savingsRate).toFixed(1)}% to go`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}