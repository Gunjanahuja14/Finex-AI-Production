import { useState, useEffect, useRef } from 'react';
import { initSDK } from './sdk';
import { db } from './services/db';
import DashboardTab from './components/DashboardTab';
import ExpenseTab from './components/ExpenseTab';
import CoachTab from './components/CoachTab';
import BillsTab from './components/BillsTab';

type Tab = 'dashboard' | 'expense' | 'coach' | 'bills';

const TABS: { id: Tab; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard', label: 'Dashboard', sub: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'expense', label: 'Expenses', sub: 'Transactions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    id: 'coach', label: 'Coach', sub: 'AI Advisor',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'bills', label: 'Bills', sub: 'Subscriptions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2"/>
        <line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function App() {
  const [ready, setReady]         = useState(false);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState<Tab>('dashboard');
  const [showClear, setShowClear] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    Promise.all([initSDK(), db.initialize()])
      .then(() => setReady(true))
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const toggleBtn = document.querySelector('.mobile-nav-toggle');
        if (toggleBtn && !toggleBtn.contains(event.target as Node)) {
          setMobileMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setMobileMenuOpen(false);
  };

  const clearAllData = () => {
    localStorage.removeItem('finex-txns');
    localStorage.removeItem('finex-manual-bills');
    location.reload();
  };

  if (error) return (
    <div className="app-loading">
      <div style={{ fontSize: '32px' }}>⚠️</div>
      <p style={{ color: '#EF4444', fontSize: '13px' }}>{error}</p>
      <button className="btn" onClick={() => location.reload()}>Reload</button>
    </div>
  );

  if (!ready) return (
    <div className="app-loading">
      <div className="spinner" />
      <p style={{ fontSize: '12px', color: '#9CA3AF', letterSpacing: '0.08em', marginTop: '12px' }}>INITIALIZING...</p>
    </div>
  );

  const isCoach = tab === 'coach';

  return (
    <div className="app-shell">

      {/* Mobile Navigation Toggle */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {mobileMenuOpen ? (
            <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
          ) : (
            <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      <div
        className={`mobile-nav-overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside
        ref={sidebarRef}
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
      >

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ background: 'transparent', padding: 0, borderRadius: '10px', overflow: 'hidden' }}>
            <img
              src="/finex-logo.png"
              alt="Finex AI"
              style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', display: 'block' }}
            />
          </div>
          {!collapsed && (
            <div>
              <div className="logo-name">Finex</div>
              <div className="logo-sub">AI FINANCE</div>
            </div>
          )}
        </div>

        {/* Nav section label */}
        {!collapsed && (
          <div className="sidebar-section-label">Navigation</div>
        )}

        {/* Nav items */}
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`sidebar-item ${tab === t.id ? 'active' : ''}`}
              onClick={() => handleTabChange(t.id)}
            >
              <span className="sidebar-icon">{t.icon}</span>
              {!collapsed && (
                <span className="sidebar-text">
                  <span className="sidebar-label">{t.label}</span>
                  <span className="sidebar-sub">{t.sub}</span>
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Collapse btn */}
        <button
          className="sidebar-collapse hide-mobile"
          onClick={() => setCollapsed(!collapsed)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="9 18 15 12 9 6"/>
              : <polyline points="15 18 9 12 15 6"/>
            }
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      {/* ── Main ── */}
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''} ${isCoach ? 'coach-mode' : ''}`}>

        {tab === 'dashboard' && (
          <div className="topbar">
            <div>
              <h1 className="page-greeting">{getGreeting()} 👋</h1>
              <p className="page-sub-date">{getFormattedDate()} · Here's your financial summary</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="privacy-badge hide-mobile">
                <span className="privacy-dot"/>
                Privacy-First · On-Device AI
              </div>
              <button className="icon-btn" onClick={() => setShowClear(!showClear)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {tab === 'expense' && (
          <div className="page-header-row">
            <div>
              <h1 className="page-title-lg">Expenses</h1>
            </div>
            <button className="icon-btn" onClick={() => setShowClear(!showClear)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
            </button>
          </div>
        )}

        {tab === 'bills' && (
          <div className="page-header-row">
            <div>
              <h1 className="page-title-lg">Recurring Bills</h1>
              <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '2px' }}>Track subscriptions and detected recurring spending</p>
            </div>
            <button className="icon-btn" onClick={() => setShowClear(!showClear)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
            </button>
          </div>
        )}

        {showClear && (
          <div className="clear-banner">
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#EF4444' }}>Clear All Data</div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>Permanently deletes all transactions and bills.</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowClear(false)} className="btn-ghost">Cancel</button>
              <button onClick={clearAllData} className="btn-danger">Clear All</button>
            </div>
          </div>
        )}

        <div className={`tab-content ${isCoach ? 'tab-coach' : ''}`} key={tab}>
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'expense'   && <ExpenseTab />}
          {tab === 'coach'     && <CoachTab />}
          {tab === 'bills'     && <BillsTab />}
        </div>
      </main>
    </div>
  );
}