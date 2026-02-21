import { useState, useEffect, useRef, useCallback } from 'react';
import { aiService } from '../services/ai';
import { ModelManager, ModelCategory } from '@runanywhere/web';
import ModelDownloader from './ModelDownloader';

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's my total spending this month?",
  "Which category costs me the most?",
  "Do I have any recurring purchases?",
  "How can I reduce my food budget?",
];

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'coach';
  text: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────
export default function CoachTab() {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  // ──────────────────────────────────────────────────────────────────────────────
  // Effects
  // ──────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    
    // Check model status
    const checkModel = () => {
      if (isMountedRef.current) {
        setModelReady(ModelManager.getLoadedModel(ModelCategory.Language) !== null);
      }
    };
    
    checkModel();
    const interval = setInterval(checkModel, 1000);
    
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────────────
  const ask = useCallback(async (question?: string) => {
    const q = question ?? input.trim();
    
    // Validation
    if (!q || !modelReady || isLoading) return;
    
    // Clear input and add user message
    setInput('');
    setIsLoading(true);
    
    // Add user message and placeholder for coach response
    setMsgs(prev => [...prev, { role: 'user', text: q }, { role: 'coach', text: '...' }]);
    
    // Small delay to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Token accumulator for batching UI updates
    const tokenBuffer = { current: '' };
    let flushScheduled = false;

    const flushBuffer = () => {
      if (tokenBuffer.current && isMountedRef.current) {
        setMsgs(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg?.role === 'coach') {
            updated[updated.length - 1] = { 
              role: 'coach', 
              text: lastMsg.text + tokenBuffer.current 
            };
          }
          return updated;
        });
        tokenBuffer.current = '';
      }
      flushScheduled = false;
    };

    // Token handler - batches updates every 50ms
    const handleToken = (token: string) => {
      tokenBuffer.current += token;
      
      if (!flushScheduled) {
        flushScheduled = true;
        setTimeout(flushBuffer, 50);
      }
    };

    try {
      const response = await aiService.getAdvice(q, handleToken);
      
      // Flush any remaining tokens
      flushBuffer();
      
      // Set final response
      if (isMountedRef.current) {
        setMsgs(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { role: 'coach', text: response };
          }
          return updated;
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setMsgs(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { 
              role: 'coach', 
              text: '❌ ' + (err instanceof Error ? err.message : 'An error occurred') 
            };
          }
          return updated;
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [input, modelReady, isLoading]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && modelReady) {
      e.preventDefault();
      ask();
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render Helpers
  // ──────────────────────────────────────────────────────────────────────────────
  const renderLoadingDots = () => (
    <span style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(j => (
        <span 
          key={j} 
          style={{
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: 'var(--primary)',
            display: 'inline-block',
            animation: `bounce 0.9s ${j * 0.15}s ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  );

  const renderMessage = (m: Message, index: number) => {
    const isUser = m.role === 'user';
    
    return (
      <div 
        key={index}
        style={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: '10px',
          alignItems: 'flex-start',
        }}
      >
        {/* Avatar */}
        {!isUser && (
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '2px',
          }}>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
        )}
        
        {/* Message Bubble */}
        <div style={{
          maxWidth: '78%',
          padding: '13px 18px',
          borderRadius: '16px',
          background: isUser ? '#0D1117' : '#FFFFFF',
          color: isUser ? '#fff' : 'var(--text)',
          fontSize: '14px',
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: isUser ? 'none' : '0 1px 6px rgba(0,0,0,0.07)',
          border: isUser ? 'none' : '1px solid #F3F4F6',
          borderBottomRightRadius: isUser ? '4px' : '16px',
          borderBottomLeftRadius: isUser ? '16px' : '4px',
        }}>
          {m.text === '...' ? renderLoadingDots() : m.text}
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      
      {/* Header with Model Downloader */}
      <div style={{ padding: '28px 32px 0', flexShrink: 0 }}>
        <ModelDownloader />
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Empty State */}
        {msgs.length === 0 ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '40px 32px', 
            textAlign: 'center' 
          }}>
            {/* AI Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '28px',
              boxShadow: '0 12px 40px rgba(16,185,129,0.35)',
            }}>
              <svg 
                width="36" 
                height="36" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            
            {/* Title */}
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 700, 
              color: 'var(--text)', 
              marginBottom: '10px', 
              letterSpacing: '-0.4px' 
            }}>
              Ask me about your finances
            </h2>
            
            {/* Subtitle */}
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--muted)', 
              maxWidth: '380px', 
              lineHeight: 1.7, 
              marginBottom: '36px' 
            }}>
              I'll analyze your spending patterns and give you personalized advice
            </p>

            {/* Suggestions */}
            {modelReady && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px', 
                maxWidth: '580px', 
                width: '100%' 
              }}>
                {SUGGESTIONS.map((suggestion, i) => (
                  <button 
                    key={i} 
                    className="chip" 
                    onClick={() => ask(suggestion)}
                    disabled={isLoading}
                  >
                    <span className="chip-arrow">→</span>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Model not ready message */}
            {!modelReady && (
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                Download a model above to get started
              </p>
            )}
          </div>
        ) : (
          /* Message Thread */
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '24px 32px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '14px' 
          }}>
            {msgs.map(renderMessage)}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="coach-input-bar">
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          background: '#fff', 
          border: '1px solid #E5E7EB', 
          borderRadius: '14px', 
          padding: '4px 6px 4px 18px', 
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)' 
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={modelReady ? 'Ask about your spending...' : 'Download model to start...'}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !modelReady}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: '10px 0',
              fontSize: '14px',
              color: 'var(--text)',
              outline: 'none',
              opacity: modelReady ? 1 : 0.5,
              width: '100%',
            }}
          />
          <button
            onClick={() => ask()}
            disabled={isLoading || !input.trim() || !modelReady}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: !input.trim() || !modelReady ? '#E5E7EB' : 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              cursor: (!input.trim() || !modelReady) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.18s',
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={!input.trim() || !modelReady ? '#9CA3AF' : '#fff'} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
