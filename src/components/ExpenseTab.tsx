import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { ALL_CATEGORIES, EXPENSE_CATEGORIES, type TransactionCategory } from '../models/Transaction';

// ── Category config ───────────────────────────────────────────────────────────

const CAT_ICONS: Record<string, string> = {
  Food: '🍴', Transport: '🚗', Entertainment: '🎬', Health: '💊',
  Shopping: '🛍️', Utilities: '💡', Education: '📚', Other: '📦',
  Savings: '💰',
};

const CAT_COLORS: Record<string, string> = {
  Food: '#F97316', Transport: '#3B82F6', Entertainment: '#8B5CF6',
  Health: '#10B981', Shopping: '#EC4899', Utilities: '#F59E0B',
  Education: '#06B6D4', Other: '#6B7280',
  Savings: '#059669', // distinct emerald — signals "positive" not "expense"
};

const emptyForm = { item: '', amount: '', category: 'Food' as TransactionCategory, vendor: '' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSavings(cat: string) {
  return cat === 'Savings';
}

export default function ExpenseTab() {
  const [txns, setTxns]           = useState<any[]>([]);
  const [filtered, setFiltered]   = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [msg, setMsg]             = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [form, setForm]           = useState(emptyForm);

  const reload = async () => {
    const all = await db.getAll();
    setTxns(all);
    applyFilter(all, search, filterCat);
  };

  const applyFilter = (all: any[], q: string, cat: string) => {
    let res = all;
    if (q) res = res.filter(t =>
      t.item.toLowerCase().includes(q.toLowerCase()) ||
      (t.vendor || '').toLowerCase().includes(q.toLowerCase())
    );
    if (cat !== 'All') res = res.filter(t => t.category === cat);
    setFiltered(res);
  };

  useEffect(() => { reload(); }, []);

  const handleSearch = (q: string) => { setSearch(q); applyFilter(txns, q, filterCat); };
  const handleCat    = (cat: string) => { setFilterCat(cat); applyFilter(txns, search, cat); };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const openAdd = () => {
    setEditingId(null); setForm(emptyForm); setShowForm(true); setMsg('');
  };
  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({ item: t.item, amount: String(t.amount), category: t.category, vendor: t.vendor ?? '' });
    setShowForm(true); setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    const amount = parseFloat(form.amount);
    if (!form.item.trim()) { flash('❌ Enter a description'); return; }
    if (!amount || amount <= 0) { flash('❌ Enter a valid amount'); return; }

    const label = isSavings(form.category) ? 'Saving' : 'Expense';

    if (editingId !== null) {
      await db.update(editingId, {
        amount,
        category: form.category,
        item: form.item.trim(),
        vendor: form.vendor.trim() || null,
      });
      flash(`✅ ${label} updated`);
    } else {
      await db.add({
        amount,
        category: form.category,
        item: form.item.trim(),
        vendor: form.vendor.trim() || null,
        date: new Date().toISOString().split('T')[0],
      });
      flash(
        isSavings(form.category)
          ? `💰 Saved ₹${amount.toLocaleString()} · ${form.item} — great move!`
          : `✅ Added ₹${amount.toLocaleString()} · ${form.item}`
      );
    }
    setForm(emptyForm); setShowForm(false); setEditingId(null); reload();
  };

  const confirmDelete = async (id: number) => {
    await db.remove(id); setDeleteId(null); flash('🗑️ Deleted'); reload();
  };

  // Separate totals
  const totalExpenses = txns
    .filter(t => t.category !== 'Savings')
    .reduce((s, t) => s + t.amount, 0);
  const totalSavings = txns
    .filter(t => t.category === 'Savings')
    .reduce((s, t) => s + t.amount, 0);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: '#F9FAFB', border: '1px solid #E5E7EB',
    borderRadius: '10px', color: 'var(--text)',
    fontFamily: 'var(--font-body)', fontSize: '14px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {txns.filter(t => t.category !== 'Savings').length} expenses · ₹{totalExpenses.toLocaleString()}
          </div>
          {totalSavings > 0 && (
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              💰 ₹{totalSavings.toLocaleString()} saved this period
            </div>
          )}
        </div>
        <button onClick={openAdd} className="btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Transaction
        </button>
      </div>

      {/* ── Flash message ── */}
      {msg && (
        <div style={{
          padding: '11px 16px',
          background: msg.startsWith('❌') ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)',
          border: `1px solid ${msg.startsWith('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
          borderRadius: '10px', fontSize: '13px',
        }}>
          {msg}
        </div>
      )}

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div
          className="card"
          style={{
            border: `1px solid ${isSavings(form.category) ? '#059669' : '#10B981'}`,
            boxShadow: `0 0 20px ${isSavings(form.category) ? 'rgba(5,150,105,0.15)' : 'rgba(16,185,129,0.1)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>
                {editingId !== null ? 'Edit Transaction' : 'New Transaction'}
              </span>
              {isSavings(form.category) && (
                <span style={{
                  marginLeft: '10px', fontSize: '11px', fontWeight: 700,
                  color: '#059669', background: 'rgba(5,150,105,0.1)',
                  padding: '2px 8px', borderRadius: '20px',
                }}>
                  WEALTH BUILDING
                </span>
              )}
            </div>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
            >×</button>
          </div>

          {/* Category selector */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
              Category
            </div>

            {/* Expense categories */}
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Expenses
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {EXPENSE_CATEGORIES.map(cat => {
                const active = form.category === cat;
                const color  = CAT_COLORS[cat];
                return (
                  <button key={cat} onClick={() => setForm({ ...form, category: cat })} style={{
                    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px',
                    border: active ? 'none' : '1px solid #E5E7EB',
                    background: active ? color : '#F9FAFB',
                    color: active ? '#fff' : 'var(--text2)',
                    fontWeight: active ? 700 : 400,
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}>
                    {CAT_ICONS[cat]} {cat}
                  </button>
                );
              })}
            </div>

            {/* Savings — visually separated */}
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#059669', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Wealth Building
            </div>
            <button
              onClick={() => setForm({ ...form, category: 'Savings' })}
              style={{
                padding: '8px 18px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px',
                border: form.category === 'Savings' ? 'none' : '2px dashed #059669',
                background: form.category === 'Savings' ? '#059669' : 'rgba(5,150,105,0.06)',
                color: form.category === 'Savings' ? '#fff' : '#059669',
                fontWeight: 700, fontFamily: 'var(--font-body)', transition: 'all 0.15s',
              }}
            >
              💰 Savings / Investment
            </button>
          </div>

          {/* Savings context hint */}
          {isSavings(form.category) && (
            <div style={{
              padding: '10px 14px', marginBottom: '14px',
              background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.2)',
              borderRadius: '10px', fontSize: '12px', color: '#059669',
            }}>
              ✅ This will <strong>not</strong> count as an expense. It increases your Savings total and improves your Financial Health Score.
            </div>
          )}

          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '7px', textTransform: 'uppercase' }}>
                {isSavings(form.category) ? 'Description (e.g. SIP, Emergency Fund)' : 'Description'}
              </div>
              <input
                value={form.item}
                onChange={e => setForm({ ...form, item: e.target.value })}
                placeholder={isSavings(form.category) ? 'e.g. SIP, Emergency Fund, FD...' : 'e.g. Pizza, Uber, Netflix...'}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '7px', textTransform: 'uppercase' }}>Amount (₹)</div>
              <input
                type="number" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && save()}
                placeholder="0.00" style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '7px', textTransform: 'uppercase' }}>
                {isSavings(form.category) ? 'Platform (optional)' : 'Vendor (optional)'}
              </div>
              <input
                value={form.vendor}
                onChange={e => setForm({ ...form, vendor: e.target.value })}
                placeholder={isSavings(form.category) ? 'e.g. Zerodha, HDFC, Groww...' : 'e.g. Dominos, Swiggy...'}
                style={inputStyle}
              />
            </div>
          </div>

          <button
            onClick={save}
            className="btn"
            style={{
              marginTop: '16px', width: '100%', padding: '12px',
              justifyContent: 'center', fontSize: '14px',
              background: isSavings(form.category) ? '#059669' : undefined,
            }}
          >
            {editingId !== null
              ? '💾 Save Changes'
              : isSavings(form.category)
                ? '💰 Record Savings'
                : '+ Add Expense'}
          </button>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteId !== null && (
        <div style={{
          padding: '14px 18px', background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '12px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Delete this transaction?</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setDeleteId(null)} className="btn-ghost">Cancel</button>
            <button onClick={() => confirmDelete(deleteId)} className="btn-danger">Delete</button>
          </div>
        </div>
      )}

      {/* ── Search + Filter ── */}
      <div className="filter-row" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search transactions..."
            style={{ ...inputStyle, paddingLeft: '42px' }}
          />
        </div>
        <select
          value={filterCat} onChange={e => handleCat(e.target.value)}
          style={{
            width: '140px', padding: '10px 14px',
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: '10px', color: 'var(--text)',
            fontFamily: 'var(--font-body)', fontSize: '14px',
          }}
        >
          <option value="All">All</option>
          {ALL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Transaction list ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>💸</div>
          <p style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--text2)' }}>No transactions yet</p>
          <p style={{ fontSize: '12px' }}>Tap "+ Add Transaction" to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((t: any) => {
            const color     = CAT_COLORS[t.category] ?? '#6B7280';
            const isSav     = isSavings(t.category);
            return (
              <div key={t.id} className="txn-row">
                <div className="txn-icon" style={{ background: `${color}15` }}>
                  {CAT_ICONS[t.category] ?? '📦'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{t.item}</span>
                    <span className="cat-badge" style={{ background: `${color}15`, color }}>
                      {t.category}
                    </span>
                    {isSav && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, color: '#059669',
                        background: 'rgba(5,150,105,0.1)', padding: '1px 6px', borderRadius: '10px',
                      }}>
                        SAVED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>
                    {t.vendor ? `${t.vendor} · ` : ''}{t.date}
                  </div>
                </div>
                {/* Savings shown in green, expenses in default */}
                <span
                  className="txn-amount"
                  style={isSav ? { color: '#059669' } : undefined}
                >
                  {isSav ? '+' : ''}₹{t.amount.toLocaleString()}
                </span>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                  <button onClick={() => openEdit(t)} style={{
                    width: '34px', height: '34px', background: 'rgba(59,130,246,0.08)',
                    border: 'none', borderRadius: '8px', color: '#3B82F6', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => setDeleteId(t.id)} style={{
                    width: '34px', height: '34px', background: 'rgba(239,68,68,0.08)',
                    border: 'none', borderRadius: '8px', color: '#EF4444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}