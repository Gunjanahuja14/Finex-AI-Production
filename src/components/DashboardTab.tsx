/**
 * DashboardTab.tsx — FINEX-AI
 * Features:
 *   1. Balance Card      — user-entered real balance, editable inline
 *   2. Bill Shock Alert  — predictive narrative: "You'll be ₹X short"
 *   3. Privacy Scorecard — "0 KB Sent to Cloud" badge
 *   4. Truth-Serum       — anomaly coaching questions, not flat warnings
 *   5. AI Insights       — smart suggestions panel with spending alerts
 *   6. Weekly Spending   — daily bar chart for last 7 days (LIVE from DB)
 *   7. Budget Progress   — per-category budget tracking
 *   8. Weekend Insight   — weekend vs weekday spending comparison
 */

import { useState, useEffect, useRef } from 'react';
import { getFinancialSnapshot, getDailyTip, get7DaySpending, type GroundTruth, type DailySpending } from '../services/ai';
import { db } from '../services/db';

// ── Constants ─────────────────────────────────────────────────────────────────

const HEALTH_COLORS: Record<string, string> = {
  Excellent: '#059669', Good: '#10B981', 'Needs Work': '#F59E0B', Critical: '#EF4444',
};
const RISK_COLORS = { SAFE: '#10B981', CAUTION: '#F59E0B', DANGER: '#EF4444' };
const CAT_COLORS: Record<string, string> = {
  Food: '#F97316', Transport: '#3B82F6', Entertainment: '#8B5CF6',
  Health: '#10B981', Shopping: '#EC4899', Utilities: '#F59E0B',
  Education: '#06B6D4', Other: '#6B7280', Savings: '#059669',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent, icon, highlight, children }: {
  label: string; value: string; sub?: string; accent?: string;
  icon?: string; highlight?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0,
      border: highlight ? '1px solid rgba(5,150,105,0.3)' : undefined,
      background: highlight ? 'linear-gradient(135deg,rgba(5,150,105,0.06),rgba(16,185,129,0.03))' : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          {label}
        </div>
        {icon && <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: accent ?? 'var(--text)', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: highlight ? '#059669' : 'var(--muted)', fontWeight: highlight ? 600 : 400 }}>
          {sub}
        </div>
      )}
      {children}
    </div>
  );
}

function CategoryBar({ cat, amount, pct }: { cat: string; amount: number; pct: number }) {
  const color = CAT_COLORS[cat] ?? '#6B7280';
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{cat}</span>
        <span style={{ color: 'var(--muted)' }}>₹{amount.toLocaleString()} · {pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '4px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

// ── Balance Card ──────────────────────────────────────────────────────────────
function BalanceCard({ initialBalance, onBalanceChange }: {
  initialBalance: number | null;
  onBalanceChange: (v: number) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setInputVal(initialBalance !== null ? String(initialBalance) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commit = () => {
    const n = parseFloat(inputVal.replace(/,/g, ''));
    if (!isNaN(n) && n >= 0) {
      db.setBalance(n);
      onBalanceChange(n);
    }
    setEditing(false);
  };

  const fmt = (n: number) =>
    '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Balance
        </div>
        <span style={{ fontSize: '16px', lineHeight: 1 }}>💳</span>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="number"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={commit}
            placeholder="Enter balance"
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '16px',
              fontWeight: 700, background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(16,185,129,0.5)', color: 'var(--text)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      ) : (
        <div
          onClick={startEdit}
          style={{
            fontSize: '22px', fontWeight: 800,
            color: initialBalance !== null
              ? (initialBalance > 0 ? '#10B981' : '#EF4444')
              : 'var(--muted)',
            lineHeight: 1.1, cursor: 'pointer',
          }}
          title="Click to update balance"
        >
          {initialBalance !== null ? fmt(initialBalance) : '—'}
        </div>
      )}

      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
        {initialBalance !== null
          ? <span style={{ color: 'rgba(16,185,129,0.7)' }}>✏️ Tap to update</span>
          : <span style={{ color: '#F59E0B' }}>⚠️ Tap to set balance</span>}
      </div>
    </div>
  );
}

// ── Privacy Badge ─────────────────────────────────────────────────────────────
function PrivacyBadge() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '7px',
      background: 'linear-gradient(135deg, rgba(0,229,160,0.08), rgba(0,229,160,0.04))',
      border: '1px solid rgba(0,229,160,0.25)',
      borderRadius: '20px', padding: '6px 14px',
      fontSize: '12px', fontWeight: 700, color: '#00e5a0',
      letterSpacing: '0.02em',
    }}>
      <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
        <path d="M6.5 1L1 3.5V7c0 3.1 2.3 5.5 5.5 6.5C9.7 12.5 12 10.1 12 7V3.5L6.5 1z"
          fill="rgba(0,229,160,0.2)" stroke="#00e5a0" strokeWidth="1.2"/>
        <path d="M4 7l1.5 1.5L9 5" stroke="#00e5a0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      0 KB Sent to Cloud
    </div>
  );
}

