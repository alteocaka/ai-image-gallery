import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAISettings } from '@/contexts/AISettingsContext';
import { AI_PROVIDERS, AI_MODELS } from '@/constants';

export default function UserMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { aiProvider, aiModel, setAiProvider, setAiModel, initialized } = useAISettings();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  async function handleLogout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setOpen(false);
    navigate('/login');
  }

  const models = AI_MODELS[aiProvider] || AI_MODELS.gemini;
  const modelValue = aiModel || models[0]?.value || '';

  function handleProviderChange(e) {
    setAiProvider(e.target.value);
  }

  function handleModelChange(e) {
    setAiModel(e.target.value);
  }

  const label = user?.email ?? (isSupabaseConfigured ? 'Not signed in' : 'Demo mode');

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        title={label}
      >
        <svg
          className="user-menu-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-email-line">{label}</div>
          <div className="user-menu-section">
            <span className="user-menu-section-label">AI for new images</span>
            <div className="user-menu-settings">
              <label className="user-menu-field">
                <span className="user-menu-field-label">Provider</span>
                <select
                  value={aiProvider}
                  onChange={handleProviderChange}
                  className="user-menu-select"
                  disabled={!initialized}
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="user-menu-field">
                <span className="user-menu-field-label">Model</span>
                <select
                  value={modelValue}
                  onChange={handleModelChange}
                  className="user-menu-select"
                  disabled={!initialized}
                >
                  {models.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button type="button" className="user-menu-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
