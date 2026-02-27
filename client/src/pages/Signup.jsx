import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import AuthLayout from '@/components/AuthLayout';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(
        'Sign up is disabled. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to client/.env'
      );
      return;
    }
    if (!email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;
      setError(null);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign up"
      subtitle="Create an account for AI Image Gallery"
      footerPrompt="Already have an account?"
      footerLinkTo="/login"
      footerLinkText="Log in"
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
            placeholder="At least 6 characters"
            className="auth-input"
            autoComplete="new-password"
            disabled={loading}
          />
        </label>
        <label className="auth-label">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="auth-input"
            autoComplete="new-password"
            disabled={loading}
          />
        </label>
        <button type="submit" className="auth-submit" disabled={loading || !isSupabaseConfigured}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
