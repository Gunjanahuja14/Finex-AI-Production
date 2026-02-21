import { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/ai'; // Make sure this path is correct
import ModelDownloader from './ModelDownloader';

const SUGGESTIONS = [
  "What's my total spending this month?",
  "Which category costs me the most?",
  "Do I have any recurring purchases?",
  "How can I reduce my food budget?",
];

export default function CoachTab() {
  const [msgs, setMsgs]             = useState<Array<{ role: string; text: string }>>([]);
  const [input, setInput]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- UPDATED: Use aiService to check readiness ---
  useEffect(() => {
    const check = () => {
      const ready = aiService.isModelLoaded();
      setModelReady(ready);
    };
    
    check();
    // Keep checking every second in case the user downloads the model while on this tab
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const ask = async (question?: string) => {
    const q = question ?? input.trim();
    if (!q || !modelReady || isLoading) return;
    
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: q }, { role: 'coach', text: '...' }]);
    setIsLoading(true);
    
    // Tiny delay to let UI update before heavy LLM processing starts
    await new Promise(r => setTimeout(r, 50));

    const handleToken = (token: string) => {
      setMsgs(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'coach') {
          updated[updated.length - 1] = { 
            role: 'coach', 
            text: last.text === '...' ? token : last.text + token 
          };
        }
        return updated;
      });
    };

    try {
      const response = await aiService.getAdvice(q, handleToken);
      setMsgs(prev => {
        const updated = [...prev];
        if (updated.length > 0) updated[updated.length - 1] = { role: 'coach', text: response };
        return updated;
      });
    } catch (err) {
      setMsgs(prev => {
        const updated = [...prev];
        if (updated.length > 0) updated[updated.length - 1] = { 
          role: 'coach', 
          text: '❌ ' + (err instanceof Error ? err.message : 'Error') 
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>

      {/* Top section: Progress & Header */}
      <div style={{ padding: '28px 32px 0', flexShrink: 0 }}>
        <ModelDownloader />
      </div>

      {/* Middle: Chat History */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {msgs.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '24px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '28px', boxShadow: '0 12px 40px rgba(16,185,129,0.35)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px', letterSpacing: '-0.4px' }}>
              Ask me about your finances
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '380px', lineHeight: 1.7, marginBottom: '36px' }}>
              I'll analyze your spending patterns using Llama 3.2 and give you personalized advice.
            </p>

            {modelReady ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '580px', width: '100%' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chip" onClick={() => ask(s)}>
                    <span className="chip-arrow">→</span>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                Waiting for Llama model to initialize...
              </p>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                gap: '10px', alignItems: 'flex-start',
              }}>
                {m.role === 'coach' && (
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: '78%', padding: '13px 18px', borderRadius: '16px',
                  background: m.role === 'user' ? '#0D1117' : '#FFFFFF',
                  color: m.role === 'user' ? '#fff' : '#111827',
                  fontSize: '14px', lineHeight: 1.65, whiteSpace: 'pre-wrap',
                  boxShadow: m.role === 'coach' ? '0 1px 6px rgba(0,0,0,0.07)' : 'none',
                  border: m.role === 'coach' ? '1px solid #F3F4F6' : 'none',
                  borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: m.role === 'coach' ? '4px' : '16px',
                }}>
                  {m.text === '...' ? (
                    <span style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
                      {[0,1,2].map(j => (
                        <span key={j} style={{
                          width: '6px', height: '6px', borderRadius: '50%', background: '#10B981',
                          display: 'inline-block',
                          animation: `bounce 0.9s ${j*0.15}s ease-in-out infinite`,
                        }}/>
                      ))}
                    </span>
                  ) : m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="coach-input-bar">
        <div style={{ 
          flex: 1, display: 'flex', alignItems: 'center', 
          background: '#fff', border: '1px solid #E5E7EB', 
          borderRadius: '14px', padding: '4px 6px 4px 18px', 
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)' 
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            // --- DYNAMIC PLACEHOLDER ---
            placeholder={modelReady ? 'Ask about your spending...' : 'Llama is initializing...'}
            onKeyDown={e => e.key === 'Enter' && !isLoading && modelReady && ask()}
            // --- DYNAMIC DISABLED STATE ---
            disabled={isLoading || !modelReady}
            style={{
              flex: 1, border: 'none', background: 'transparent', padding: '10px 0',
              fontSize: '14px', color: '#111827', outline: 'none',
              opacity: modelReady ? 1 : 0.5, width: '100%',
            }}
          />
          <button
            onClick={() => ask()}
            disabled={isLoading || !input.trim() || !modelReady}
            style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: !input.trim() || !modelReady ? '#E5E7EB' : 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none', cursor: (!input.trim() || !modelReady) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.18s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={!input.trim() || !modelReady ? '#9CA3AF' : '#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}