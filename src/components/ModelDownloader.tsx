import { useState } from 'react';
import { ModelManager, ModelCategory } from '@runanywhere/web';

const MODEL_ID = 'gemma-local';

export default function ModelDownloader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadModel = async () => {
    setLoading(true);
    setError('');

    try {
      await ModelManager.loadModel(MODEL_ID);

      const model = ModelManager.getLoadedModel(ModelCategory.Language);

      if (!model) {
        throw new Error('Model failed to initialize.');
      }

      setIsLoaded(true);
      console.log('[Model] Loaded successfully');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  if (isLoaded) {
    return (
      <div style={{ padding: 12, background: '#ecfdf5', borderRadius: 10 }}>
        ✅ Gemma 2 2B Loaded (Local)
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: '#fff7ed', borderRadius: 10 }}>
      <div style={{ marginBottom: 10 }}>
        AI Model Required – Gemma 2 2B (Local)
      </div>
      <button onClick={loadModel} disabled={loading}>
        {loading ? 'Loading...' : 'Load Model'}
      </button>
      {error && <div style={{ marginTop: 10, color: 'red' }}>{error}</div>}
    </div>
  );
}