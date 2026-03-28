import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Admin from './pages/Admin'

export default function App() {
  const [page, setPage] = useState('home')
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })

  const signOut = () => supabase.auth.signOut()

  return (
    <>
      <div className="hud-line" />
      <nav>
        <div className="inner">
          <div className="logo" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
            POTHOLE<span>REPORTER</span>
          </div>
          <div className="nav-links">
            <a onClick={() => setPage('home')}>Map</a>
            {user && <a onClick={() => setPage('submit')}>Report</a>}
            {user && <a onClick={() => setPage('admin')}>Dashboard</a>}
            {user
              ? <button onClick={signOut}>Sign out</button>
              : <button className="btn-primary" onClick={signIn}>Connect</button>
            }
          </div>
        </div>
      </nav>

      {page === 'home'   && <Home setPage={setPage} user={user} />}
      {page === 'submit' && <Submit user={user} setPage={setPage} />}
      {page === 'admin'  && <Admin user={user} />}
    </>
  )
}