// ── Bill Shock Alert ──────────────────────────────────────────────────────────
function BillShockAlert({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{
      padding: '14px 16px',
      background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.06))',
      border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: '14px',
      display: 'flex', gap: '12px', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>⚡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>
          Bill Shock Alert
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.6' }}>{message}</div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0, padding: '0 2px' }}
      >×</button>
    </div>
  );
}

// ── Truth-Serum Card ──────────────────────────────────────────────────────────
function TruthSerumCard({ messages }: { messages: string[] }) {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = messages.filter((_, i) => !dismissed.includes(i));
  if (visible.length === 0) return null;
  return (
    <div className="card" style={{ border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#8B5CF6' }}>
          🧪 Spending Truth-Serum
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>AI Coach asks…</div>
      </div>
      {messages.map((msg, i) => {
        if (dismissed.includes(i)) return null;
        return (
          <div key={i} style={{
            padding: '12px 14px', marginBottom: '8px',
            background: 'rgba(139,92,246,0.07)', borderRadius: '10px',
            border: '1px solid rgba(139,92,246,0.15)',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🤔</span>
            <div style={{ flex: 1, fontSize: '13px', color: 'var(--text)', lineHeight: '1.6' }}>
              {msg}
            </div>
            <button
              onClick={() => setDismissed(d => [...d, i])}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, flexShrink: 0 }}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────
type InsightSeverity = 'warning' | 'danger' | 'tip';

interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
}

const CAT_DANGER_THRESHOLDS: Record<string, number> = {
  Entertainment: 5000,
  Shopping:      8000,
  Food:          6000,
  Transport:     3000,
  Health:        5000,
  Utilities:     4000,
  Education:     5000,
  Other:         5000,
};

const CAT_DOMINANCE_PCT = 40;

function buildInsights(truth: GroundTruth, sevenDay: DailySpending[]): Insight[] {
  const insights: Insight[] = [];

  const nonSavingsTotal = Object.entries(truth.categoryBreakdown)
    .filter(([cat]) => cat !== 'Savings')
    .reduce((s, [, v]) => s + v.total, 0);

  Object.entries(truth.categoryBreakdown)
    .filter(([cat]) => cat !== 'Savings')
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, stat]) => {
      const threshold  = CAT_DANGER_THRESHOLDS[cat] ?? 5000;
      const pctOfTotal = nonSavingsTotal > 0 ? (stat.total / nonSavingsTotal) * 100 : 0;

      if (stat.total >= threshold) {
        insights.push({
          id: `cat-overspend-${cat.toLowerCase()}`,
          severity: 'danger',
          title: `🚨 High ${cat} spending — ₹${stat.total.toLocaleString('en-IN')}`,
          body: `You've spent ₹${stat.total.toLocaleString('en-IN')} on ${cat} this period, which is above the ₹${threshold.toLocaleString('en-IN')} alert threshold. That's ${pctOfTotal.toFixed(0)}% of your total expenses.`,
        });
      } else if (pctOfTotal >= CAT_DOMINANCE_PCT && stat.total > 1000) {
        insights.push({
          id: `cat-dominant-${cat.toLowerCase()}`,
          severity: 'warning',
          title: `${cat} is ${pctOfTotal.toFixed(0)}% of your spending`,
          body: `₹${stat.total.toLocaleString('en-IN')} out of ₹${nonSavingsTotal.toLocaleString('en-IN')} total went to ${cat}. Consider if this aligns with your budget goals.`,
        });
      }
    });

  const txCount = Object.values(truth.categoryBreakdown).reduce((s, c) => s + c.transactionCount, 0);
  if (txCount <= 3 && truth.totalSpent > 10000) {
    insights.push({
      id: 'large-single-tx',
      severity: 'warning',
      title: `Large purchase detected`,
      body: `You made ${txCount} transaction${txCount !== 1 ? 's' : ''} totalling ₹${truth.totalSpent.toLocaleString('en-IN')}. Large one-off purchases can skew your monthly budget — make sure this was planned.`,
    });
  }

  if (truth.weekendVsWeekday?.isHigh) {
    const { weekendTotal, weekdayTotal } = truth.weekendVsWeekday;
    const pct = weekdayTotal > 0
      ? Math.round(((weekendTotal - weekdayTotal) / weekdayTotal) * 100)
      : 0;
    insights.push({
      id: 'weekend-spike',
      severity: 'warning',
      title: 'You spent more than usual this weekend',
      body: `Weekend spending was ₹${weekendTotal.toLocaleString('en-IN')}, which is ${pct}% higher than your typical weekend average.`,
    });
  }

  // Week-over-week food increase using real category data from sevenDay
  const foodStat = truth.categoryBreakdown['Food'];
  if (foodStat && foodStat.total > 0 && sevenDay.length >= 7) {
    const thisWeekFood = sevenDay.slice(-7).reduce((s, d) => s + (d.categories?.['Food'] ?? 0), 0);
    // Use first half of available data as "prev week" proxy if we only have 7 days
    const prevWeekFood = sevenDay.slice(0, 3).reduce((s, d) => s + (d.categories?.['Food'] ?? 0), 0) * (7 / 3);
    if (prevWeekFood > 0 && thisWeekFood > prevWeekFood) {
      const pct = Math.round(((thisWeekFood - prevWeekFood) / prevWeekFood) * 100);
      const alreadyFlagged = insights.some(i => i.id === 'cat-overspend-food' || i.id === 'cat-dominant-food');
      if (!alreadyFlagged && pct > 20) {
        insights.push({
          id: 'food-increase',
          severity: 'danger',
          title: `Food expenses up ${pct}% this week`,
          body: `Your food spending rose to ₹${thisWeekFood.toLocaleString('en-IN')} this week. Worth reviewing your meal choices.`,
        });
      }
    }
  }

  if (truth.billShocks.length >= 3) {
    const totalSubs = truth.billShocks.reduce((s, b) => s + b.amount, 0);
    insights.push({
      id: 'subscription-tip',
      severity: 'tip',
      title: 'You can reduce monthly spending by adjusting subscriptions',
      body: `You have ${truth.billShocks.length} upcoming bills totalling ₹${totalSubs.toLocaleString('en-IN')}. Review which ones you actively use.`,
    });
  }

  if (truth.dailyAverage > 1000) {
    insights.push({
      id: 'high-daily-avg',
      severity: 'warning',
      title: 'Daily spending above ₹1,000',
      body: `Your average daily spend this month is ₹${truth.dailyAverage.toFixed(0)}. At this pace you'll spend ₹${Math.round(truth.dailyAverage * 30).toLocaleString('en-IN')} this month.`,
    });
  }

  insights.sort((a, b) => {
    const order = { danger: 0, warning: 1, tip: 2 };
    return order[a.severity] - order[b.severity];
  });

  return insights;
}

const INSIGHT_STYLES: Record<InsightSeverity, { bg: string; border: string; iconBg: string; iconColor: string; icon: string; labelColor: string }> = {
  warning: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(245,158,11,0.03))',
    border: '1px solid rgba(245,158,11,0.25)',
    iconBg: 'rgba(245,158,11,0.12)', iconColor: '#F59E0B', icon: '⚠', labelColor: '#F59E0B',
  },
  danger: {
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.07), rgba(239,68,68,0.03))',
    border: '1px solid rgba(239,68,68,0.25)',
    iconBg: 'rgba(239,68,68,0.12)', iconColor: '#EF4444', icon: '!', labelColor: '#EF4444',
  },
  tip: {
    bg: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(6,182,212,0.03))',
    border: '1px solid rgba(6,182,212,0.25)',
    iconBg: 'rgba(6,182,212,0.12)', iconColor: '#06B6D4', icon: '💡', labelColor: '#06B6D4',
  },
};

