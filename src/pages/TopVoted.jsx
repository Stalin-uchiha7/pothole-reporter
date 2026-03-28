import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

export default function TopVoted({ user, setPage, onPickReport }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [votedIds, setVotedIds] = useState([])

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
    const sorted = [...(data || [])].sort((a, b) => {
      const diff = (b.upvotes ?? 0) - (a.upvotes ?? 0)
      if (diff !== 0) return diff
      return new Date(b.created_at) - new Date(a.created_at)
    })
    setReports(sorted)
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
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, upvotes: (r.upvotes ?? 0) + 1 } : r)).sort((a, b) => {
        const diff = (b.upvotes ?? 0) - (a.upvotes ?? 0)
        if (diff !== 0) return diff
        return new Date(b.created_at) - new Date(a.created_at)
      })
    )
  }

  function goToMap(r) {
    onPickReport?.({ id: r.id, lat: r.lat, lng: r.lng })
    setPage('home')
  }

  return (
    <div className="page">
      <div className="container">
        <div className="topvoted-header">
          <div>
            <div className="topvoted-kicker">Community signal</div>
            <h1 className="topvoted-title">Top voted reports</h1>
            <p className="topvoted-sub">
              Issues ranked by upvotes — highest first. Tie-break: newest.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="topvoted-loading">
            <div className="topvoted-spinner" />
            <span>Loading rankings…</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="card topvoted-empty">No public reports yet.</div>
        ) : (
          <ol className="topvoted-list">
            {reports.map((r, i) => {
              const rank = i + 1
              const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''
              return (
                <li key={r.id} className={`topvoted-row ${tier ? `topvoted-row--${tier}` : ''}`}>
                  <div className="topvoted-row-media">
                    <div className={`topvoted-rank ${tier ? `topvoted-rank--${tier}` : ''}`} aria-label={`Rank ${rank}`}>
                      {rank}
                    </div>
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="topvoted-thumb" />
                    ) : (
                      <div className="topvoted-thumb topvoted-thumb--placeholder">🕳</div>
                    )}
                  </div>
                  <div className="topvoted-body">
                    <h2 className="topvoted-desc">{r.description || 'No description'}</h2>
                    <p className="topvoted-meta">
                      📍 {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      {r.reporter_name && <span> · {r.reporter_name}</span>}
                      <span> · {new Date(r.created_at).toLocaleDateString()}</span>
                    </p>
                    <div className="topvoted-badges">
                      <StatusBadge value={r.status} />
                      <StatusBadge value={r.severity} type="severity" />
                    </div>
                    <div className="topvoted-actions">
                      <button type="button" className="btn btn-gray topvoted-map-btn" onClick={() => goToMap(r)}>
                        View on map
                      </button>
                      {user && (
                        <button
                          type="button"
                          className={`upvote-btn ${votedIds.includes(r.id) ? 'voted' : ''}`}
                          onClick={() => handleUpvote(r.id)}
                          disabled={votedIds.includes(r.id)}
                        >
                          ▲ {r.upvotes ?? 0}
                        </button>
                      )}
                      {!user && (
                        <span className="topvoted-upvote-readonly">▲ {r.upvotes ?? 0} upvotes</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
