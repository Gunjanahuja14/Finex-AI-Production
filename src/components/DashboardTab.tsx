import { useState, useEffect } from 'react';
import { db } from '../services/db';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const CAT_ICONS: Record<string, string> = {
  Food: '🍴', Transport: '🚗', Entertainment: '🎬', Health: '💊',
  Shopping: '🛍️', Utilities: '💡', Education: '📚', Other: '📦',
};

const CAT_COLORS: Record<string, string> = {
  Food: '#F97316', Transport: '#3B82F6', Entertainment: '#8B5CF6',
  Health: '#10B981', Shopping: '#EC4899', Utilities: '#F59E0B',
  Education: '#06B6D4', Other: '#6B7280',
};

const PALETTE = ['#8B5CF6','#EC4899','#F97316','#3B82F6','#10B981','#F59E0B','#06B6D4','#6B7280'];

function getHealth(total: number, count: number, cats: any[]) {
  let score = 100;
  const tips: string[] = [];
  if (total > 50000)      { score -= 30; tips.push('Monthly spending is very high (>₹50,000)'); }
  else if (total > 30000) { score -= 15; tips.push('Consider reducing spending below ₹30,000/month'); }
  if (count > 60)         { score -= 10; tips.push('Too many small purchases'); }
  if (cats.length > 0) {
    const topPct = cats[0].amount / Math.max(total, 1);
    if (topPct > 0.9)       { score -= 20; tips.push(`${cats[0].category} takes 90%+ of budget`); }
    else if (topPct > 0.7)  { score -= 10; tips.push(`${cats[0].category} takes 70%+ of budget`); }
  }
  if (count >= 5) score = Math.min(score + 5, 100);
  if (cats.length >= 4) score = Math.min(score + 5, 100);
  score = Math.max(0, Math.min(100, score));
  if (tips.length === 0) tips.push(score >= 80 ? 'Your finances look healthy! 🎉' : 'Keep logging to improve your score');
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : 'At Risk';
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#3B82F6' : score >= 40 ? '#EF4444' : '#EF4444';
  return { score, label, color, tips };
}

const tooltipStyle = {
  background: '#fff', border: '1px solid #E5E7EB',
  borderRadius: '10px', fontFamily: 'DM Mono, monospace',
  fontSize: '12px', color: '#0D1117', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
};

