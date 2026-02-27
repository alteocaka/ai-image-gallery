import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Shared layout for Login and Signup: card, title, subtitle, Supabase notice, and footer link.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footerPrompt,
  footerLinkTo,
  footerLinkText,
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>

        {!isSupabaseConfigured && (
          <div className="auth-notice" role="status">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> to <code>client/.env</code> to enable sign in.
          </div>
        )}

        {children}

        <p className="auth-footer">
          {footerPrompt}{' '}
          <Link to={footerLinkTo} className="auth-link">
            {footerLinkText}
          </Link>
        </p>
      </div>
    </div>
  );
}
