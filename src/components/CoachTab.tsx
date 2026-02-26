import { useState, useEffect, useRef, useCallback } from 'react';
import { initAI, askCoach, getDailyTip, getFinancialSnapshot, isAIReady, type AIModelState } from '../services/ai';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  type?: 'truth-serum' | 'bill-shock' | 'normal';
};

function DownloadScreen({ state, onStart }: { state: AIModelState; onStart: () => void }) {
  const isLoading = state.status === 'downloading' || state.status === 'initializing';
  return (
    <div className="coach-download-screen">
      <div className="coach-download-card">
        <div className="coach-brain-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="var(--accent)" strokeWidth="2"/>
            <path d="M18 28c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="28" cy="34" r="4" fill="var(--accent)"/>
            <path d="M24 28v-4M32 28v-4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="coach-dl-title">FINEX Coach</h2>
        <p className="coach-dl-subtitle">
          Powered by Gemma 2B — runs locally, reads your real transactions.
        </p>
        <div className="coach-model-badge">Gemma 2B · Q4_K_M · ~1.5 GB · One-time download</div>
        {state.status === 'idle' && (
          <button className="coach-dl-button" onClick={onStart}>Download & Activate</button>
        )}
        {isLoading && (
          <div className="coach-progress-wrap">
            <div className="coach-progress-label">
              {state.status === 'initializing' ? 'Initializing model…' : `Downloading… ${state.progress}%`}
            </div>
            <div className="coach-progress-track">
              <div className="coach-progress-fill" style={{ width: `${state.progress}%` }}/>
            </div>
            <div className="coach-progress-note">Only downloads once. Loads from cache next time.</div>
          </div>
        )}
        {state.status === 'error' && (
          <div className="coach-error">
            <span>⚠ {state.error ?? 'Failed to load model'}</span>
            <button className="coach-retry-btn" onClick={onStart}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  // Truth-Serum messages get a special purple style
  const isTruthSerum  = message.type === 'truth-serum';
  const isBillShock   = message.type === 'bill-shock';

  return (
    <div className={`coach-bubble-wrap ${message.role}`}>
      {message.role === 'assistant' && (
        <div className="coach-avatar" style={{
          background: isTruthSerum ? '#8B5CF6' : isBillShock ? '#EF4444' : 'var(--accent)',
        }}>
          {isTruthSerum ? '🧪' : isBillShock ? '⚡' : 'F'}
        </div>
      )}
      <div
        className={`coach-bubble ${message.role}`}
        style={
          isTruthSerum ? { borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)' } :
          isBillShock  ? { borderColor: 'rgba(239,68,68,0.3)',  background: 'rgba(239,68,68,0.06)' } :
          undefined
        }
      >
        {isTruthSerum && (
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
            Spending Truth-Serum
          </div>
        )}
        {isBillShock && (
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>
            Bill Shock Alert
          </div>
        )}
        {message.content}
        {message.streaming && <span className="coach-cursor"/>}
      </div>
    </div>
  );
}

export default function CoachTab() {
  const [modelState, setModelState] = useState<AIModelState>({ status: 'idle', progress: 0 });
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dailyTip, setDailyTip]     = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isAIReady()) {
      setModelState({ status: 'ready', progress: 100 });
      loadContextualMessages();
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setModelState({ status: 'downloading', progress: 0 });
    try {
      await initAI((state) => setModelState(state));
      loadContextualMessages();
    } catch {}
  }, []);

  // Load daily tip + inject Truth-Serum / Bill Shock as first messages
  const loadContextualMessages = useCallback(async () => {
    try {
      const [tip, snapshot] = await Promise.all([getDailyTip(), getFinancialSnapshot()]);
      setDailyTip(tip);

      const proactiveMessages: Message[] = [];

      // Bill Shock alert → inject as first assistant message
      if (snapshot.billShockAlert) {
        proactiveMessages.push({
          id:      'bill-shock-0',
          role:    'assistant',
          content: snapshot.billShockAlert,
          type:    'bill-shock',
        });
      }

      // Truth-Serum anomaly questions → inject after bill shock
      snapshot.truthSerumMessages.forEach((msg, i) => {
        proactiveMessages.push({
          id:      `truth-serum-${i}`,
          role:    'assistant',
          content: msg,
          type:    'truth-serum',
        });
      });

      if (proactiveMessages.length > 0) {
        setMessages(proactiveMessages);
      }
    } catch {}
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating || !isAIReady()) return;

    const userMsg: Message      = { id: Date.now().toString(), role: 'user', content: text, type: 'normal' };
    const assistantId           = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: true, type: 'normal' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsGenerating(true);

    let accumulated = '';
    try {
      const answer = await askCoach(text);
      accumulated = answer;
      const words = answer.split(' ');
      let built = '';
      for (const word of words) {
        built += (built ? ' ' : '') + word;
        const snapshot = built;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: snapshot } : m)
        );
        await new Promise(r => setTimeout(r, 28));
      }
    } catch {
      accumulated = 'Sorry, something went wrong. Please try again.';
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
      );
    } finally {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: accumulated, streaming: false } : m)
      );
      setIsGenerating(false);
      inputRef.current?.focus();
    }
  }, [input, isGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (modelState.status !== 'ready') {
    return <><CoachStyles/><DownloadScreen state={modelState} onStart={handleDownload}/></>;
  }

  const hasProactiveMessages = messages.some(m => m.type === 'truth-serum' || m.type === 'bill-shock');

  return (
    <>
      <CoachStyles/>
      <div className="coach-root">
        <div className="coach-header">
          <div className="coach-header-left">
            <div className="coach-status-dot"/>
            <span className="coach-header-title">FINEX Coach</span>
          </div>
          <span className="coach-header-badge">Local AI · 0 KB to Cloud</span>
        </div>

        {dailyTip && (
          <div className="coach-tip-banner">
            <span className="coach-tip-icon">💡</span>
            <p className="coach-tip-text">{dailyTip}</p>
          </div>
        )}

        <div className="coach-messages">
          {messages.length === 0 && (
            <div className="coach-empty">
              <p>Ask me anything about your finances.</p>
              <div className="coach-suggestions">
                {[
                  'Where did I spend the most?',
                  'How much have I saved?',
                  'Am I on track this month?',
                  'What are my upcoming bills?',
                ].map(s => (
                  <button key={s} className="coach-suggestion-chip"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show suggestion chips even when proactive messages are present */}
          {messages.length > 0 && !hasProactiveMessages && messages.every(m => m.role !== 'user') && (
            <div className="coach-suggestions" style={{ padding: '0 0 8px' }}>
              {['Tell me more', 'How to improve?', 'Show my savings'].map(s => (
                <button key={s} className="coach-suggestion-chip"
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map(m => <ChatBubble key={m.id} message={m}/>)}
          <div ref={bottomRef}/>
        </div>

        <div className="coach-input-bar">
          <textarea
            ref={inputRef}
            className="coach-input"
            placeholder="Reply to your coach…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isGenerating}
          />
          <button className="coach-send-btn" onClick={sendMessage}
            disabled={isGenerating || !input.trim()}>
            {isGenerating
              ? <span style={{ width:16, height:16, border:'2px solid #000', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }}/>
              : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M18 10L2 2l4 8-4 8 16-8z" fill="currentColor"/></svg>
            }
          </button>
        </div>
      </div>
    </>
  );
}

function CoachStyles() {
  return (
    <style>{`
      :root {
        --accent: #00e5a0; --accent-dim: rgba(0,229,160,0.15);
        --bg: #0d1117; --surface: #161b22; --surface2: #1e2530;
        --text: #e6edf3; --text-muted: #7d8590; --border: #30363d;
        --radius: 14px; --radius-sm: 8px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

      .coach-root { display:flex; flex-direction:column; height:100%; min-height:0; background:var(--bg); font-family:'SF Pro Text','Segoe UI',system-ui,sans-serif; color:var(--text); }
      .coach-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--border); background:var(--surface); flex-shrink:0; }
      .coach-header-left { display:flex; align-items:center; gap:8px; }
      .coach-status-dot { width:8px; height:8px; border-radius:50%; background:var(--accent); box-shadow:0 0 6px var(--accent); animation:pulse 2s infinite; }
      .coach-header-title { font-size:15px; font-weight:600; }
      .coach-header-badge { font-size:11px; color:var(--accent); background:var(--accent-dim); border:1px solid rgba(0,229,160,0.3); padding:2px 8px; border-radius:20px; }

      .coach-tip-banner { display:flex; align-items:flex-start; gap:10px; margin:12px 16px 0; padding:12px 14px; background:var(--accent-dim); border:1px solid rgba(0,229,160,0.25); border-radius:var(--radius-sm); flex-shrink:0; }
      .coach-tip-icon { font-size:16px; flex-shrink:0; }
      .coach-tip-text { font-size:13px; color:var(--text); margin:0; line-height:1.5; }

      .coach-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; min-height:0; }
      .coach-messages::-webkit-scrollbar { width:4px; }
      .coach-messages::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }

      .coach-empty { display:flex; flex-direction:column; align-items:center; gap:16px; padding:40px 20px; text-align:center; color:var(--text-muted); font-size:14px; }
      .coach-suggestions { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
      .coach-suggestion-chip { background:var(--surface2); border:1px solid var(--border); color:var(--text); padding:8px 14px; border-radius:20px; font-size:13px; cursor:pointer; transition:all 0.15s; }
      .coach-suggestion-chip:hover { border-color:var(--accent); color:var(--accent); background:var(--accent-dim); }

      .coach-bubble-wrap { display:flex; align-items:flex-end; gap:8px; }
      .coach-bubble-wrap.user { flex-direction:row-reverse; }
      .coach-avatar { width:28px; height:28px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#000; flex-shrink:0; }
      .coach-bubble { max-width:80%; padding:10px 14px; border-radius:var(--radius); font-size:14px; line-height:1.6; white-space:pre-wrap; word-break:break-word; }
      .coach-bubble.user { background:#1a3a5c; border-bottom-right-radius:4px; }
      .coach-bubble.assistant { background:var(--surface2); border:1px solid var(--border); border-bottom-left-radius:4px; }
      .coach-cursor { display:inline-block; width:2px; height:14px; background:var(--accent); margin-left:2px; vertical-align:middle; animation:blink 0.7s infinite; }

      .coach-input-bar { display:flex; align-items:flex-end; gap:10px; padding:12px 16px; border-top:1px solid var(--border); background:var(--surface); flex-shrink:0; }
      .coach-input { flex:1; background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text); padding:10px 14px; font-size:14px; font-family:inherit; resize:none; outline:none; line-height:1.5; max-height:120px; transition:border-color 0.15s; }
      .coach-input:focus { border-color:var(--accent); }
      .coach-input::placeholder { color:var(--text-muted); }
      .coach-send-btn { width:40px; height:40px; border-radius:10px; background:var(--accent); border:none; color:#000; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s; }
      .coach-send-btn:hover:not(:disabled) { background:#00ffb3; transform:scale(1.05); }
      .coach-send-btn:disabled { opacity:0.4; cursor:not-allowed; }

      .coach-download-screen { display:flex; align-items:center; justify-content:center; height:100%; background:var(--bg); padding:24px; font-family:'SF Pro Text','Segoe UI',system-ui,sans-serif; }
      .coach-download-card { width:100%; max-width:420px; background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:36px 32px; display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; }
      .coach-dl-title { font-size:22px; font-weight:700; color:var(--text); margin:0; }
      .coach-dl-subtitle { font-size:14px; color:var(--text-muted); margin:0; line-height:1.6; }
      .coach-model-badge { font-size:12px; color:var(--accent); background:var(--accent-dim); border:1px solid rgba(0,229,160,0.3); padding:5px 14px; border-radius:20px; }
      .coach-dl-button { width:100%; padding:14px; background:var(--accent); border:none; border-radius:var(--radius-sm); color:#000; font-size:15px; font-weight:600; cursor:pointer; margin-top:4px; transition:all 0.2s; }
      .coach-dl-button:hover { background:#00ffb3; transform:translateY(-1px); }
      .coach-progress-wrap { width:100%; display:flex; flex-direction:column; gap:8px; }
      .coach-progress-label { font-size:13px; color:var(--text-muted); }
      .coach-progress-track { width:100%; height:6px; background:var(--surface2); border-radius:3px; overflow:hidden; }
      .coach-progress-fill { height:100%; background:var(--accent); border-radius:3px; transition:width 0.3s ease; box-shadow:0 0 8px var(--accent); }
      .coach-progress-note { font-size:11px; color:var(--text-muted); }
      .coach-error { display:flex; flex-direction:column; align-items:center; gap:10px; font-size:13px; color:#f85149; background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.3); border-radius:var(--radius-sm); padding:12px 16px; width:100%; }
      .coach-retry-btn { background:none; border:1px solid #f85149; color:#f85149; padding:6px 16px; border-radius:6px; cursor:pointer; font-size:13px; }
      .coach-retry-btn:hover { background:rgba(248,81,73,0.1); }
    `}</style>
  );
}