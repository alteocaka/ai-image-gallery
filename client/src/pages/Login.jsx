import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AuthLayout from '@/components/AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(
        'Sign in is disabled. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to client/.env'
      );
      return;
    }
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Sign in to your AI Image Gallery"
      footerPrompt="Don't have an account?"
      footerLinkTo="/signup"
      footerLinkText="Sign up"
    >
      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <label className="auth-label">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="auth-input"
            autoComplete="email"
            disabled={loading}
          />
        </label>
        <label className="auth-label">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="auth-input"
            autoComplete="current-password"
            disabled={loading}
          />
        </label>
        <button type="submit" className="auth-submit" disabled={loading || !isSupabaseConfigured}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
