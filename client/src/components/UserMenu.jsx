import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function UserMenu() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  async function handleLogout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    setOpen(false)
    navigate('/login')
  }

  const label = user?.email ?? (isSupabaseConfigured ? 'Not signed in' : 'Demo mode')

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="user-menu-email">{label}</span>
        <span className="user-menu-chevron" aria-hidden>▼</span>
      </button>
      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-email-line">{label}</div>
          <button type="button" className="user-menu-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
