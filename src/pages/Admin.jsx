import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

const ADMIN_EMAIL = 's76652@gmail.com'
const STATUS_FLOW = ['pending', 'approved', 'in_progress', 'fixed']

export default function Admin({ user }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!user) return
    fetchReports()
  }, [user])

  async function fetchReports() {
    setLoading(true)
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('reporter_id', user.id)
    const { data } = await query
    setReports(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('reports').update({ status }).eq('id', id)
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  async function updateSeverity(id, severity) {
    await supabase.from('reports').update({ severity }).eq('id', id)
    setReports(prev => prev.map(r => r.id === id ? { ...r, severity } : r))
  }

  async function deleteReport(id) {
    if (!confirm('Delete this report?')) return
    await supabase.from('reports').delete().eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  if (!user) return (
    <div className="page"><div className="container">
      <div className="card" style={{ maxWidth: 400, margin: '60px auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--text2)' }}>Sign in to access the dashboard.</p>
      </div>
    </div></div>
  )

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isAdmin ? '#ef4444' : '#10b981', boxShadow: `0 0 8px ${isAdmin ? '#ef4444' : '#10b981'}` }} />
              <span style={{ fontSize: 11, color: isAdmin ? '#ef4444' : '#10b981', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                {isAdmin ? 'Admin Access' : 'Reporter Access'}
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>
              {isAdmin ? 'Control Center' : 'My Reports'}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
              {reports.length} total incident{reports.length !== 1 ? 's' : ''} on record
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'in_progress', 'fixed'].map(f => (
              <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}>
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
            <div style={{ width: 36, height: 36, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
            No incidents found.
          </div>
        ) : (
          <div className="report-list">
            {filtered.map(r => (
              <div key={r.id} className="report-card">
                {r.image_url
                  ? <img src={r.image_url} alt="pothole" />
                  : <div style={{ width: 88, height: 88, background: 'var(--bg3)', borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 24 }}>🕳</div>
                }
                <div className="info">
                  <h4>{r.description || 'No description provided'}</h4>
                  <p>
                    📍 {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                    &nbsp;·&nbsp; via {r.source}
                    &nbsp;·&nbsp; ▲ {r.upvotes} votes
                    {r.reporter_name && <>&nbsp;·&nbsp; {r.reporter_name}</>}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatusBadge value={r.status} />
                    <StatusBadge value={r.severity} type="severity" />
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="actions">
                    {isAdmin ? (
                      <>
                        <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                          style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}>
                          {STATUS_FLOW.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                        <select value={r.severity} onChange={e => updateSeverity(r.id, e.target.value)}
                          style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}>
                          {['minor','moderate','severe'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button className="btn btn-red" style={{ padding: '5px 12px', fontSize: 12 }}
                          onClick={() => deleteReport(r.id)}>Delete</button>
                      </>
                    ) : (
                      <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                        style={{ width: 'auto', padding: '5px 10px', fontSize: 12 }}>
                        {STATUS_FLOW.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}