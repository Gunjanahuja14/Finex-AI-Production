import { useState, useEffect } from 'react';
import { aiService, LLM_MODEL_ID } from '../services/ai'; // fixed path to actual service file

export default function ModelDownloader() {
  const [isLoaded, setIsLoaded]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Initial check to see if model is already in memory
    if (aiService.isModelLoaded()) {
      setIsLoaded(true);
    }
    // aiService is a stable import and doesn't change during runtime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    setProgress(0);
    setStatusMsg('Initializing Llama 3.2...');

    try {
      // Use the logic from your aiService
      await aiService.initializeCustomModel((p: number) => {
        setProgress(Math.round(p * 100));
        if (p < 0.9) setStatusMsg(`Downloading Llama 3.2 1B (~800MB)...`);
        else setStatusMsg('Loading into device memory...');
      });

      setIsLoaded(true);
      setStatusMsg('Ready!');
    } catch (err) {
      console.error('[Model] Error:', err);
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoaded) return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(16,185,129,0.07)',
      border: '1px solid rgba(16,185,129,0.18)',
      borderRadius: '12px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#10B981' }}>MODEL READY</div>
        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>Llama 3.2 1B · On-Device · Hardware Accelerated</div>
      </div>
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );

  if (isLoading) return (
    <div style={{ padding: '16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600 }}>
           {progress < 90 ? 'DOWNLOADING ENGINE' : 'FINALIZING'}
        </span>
        <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600 }}>{progress}%</span>
      </div>
      <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#3B82F6', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px' }}>{statusMsg}</div>
    </div>
  );

  return (
    <div style={{ padding: '16px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369A1' }}>Upgrade AI Engine: Llama 3.2 1B</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Better reasoning, faster replies, runs 100% locally.</div>
        </div>
        <button onClick={download} className="btn" style={{ background: '#0369A1', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
          Get Llama
        </button>
      </div>
      {error && <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '8px' }}>{error}</div>}
    </div>
  );
}