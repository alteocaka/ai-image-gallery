import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AI_MODELS } from '@/constants';

const STORAGE_KEY = 'ai-image-gallery-ai-settings';

const defaultSettings = {
  aiProvider: 'gemini',
  aiModel: '',
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      aiProvider: parsed.aiProvider === 'openai' ? 'openai' : 'gemini',
      aiModel: typeof parsed.aiModel === 'string' ? parsed.aiModel : '',
    };
  } catch {
    return defaultSettings;
  }
}

function saveToStorage(aiProvider, aiModel) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ aiProvider, aiModel }));
  } catch {}
}

const AISettingsContext = createContext(null);

export function AISettingsProvider({ children }) {
  const [aiProvider, setAiProviderState] = useState(defaultSettings.aiProvider);
  const [aiModel, setAiModelState] = useState(defaultSettings.aiModel);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const loaded = loadFromStorage();
    setAiProviderState(loaded.aiProvider);
    setAiModelState(loaded.aiModel);
    setInitialized(true);
  }, []);

  const setAiProvider = useCallback((value) => {
    setAiProviderState(value);
    const models = AI_MODELS[value] || AI_MODELS.gemini;
    const firstModel = models[0]?.value || '';
    setAiModelState(firstModel);
    saveToStorage(value, firstModel);
  }, []);

  const setAiModel = useCallback((value) => {
    setAiModelState(value);
    setAiProviderState((p) => {
      saveToStorage(p, value);
      return p;
    });
  }, []);

  const value = {
    aiProvider,
    aiModel,
    setAiProvider,
    setAiModel,
    initialized,
    getSettingsForUpload: () => {
      const models = AI_MODELS[aiProvider] || AI_MODELS.gemini;
      const model = aiModel || models[0]?.value || '';
      return { aiProvider, aiModel: model };
    },
  };

  return (
    <AISettingsContext.Provider value={value}>{children}</AISettingsContext.Provider>
  );
}

export function useAISettings() {
  const ctx = useContext(AISettingsContext);
  if (!ctx) throw new Error('useAISettings must be used within AISettingsProvider');
  return ctx;
}
