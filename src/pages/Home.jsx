import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Map from '../components/Map'

export default function Home({ setPage, user }) {
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('all')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [votedIds, setVotedIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
    if (user) loadVoted()
  }, [user])

  async function fetchReports() {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  async function loadVoted() {
    const { data } = await supabase
      .from('upvote_logs')
      .select('report_id')
      .eq('voter_id', user.id)
    setVotedIds((data || []).map(v => v.report_id))
  }

  async function handleUpvote(reportId) {
    if (!user) return alert('Sign in to upvote')
    if (votedIds.includes(reportId)) return
    const { error } = await supabase.from('upvote_logs').insert({ report_id: reportId, voter_id: user.id })
    if (error) return
    await supabase.rpc('increment_upvotes', { report_id: reportId })
    setVotedIds(prev => [...prev, reportId])
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
  }

  const filtered = filter === 'all' ? reports : reports.filter(r =>
    filter === 'fixed' ? r.status === 'fixed' : r.severity === filter
  )

  const stats = {
    total: reports.length,
    severe: reports.filter(r => r.severity === 'severe').length,
    fixed: reports.filter(r => r.status === 'fixed').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
  }

  return (
    <div className="page">
      <div className="container">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }} />
              <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Live — Thane, Maharashtra
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>
              Road Damage Intelligence
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
              Community-powered pothole tracking system
            </p>
          </div>
          {user && (
            <button className="btn btn-orange" onClick={() => setPage('submit')} style={{ marginTop: 4 }}>
              + File Report
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="num">{stats.total}</div>
            <div className="lbl">Total Reports</div>
          </div>
          <div className="stat-card">
            <div className="num" style={{ color: '#ef4444', textShadow: '0 0 20px rgba(239,68,68,0.4)' }}>
              {stats.severe}
            </div>
            <div className="lbl">Severe</div>
          </div>
          <div className="stat-card">
            <div className="num" style={{ color: '#a78bfa', textShadow: '0 0 20px rgba(167,139,250,0.4)' }}>
              {stats.inProgress}
            </div>
            <div className="lbl">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="num" style={{ color: '#10b981', textShadow: '0 0 20px rgba(16,185,129,0.4)' }}>
              {stats.fixed}
            </div>
            <div className="lbl">Resolved</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'minor', label: 'Minor' },
            { key: 'moderate', label: 'Moderate' },
            { key: 'severe', label: 'Severe' },
            { key: 'fixed', label: 'Resolved' },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-pill ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
              fontSize: 12, color: 'var(--text2)', textTransform: 'uppercase',
              letterSpacing: '0.6px', fontWeight: 600, margin: 0
            }}>
              <div
                onClick={() => setShowHeatmap(h => !h)}
                style={{
                  width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                  background: showHeatmap ? 'var(--accent)' : 'var(--bg4)',
                  border: '1px solid var(--border2)',
                  position: 'relative', transition: 'background 0.2s',
                  boxShadow: showHeatmap ? '0 0 10px var(--accentglow)' : 'none'
                }}
              >
                <div style={{
                  position: 'absolute', top: 2,
                  left: showHeatmap ? 18 : 2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s'
                }} />
              </div>
              Heatmap
            </label>
          </div>
        </div>

        {/* Map */}
        {loading ? (
          <div style={{
            height: 560, borderRadius: 16, background: 'var(--bg2)',
            border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12, color: 'var(--text2)'
          }}>
            <div style={{
              width: 40, height: 40, border: '2px solid var(--border2)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: 13 }}>Loading intelligence feed...</span>
          </div>
        ) : (
          <Map reports={filtered} showHeatmap={showHeatmap} onUpvote={handleUpvote} votedIds={votedIds} />
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}