import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Admin from './pages/Admin'
import TopVoted from './pages/TopVoted'

export default function App() {
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const [mapFocus, setMapFocus] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setNavOpen(false)
  }, [page])

  useEffect(() => {
    if (!user && page === 'top') setPage('home')
  }, [user, page])

  const signIn = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })

  const signOut = () => supabase.auth.signOut()

  return (
    <>
      <nav>
        <div className="inner">
          <div className="logo" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
            POTHOLE<span>REPORTER</span>
          </div>
          <button
            type="button"
            className="nav-toggle"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen(o => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`nav-links ${navOpen ? 'nav-links--open' : ''}`}>
            <a
              aria-current={page === 'home' ? 'page' : undefined}
              className={page === 'home' ? 'nav-active' : undefined}
              onClick={() => setPage('home')}
            >
              Map
            </a>
            {user && (
              <a
                aria-current={page === 'top' ? 'page' : undefined}
                className={page === 'top' ? 'nav-active' : undefined}
                onClick={() => setPage('top')}
              >
                Top voted
              </a>
            )}
            {user && (
              <a
                aria-current={page === 'submit' ? 'page' : undefined}
                className={page === 'submit' ? 'nav-active' : undefined}
                onClick={() => setPage('submit')}
              >
                Report
              </a>
            )}
            {user && (
              <a
                aria-current={page === 'admin' ? 'page' : undefined}
                className={page === 'admin' ? 'nav-active' : undefined}
                onClick={() => setPage('admin')}
              >
                Dashboard
              </a>
            )}
            {user
              ? <button onClick={signOut}>Sign out</button>
              : <button className="btn-primary" onClick={signIn}>Connect</button>
            }
          </div>
        </div>
      </nav>

      {page === 'home'   && <Home setPage={setPage} user={user} mapFocus={mapFocus} onMapFocusDone={() => setMapFocus(null)} />}
      {page === 'top' && user && <TopVoted user={user} setPage={setPage} onPickReport={setMapFocus} />}
      {page === 'submit' && <Submit user={user} setPage={setPage} />}
      {page === 'admin'  && <Admin user={user} />}
    </>
  )
}