import { useState, useEffect } from 'react';
import { db } from '../services/db';

interface ManualBill {
  id: string; name: string; amount: number;
  cycle: 'monthly' | 'yearly' | 'weekly'; category: string; color: string;
}

const SAMPLE_BILLS: ManualBill[] = [
  { id: 's1', name: 'Netflix',  amount: 649,  cycle: 'monthly', category: 'Entertainment', color: '#e50914' },
  { id: 's2', name: 'Spotify',  amount: 119,  cycle: 'monthly', category: 'Entertainment', color: '#1db954' },
  { id: 's3', name: 'Gym',      amount: 1500, cycle: 'monthly', category: 'Health',        color: '#f59e0b' },
  { id: 's4', name: 'iCloud',   amount: 75,   cycle: 'monthly', category: 'Storage',       color: '#3b82f6' },
];

const CATEGORY_OPTIONS = ['Entertainment','Health','Utilities','Storage','Food','Transport','Education','Other'];
const COLOR_OPTIONS     = ['#e50914','#1db954','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#10b981','#f97316'];

const cycleLabel = (c: string) => c === 'weekly' ? '/week' : c === 'yearly' ? '/year' : '/month';
const toMonthly  = (a: number, c: string) => c === 'weekly' ? a * 4.33 : c === 'yearly' ? a / 12 : a;

export default function BillsTab() {
  const [detectedBills, setDetectedBills] = useState<any[]>([]);
  const [manualBills, setManualBills]     = useState<ManualBill[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [showSample, setShowSample]       = useState(false);
  const [form, setForm] = useState({
    name: '', amount: '', cycle: 'monthly' as ManualBill['cycle'],
    category: 'Entertainment', color: '#3b82f6',
  });

  useEffect(() => {
    const saved = localStorage.getItem('zenith-manual-bills');
    if (saved) setManualBills(JSON.parse(saved));
    db.getRecurring().then(b => { setDetectedBills(b); setLoading(false); });
  }, []);

  const saveBills = (updated: ManualBill[]) => {
    setManualBills(updated);
    localStorage.setItem('zenith-manual-bills', JSON.stringify(updated));
  };

  const addManual = () => {
    if (!form.name.trim() || !form.amount) return;
    saveBills([...manualBills, {
      id: Date.now().toString(), name: form.name.trim(),
      amount: parseFloat(form.amount), cycle: form.cycle,
      category: form.category, color: form.color,
    }]);
    setForm({ name: '', amount: '', cycle: 'monthly', category: 'Entertainment', color: '#3b82f6' });
    setShowForm(false);
  };

  const addSampleData = () => {
    const merged = [...manualBills];
    SAMPLE_BILLS.forEach(s => { if (!merged.find(b => b.name === s.name)) merged.push(s); });
    saveBills(merged); setShowSample(false);
  };

  const removeBill = (id: string) => saveBills(manualBills.filter(b => b.id !== id));

  const totalMonthly = manualBills.reduce((s, b) => s + toMonthly(b.amount, b.cycle), 0)
    + detectedBills.reduce((s, b) => s + b.avg, 0);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#F9FAFB', border: '1px solid #E5E7EB',
    borderRadius: '10px', color: 'var(--text)',
    fontFamily: 'var(--font-body)', fontSize: '14px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header actions ── */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={() => setShowSample(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 18px', background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
          fontFamily: 'var(--font-body)', color: 'var(--text2)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Auto Detect
        </button>
        <button onClick={() => setShowForm(!showForm)} className="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Subscription
        </button>
      </div>

      {/* ── Total Banner ── */}
      {(manualBills.length > 0 || detectedBills.length > 0) && (
        <div className="bill-banner">
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '8px' }}>
              Total Monthly Commitment
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#fff', letterSpacing: '-1px', fontFamily: 'var(--font-mono)' }}>
              ₹{totalMonthly.toFixed(0)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#9CA3AF' }}>{manualBills.length + detectedBills.length} bills tracked</div>
            <div style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '4px' }}>~₹{(totalMonthly * 12).toFixed(0)}/year</div>
          </div>
        </div>
      )}

      {/* ── Add Form ── */}
      {showForm && (
        <div className="card" style={{ border: '1px solid #10B981', boxShadow: '0 0 20px rgba(16,185,129,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>New Subscription</span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Netflix, Rent, Gym" style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Billing Cycle</label>
              <select value={form.cycle} onChange={e => setForm({ ...form, cycle: e.target.value as ManualBill['cycle'] })} style={inputStyle}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                {CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Color</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {COLOR_OPTIONS.map(c => (
                  <div key={c} onClick={() => setForm({ ...form, color: c })} style={{
                    width: '26px', height: '26px', borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                    outline: form.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px', transition: 'all 0.15s',
                  }}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button onClick={addManual} className="btn">Add Bill</button>
          </div>
        </div>
      )}

      {/* ── Sample confirm ── */}
      {showSample && (
        <div className="card" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
          <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text2)' }}>
            Add <strong>Netflix, Spotify, Gym, iCloud</strong> as sample subscriptions?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowSample(false)} className="btn-ghost">Cancel</button>
            <button onClick={addSampleData} style={{ padding: '8px 18px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px' }}>Yes, Add Sample Data</button>
          </div>
        </div>
      )}

      {/* ── Manual Subscriptions ── */}
      {manualBills.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '12px' }}>Your Subscriptions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {manualBills.map(b => (
              <div key={b.id} className="txn-row">
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: `${b.color}18`, border: `1.5px solid ${b.color}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, color: b.color, flexShrink: 0,
                }}>
                  {b.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{b.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{b.category} · {b.cycle}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: b.color, fontFamily: 'var(--font-mono)', fontSize: '15px' }}>₹{b.amount}{cycleLabel(b.cycle)}</div>
                  {b.cycle !== 'monthly' && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>₹{toMonthly(b.amount, b.cycle).toFixed(0)}/mo</div>
                  )}
                </div>
                <button onClick={() => removeBill(b.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '18px', padding: '6px', lineHeight: 1, marginLeft: '4px' }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Auto-Detected ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '12px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Auto-Detected
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px', padding: '12px 0' }}>Analyzing your transactions...</p>
        ) : detectedBills.length === 0 ? (
          <div style={{ padding: '20px', background: '#fff', borderRadius: '14px', border: '1px solid #F3F4F6' }}>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
              No recurring patterns detected yet. Log the same vendor 2+ times and it'll appear here automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {detectedBills.map((b: any, i: number) => (
              <div key={i} className="txn-row">
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(16,185,129,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                }}>
                  🍴
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', textTransform: 'capitalize' }}>{b.name ?? b.vendor}</span>
                    <span className="auto-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                      </svg>
                      Auto-detected
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>
                    {b.category} · Detected {b.count}x
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '16px' }}>₹{b.avg}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>/monthly</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!loading && manualBills.length === 0 && detectedBills.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '44px', marginBottom: '14px' }}>📋</div>
          <p style={{ fontSize: '15px', marginBottom: '8px', color: 'var(--text2)', fontWeight: 600 }}>No bills tracked yet</p>
          <p style={{ fontSize: '13px' }}>Click <strong>"+ Add Subscription"</strong> to add one manually</p>
        </div>
      )}

    </div>
  );
}