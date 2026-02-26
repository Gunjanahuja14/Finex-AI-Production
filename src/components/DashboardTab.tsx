/**
 * DashboardTab.tsx — FINEX-AI
 * Features:
 *   1. Balance Card      — user-entered real balance, editable inline
 *   2. Bill Shock Alert  — predictive narrative: "You'll be ₹X short"
 *   3. Privacy Scorecard — "0 KB Sent to Cloud" badge
 *   4. Truth-Serum       — anomaly coaching questions, not flat warnings
 */

import { useState, useEffect, useRef } from 'react';
import { getFinancialSnapshot, getDailyTip, type GroundTruth } from '../services/ai';
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

// ── Balance Card — editable, stored in localStorage ───────────────────────────
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

// ── Privacy Scorecard Badge ───────────────────────────────────────────────────
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
      {/* Shield icon */}
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

// ── Truth-Serum Anomaly Card ──────────────────────────────────────────────────
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardTab() {
  const [truth, setTruth]       = useState<GroundTruth | null>(null);
  const [tip, setTip]           = useState<string>('');
  const [loading, setLoading]   = useState(true);
  const [balance, setBalance]   = useState<number | null>(null);

  const load = async () => {
    try {
      const [snapshot, dailyTip] = await Promise.all([
        getFinancialSnapshot(),
        getDailyTip(),
      ]);
      setTruth(snapshot);
      setTip(dailyTip);
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
    // Reload snapshot so bill shocks recalculate with new balance
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Privacy Scorecard ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrivacyBadge />
      </div>

      {/* ── Bill Shock Alert (shown only when real balance set + shortfall) ── */}
      {truth.billShockAlert && <BillShockAlert message={truth.billShockAlert} />}

      {/* ── Truth-Serum Anomaly Coaching ──────────────────────────────────── */}
      {truth.truthSerumMessages.length > 0 && (
        <TruthSerumCard messages={truth.truthSerumMessages} />
      )}

      {/* ── 4 stat cards ─────────────────────────────────────────────────── */}
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

        {/* ── Balance Card (replaces Daily Average) ── */}
        <BalanceCard initialBalance={balance} onBalanceChange={handleBalanceChange} />

        {/* ── Total Savings ── */}
        <StatCard
          label="Total Savings"
          value={`₹${truth.totalSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          sub={savingsGrowthStr}
          accent="#059669"
          icon="💰"
          highlight
        />
      </div>

      {/* ── Financial Health + Risk ───────────────────────────────────────── */}
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

      {/* ── Daily Insight ─────────────────────────────────────────────────── */}
      {tip && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))',
          border: '1px solid rgba(16,185,129,0.15)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', color: '#10B981', textTransform: 'uppercase', marginBottom: '8px' }}>
            💡 Today's Insight
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.6' }}>{tip}</div>
        </div>
      )}

      {/* ── Spending Breakdown ────────────────────────────────────────────── */}
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

      {/* ── Upcoming Bills (informational, no false shortfalls) ───────────── */}
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

    </div>
  );
}