import { useState, useEffect, useRef } from 'react';
import { ModelManager, ModelCategory } from '@runanywhere/web';

const MODEL_ID = 'lfm2-350m-q4_k_m';

export default function ModelDownloader() {
  const [isLoaded, setIsLoaded]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const isLoadingRef = useRef(false);

  useEffect(() => {
    tryLoadFromCache();
    const iv = setInterval(() => {
      if (!isLoadingRef.current && ModelManager.getLoadedModel(ModelCategory.Language)) setIsLoaded(true);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const tryLoadFromCache = async () => {
    try {
      if (ModelManager.getLoadedModel(ModelCategory.Language)) {
        setIsLoaded(true);
        return;
      }
      setStatusMsg('Checking for cached model...');
      try {
        await ModelManager.loadModel(MODEL_ID);
      } catch {
        console.log('[Model] Not in cache, needs download');
        setStatusMsg('');
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
      if (ModelManager.getLoadedModel(ModelCategory.Language)) {
        setIsLoaded(true);
      } else {
        setStatusMsg('');
      }
    } catch {
      setStatusMsg('');
    }
  };

  const waitForModel = async (): Promise<boolean> => {
    setStatusMsg('Model loading, please wait...');
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const model = ModelManager.getLoadedModel(ModelCategory.Language);
      if (model) {
        console.log('[Model] Loaded after', i + 1, 'seconds');
        return true;
      }
      if (i % 10 === 0) setStatusMsg(`Still loading... ${i + 1}s`);
    }
    return false;
  };

  const download = async () => {
    setIsLoading(true);
    isLoadingRef.current = true;
    setError('');
    setProgress(0);
    setStatusMsg('Starting download...');

    try {
      setProgress(20);
      setStatusMsg('Downloading LFM2 350M model (~250 MB)...');

      await ModelManager.downloadModel(MODEL_ID);

      setProgress(70);
      setStatusMsg('Download complete! Loading into memory...');

      await ModelManager.loadModel(MODEL_ID);

      setProgress(90);
      setStatusMsg('Verifying model...');

      let model = ModelManager.getLoadedModel(ModelCategory.Language);

      if (!model) {
        setStatusMsg('Model loading (this may take a moment)...');
        const success = await waitForModel();
        model = success ? ModelManager.getLoadedModel(ModelCategory.Language) : null;
      }

      if (model) {
        setProgress(100);
        setIsLoaded(true);
        setStatusMsg('Ready!');
        console.log('[Model] LFM2 350M loaded successfully!');
      } else {
        throw new Error('Model failed to load. Please refresh and try again.');
      }
    } catch (err) {
      console.error('[Model] Error:', err);
      setError(err instanceof Error ? err.message : 'Download failed. Please try again.');
      setProgress(0);
      setStatusMsg('');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
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
        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>On-device AI · LFM2 350M · CPU mode</div>
      </div>
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );

  if (isLoading) return (
    <div style={{ padding: '16px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600, letterSpacing: '0.06em' }}>
          {progress < 70 ? 'DOWNLOADING MODEL' : 'LOADING INTO MEMORY'}
        </span>
        <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 600 }}>{progress}%</span>
      </div>
      <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '99px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3B82F6, #10B981)', borderRadius: '99px', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{statusMsg}</div>
      {progress < 70 && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>⚡ Keep this tab open - downloading ~250MB</div>}
    </div>
  );

  return (
    <div style={{ padding: '16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400E', marginBottom: '3px' }}>
            AI Model Required · LFM2 350M
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>~250 MB · Downloads once · Cached locally forever</div>
        </div>
        <button onClick={download} className="btn" style={{ flexShrink: 0, padding: '9px 18px', fontSize: '13px' }}>
          ↓ Download Model
        </button>
      </div>
      {error && (
        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '12px', color: '#EF4444' }}>
          {error}
        </div>
      )}
      {statusMsg && <div style={{ marginTop: '8px', fontSize: '12px', color: '#9CA3AF' }}>{statusMsg}</div>}
    </div>
  );
}