export default function DashboardTab() {
  const [summary, setSummary]     = useState<any>(null);
  const [cats, setCats]           = useState<any[]>([]);
  const [recent, setRecent]       = useState<any[]>([]);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  useEffect(() => {
    Promise.all([db.getSummary(), db.getCategories(), db.getAll()]).then(([s, c, all]) => {
      setSummary(s); setCats(c); setRecent(all.slice(0, 5));
    });
  }, []);

  if (!summary) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <div className="spinner"/>
    </div>
  );

  const health = getHealth(summary.total, summary.count, cats);
  const circ   = 2 * Math.PI * 40;
  const dash   = circ - (health.score / 100) * circ;
  const maxCat = cats.length > 0 ? cats[0].amount : 1;

  const pieData = cats.map((c, i) => ({
    name: c.category, value: c.amount,
    color: CAT_COLORS[c.category] ?? PALETTE[i % PALETTE.length],
  }));

  const barData = cats.slice(0, 6).map((c, i) => ({
    name: c.category.slice(0, 6), amount: c.amount,
    color: CAT_COLORS[c.category] ?? PALETTE[i % PALETTE.length],
  }));

  const statCards = [
    {
      label: 'Total Spent',
      value: `₹${summary.total.toLocaleString()}`,
      footer: 'All time across all categories',
      iconBg: '#EEF2FF',
      iconColor: '#6366F1',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      ),
    },
    {
      label: 'Transactions',
      value: summary.count,
      footer: `${summary.count} in the last 30 days`,
      iconBg: '#F0FDF4',
      iconColor: '#10B981',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
    },
    {
      label: 'Daily Average',
      value: `₹${Math.round(summary.total / 30).toLocaleString()}`,
      footer: 'Average spend per day this month',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      trend: '+2.4%',
      trendUp: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Stat Cards ── */}
      <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            {s.trend && (
              <div className="stat-trend" style={{ background: s.trendUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: s.trendUp ? '#10B981' : '#EF4444' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {s.trendUp ? <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></> : <><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></>}
                </svg>
                {s.trend}
              </div>
            )}
            <div className="stat-icon-box" style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-footer">{s.footer}</div>
          </div>
        ))}
      </div>

      {/* ── Finance Health ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>

          {/* Left: ring + tips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
            <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
              <svg width="90" height="90" viewBox="0 0 96 96" className="health-ring">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#F3F4F6" strokeWidth="8"/>
                <circle cx="48" cy="48" r="40" fill="none" stroke={health.color} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash}
                  transform="rotate(-90 48 48)"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)' }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, color: health.color, lineHeight: 1 }}>{health.score}</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>/100</span>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Finance Health</div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {health.label}
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: `${health.color}15`, color: health.color }}>
                  Score {health.score}
                </span>
              </div>
              {health.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text2)', marginBottom: '4px', alignItems: 'flex-start' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: health.color, marginTop: '6px', flexShrink: 0 }}/>
                  {tip}
                </div>
              ))}
            </div>
          </div>

          {/* Right: big score display */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '20px',
            background: `${health.color}12`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 700, color: health.color, lineHeight: 1 }}>{health.score}</div>
            <div style={{ fontSize: '11px', color: health.color, fontWeight: 600, marginTop: '4px' }}>Health Score</div>
          </div>
        </div>
      </div>

      {/* ── Spending + By Category side by side ── */}
      <div className="spending-category-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Spending Breakdown */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div>
              <div className="section-label">Spending Breakdown</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>Total: ₹{summary.total.toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['pie', 'bar'] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)} style={{
                  width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                  background: chartType === t ? '#F3F4F6' : 'none',
                  border: chartType === t ? '1px solid #E5E7EB' : '1px solid transparent',
                  color: chartType === t ? 'var(--text)' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t === 'pie' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {cats.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No data yet</p>
          ) : chartType === 'pie' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={64} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Spent']} contentStyle={tooltipStyle}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pieData.map((d, i) => {
                  const pct = summary.total > 0 ? ((d.value / summary.total) * 100).toFixed(0) : '0';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }}/>
                      <span style={{ flex: 1, color: 'var(--text2)' }}>{d.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text)' }}>₹{d.value.toLocaleString()}</span>
                      <span style={{ color: 'var(--muted)', minWidth: '30px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }}/>
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }}/>
                <Tooltip formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Spent']} contentStyle={tooltipStyle}/>
                <Bar dataKey="amount" radius={[6,6,0,0]}>
                  {barData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Category */}
        <div className="card">
          <div className="section-label">By Category</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>{cats.length} categories</div>
          {cats.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No expenses yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cats.map((c: any) => {
                const color = CAT_COLORS[c.category] ?? '#6B7280';
                const pct   = ((c.amount / maxCat) * 100).toFixed(0);
                const tPct  = summary.total > 0 ? ((c.amount / summary.total) * 100).toFixed(1) : '0';
                return (
                  <div key={c.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                          {CAT_ICONS[c.category] ?? '📦'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.category}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.count} transaction{c.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px' }}>₹{c.amount.toLocaleString()}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{tPct}%</div>
                      </div>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Recent Transactions</div>
          <button style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View all
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>No transactions yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recent.map((t: any) => {
              const color = CAT_COLORS[t.category] ?? '#6B7280';
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '12px', background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
                  <div className="txn-icon" style={{ background: `${color}15` }}>{CAT_ICONS[t.category] ?? '📦'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.item}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{t.vendor ?? t.category} · {t.date}</div>
                  </div>
                  <span className="txn-amount">₹{t.amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}