function AIInsightsPanel({ insights }: { insights: Insight[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = insights.filter(i => !dismissed.includes(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>✨ AI Insights</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Smart suggestions</div>
        </div>
        <div style={{
          fontSize: '10px', fontWeight: 700, color: 'var(--muted)',
          background: 'rgba(0,0,0,0.06)', borderRadius: '20px',
          padding: '3px 9px', letterSpacing: '0.05em',
        }}>
          {visible.length} insight{visible.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {visible.map(insight => {
          const s = INSIGHT_STYLES[insight.severity];
          return (
            <div key={insight.id} style={{
              padding: '12px 14px', background: s.bg, border: s.border,
              borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', background: s.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '1px',
                fontSize: insight.severity === 'tip' ? '14px' : '13px',
                fontWeight: 800, color: s.iconColor,
              }}>
                {insight.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px', lineHeight: '1.4' }}>
                  {insight.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  {insight.body}
                </div>
              </div>
              <button
                onClick={() => setDismissed(d => [...d, insight.id])}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0, padding: '0 2px', opacity: 0.6 }}
              >×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Weekly Spending Bar Chart — reads from real DailySpending data ─────────────
function WeeklySpendingChart({ data }: { data: DailySpending[] }) {
  if (!data || data.length === 0) return null;

  const days      = data.slice(-7);
  const maxAmount = Math.max(...days.map(d => d.amount), 1);
  const gridMax   = Math.ceil(maxAmount / 500) * 500 || 500;
  const gridLines = [0, gridMax * 0.25, gridMax * 0.5, gridMax * 0.75, gridMax];

  const totalSpent = days.reduce((s, d) => s + d.amount, 0);
  const peakDay    = Math.max(...days.map(d => d.amount));
  const avgPerDay  = days.length > 0 ? Math.round(totalSpent / days.length) : 0;

  const today = new Date().toISOString().split('T')[0];

  const BAR_COLOR       = '#14B8A6';
  const BAR_HOVER_COLOR = '#0D9488';

  return (
    <div className="card">
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>📅 Weekly Spending</div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Daily expenses breakdown for last 7 days</div>
      </div>

      <div style={{ display: 'flex', gap: '0', position: 'relative' }}>
        {/* Y-axis labels */}
        <div style={{
          display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between',
          height: '160px', marginRight: '8px', flexShrink: 0,
        }}>
          {gridLines.map((val, i) => (
            <div key={i} style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {val === 0 ? '₹0' : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Grid lines */}
          <div style={{ position: 'absolute', inset: 0, height: '160px', pointerEvents: 'none' }}>
            {gridLines.map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0,
                bottom: `${(i / (gridLines.length - 1)) * 100}%`,
                height: '1px',
                background: i === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.05)',
              }} />
            ))}
          </div>

          {/* Bars */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '6px',
            height: '160px', position: 'relative', zIndex: 1,
          }}>
            {days.map((d, i) => {
              const heightPct = (d.amount / gridMax) * 100;
              const isToday   = d.date === today;
              return (
                <div
                  key={d.date}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                  title={`${d.label}: ₹${d.amount.toLocaleString('en-IN')}`}
                >
                  <div style={{
                    width: '100%',
                    height: `${Math.max(heightPct, d.amount > 0 ? 2 : 0.5)}%`,
                    background: isToday
                      ? `linear-gradient(180deg, ${BAR_HOVER_COLOR}, ${BAR_COLOR})`
                      : BAR_COLOR,
                    borderRadius: '5px 5px 3px 3px',
                    opacity: isToday ? 1 : 0.82,
                    transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: isToday ? `0 -2px 8px rgba(20,184,166,0.35)` : 'none',
                  }} />
                </div>
              );
            })}
          </div>

          {/* X-axis labels — uses `label` field from DailySpending */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {days.map((d) => {
              const isToday = d.date === today;
              return (
                <div key={d.date} style={{
                  flex: 1, textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#14B8A6' : 'var(--muted)',
                }}>
                  {d.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div style={{
        display: 'flex', gap: '16px', marginTop: '16px',
        paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)',
        fontSize: '12px', flexWrap: 'wrap',
      }}>
        <div>
          <span style={{ color: 'var(--muted)' }}>Total: </span>
          <span style={{ fontWeight: 700 }}>₹{totalSpent.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>Peak: </span>
          <span style={{ fontWeight: 700 }}>₹{peakDay.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span style={{ color: 'var(--muted)' }}>Avg/day: </span>
          <span style={{ fontWeight: 700 }}>₹{avgPerDay.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardTab() {
  const [truth, setTruth]                   = useState<GroundTruth | null>(null);
  const [tip, setTip]                       = useState<string>('');
  const [loading, setLoading]               = useState(true);
  const [balance, setBalance]               = useState<number | null>(null);
  const [sevenDaySpending, setSevenDaySpending] = useState<DailySpending[]>([]);

  const load = async () => {
    try {
      const [snapshot, dailyTip, sevenDayData] = await Promise.all([
        getFinancialSnapshot(),
        getDailyTip(),
        get7DaySpending(),
      ]);
      setTruth(snapshot);
      setTip(dailyTip);
      setSevenDaySpending(sevenDayData);
      setBalance(db.getBalance());
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load().then(() => { if (!mounted) return; });
    return () => { mounted = false; };
  }, []);

  const handleBalanceChange = async (newBal: number) => {
    setBalance(newBal);
    try {
      const snapshot = await getFinancialSnapshot();
      setTruth(snapshot);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--muted)', fontSize: '14px' }}>
        Loading your financial data...
      </div>
    );
  }

  if (!truth) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
        <p style={{ fontSize: '14px' }}>Could not load dashboard. Please try refreshing.</p>
      </div>
    );
  }

  const riskColor   = RISK_COLORS[truth.riskLabel];
  const healthColor = HEALTH_COLORS[truth.healthLabel];
  const savingsGrowthStr = truth.savingsGrowthPct !== null
    ? `${truth.savingsGrowthPct >= 0 ? '↑' : '↓'} ${Math.abs(truth.savingsGrowthPct)}% vs last month`
    : 'First month of tracking';
  const topCategories = Object.entries(truth.categoryBreakdown)
    .sort((a, b) => b[1].total - a[1].total).slice(0, 5);

  const aiInsights = buildInsights(truth, sevenDaySpending);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Privacy badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrivacyBadge />
      </div>

      {/* Bill Shock Alert */}
      {truth.billShockAlert && <BillShockAlert message={truth.billShockAlert} />}

      {/* Truth-Serum */}
      {truth.truthSerumMessages.length > 0 && (
        <TruthSerumCard messages={truth.truthSerumMessages} />
      )}

      {/* 4 stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
      }}>
        <StatCard
          label="Total Spent"
          value={`₹${truth.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          sub={`${truth.daysRemainingInMonth}d left in month`}
          icon="💸"
        />
        <StatCard
          label="Transactions"
          value={String(Object.values(truth.categoryBreakdown).reduce((s, c) => s + c.transactionCount, 0))}
          sub={`Daily avg ₹${truth.dailyAverage.toFixed(0)}`}
          icon="🧾"
        />
        <BalanceCard initialBalance={balance} onBalanceChange={handleBalanceChange} />
        <StatCard
          label="Total Savings"
          value={`₹${truth.totalSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          sub={savingsGrowthStr}
          accent="#059669"
          icon="💰"
          highlight
        />
      </div>

      {/* Financial Health + Risk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Financial Health
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: healthColor }}>{truth.healthLabel}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            Savings rate: <strong style={{ color: '#059669' }}>{truth.savingsRate.toFixed(1)}%</strong>
          </div>
          <div style={{ marginTop: '10px' }}>
            <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(truth.savingsRate, 100)}%`,
                background: 'linear-gradient(90deg, #10B981, #059669)',
                borderRadius: '4px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              <span>0%</span><span style={{ color: '#059669' }}>Goal: 20%</span><span>100%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Risk Score
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: riskColor, lineHeight: 1 }}>{truth.riskScore}</span>
            <span style={{ fontSize: '13px', color: 'var(--muted)', paddingBottom: '3px' }}>/100</span>
          </div>
          <div style={{
            display: 'inline-block', marginTop: '6px',
            fontSize: '11px', fontWeight: 700, color: riskColor,
            background: `${riskColor}15`, padding: '2px 10px', borderRadius: '20px',
          }}>{truth.riskLabel}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
            {truth.riskScore <= 25 ? '✅ Excellent financial control'
              : truth.riskScore <= 45 ? '⚡ Watch your spending pace'
              : '⚠️ Take action to reduce risk'}
          </div>
        </div>
      </div>

      {/* 7-Day Insight tip */}
      {tip && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))',
          border: '1px solid rgba(16,185,129,0.15)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', color: '#10B981', textTransform: 'uppercase', marginBottom: '8px' }}>
            💡 Past 7 Days Insight
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.6' }}>{tip}</div>
        </div>
      )}

      {/* ✅ Weekly Spending Bar Chart — live data from DB */}
      <WeeklySpendingChart data={sevenDaySpending} />

      {/* AI Insights Panel */}
      {aiInsights.length > 0 && (
        <AIInsightsPanel insights={aiInsights} />
      )}

      {/* Spending Breakdown */}
      {topCategories.length > 0 && (
        <div className="card">
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>Spending Breakdown</div>
          {topCategories.map(([cat, stat]) => (
            <CategoryBar key={cat} cat={cat} amount={stat.total} pct={stat.percentage} />
          ))}
          {truth.totalSavings > 0 && (
            <>
              <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '12px 0' }} />
              <div style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 700, color: '#059669' }}>💰 Savings</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    ₹{truth.totalSavings.toLocaleString()} · {truth.savingsRate.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(5,150,105,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(truth.savingsRate * 5, 100)}%`,
                    background: 'linear-gradient(90deg, #10B981, #059669)',
                    borderRadius: '4px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Upcoming Bills */}
      {truth.billShocks.length > 0 && (
        <div className="card">
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>📋 Upcoming Bills</div>
          {truth.billShocks.map((b, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0',
              borderBottom: i < truth.billShocks.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Due in ~{b.dueInDays} days</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>₹{b.amount.toFixed(0)}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: b.canAfford ? '#10B981' : '#F59E0B' }}>
                  {b.canAfford
                    ? (balance !== null ? '✅ Covered' : '📌 Remind me')
                    : `⚡ Plan ahead`}
                </div>
              </div>
            </div>
          ))}
          {balance === null && (
            <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '8px' }}>
              💡 Set your balance above to see if you can cover upcoming bills
            </div>
          )}
        </div>
      )}

      {/* Budget Progress */}
      {truth.budgetProgress && truth.budgetProgress.length > 0 && (
        <div className="card" style={{ border: '1px solid rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.04)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
            🎯 Budget Progress
          </div>
          {truth.budgetProgress.map((budget) => {
            const statusColor =
              budget.status === 'danger'  ? '#EF4444' :
              budget.status === 'warning' ? '#F59E0B' : '#10B981';
            const statusIcon =
              budget.status === 'danger'  ? '❌' :
              budget.status === 'warning' ? '⚠️' : '✅';

            return (
              <div key={budget.category} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px' }}>{statusIcon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{budget.category}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    ₹{budget.spent.toLocaleString()} / ₹{budget.budget.toLocaleString()}
                  </div>
                </div>
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(budget.percentUsed, 100)}%`,
                    background: statusColor,
                    borderRadius: '4px',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
                  <span style={{ color: statusColor, fontWeight: 600 }}>{budget.percentUsed}%</span>
                  <span style={{ color: budget.remaining > 0 ? 'var(--muted)' : '#EF4444' }}>
                    {budget.remaining > 0 ? `₹${budget.remaining} left` : `₹${Math.abs(budget.remaining)} over`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekend vs Weekday Insight */}
      {truth.weekendVsWeekday?.message && (
        <div className="card" style={{
          border: truth.weekendVsWeekday.isHigh
            ? '1px solid rgba(239,68,68,0.25)'
            : '1px solid rgba(16,185,129,0.25)',
          background: truth.weekendVsWeekday.isHigh
            ? 'rgba(239,68,68,0.04)'
            : 'rgba(16,185,129,0.04)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            {truth.weekendVsWeekday.isHigh ? '📊 Weekend Insight' : '✅ Weekend Insight'}
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
            {truth.weekendVsWeekday.message}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--muted)' }}>Weekend: </span>
              <span style={{ fontWeight: 600 }}>₹{truth.weekendVsWeekday.weekendTotal.toLocaleString()}</span>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Weekday: </span>
              <span style={{ fontWeight: 600 }}>₹{truth.weekendVsWeekday.weekdayTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}