import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Submit({ user, setPage }) {
  const [step, setStep] = useState(1)
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [location, setLocation] = useState(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  if (!user) return (
    <div className="page"><div className="container">
      <div style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
          <h2 style={{ marginBottom: 8 }}>Authentication Required</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
            Connect your Google account to file a report.
          </p>
          <button className="btn btn-orange" style={{ width: '100%' }} onClick={() =>
            supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
          }>Connect with Google</button>
        </div>
      </div>
    </div></div>
  )

  function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setStep(2)
  }

  function getLocation() {
    if (!navigator.geolocation) return setError('Geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStep(3) },
      () => setError('Could not get location. Enable location access and try again.')
    )
  }

  function cancelReport() {
    if (preview) URL.revokeObjectURL(preview)
    if (fileRef.current) fileRef.current.value = ''
    setImage(null)
    setPreview(null)
    setLocation(null)
    setDescription('')
    setError('')
    setLoading(false)
    setStep(1)
  }

  async function handleSubmit() {
    if (!image || !location) return
    setLoading(true)
    setError('')
    try {
      const ext = image.name.split('.').pop()
      const filename = `${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('pothole-images').upload(filename, image)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('pothole-images').getPublicUrl(filename)
      const { error: insertError } = await supabase.from('reports').insert({
        image_url: publicUrl, lat: location.lat, lng: location.lng,
        description, source: 'web',
        reporter_id: user.id,
        reporter_name: user.user_metadata?.full_name || 'Anonymous',
        city: 'thane'
      })
      if (insertError) throw insertError
      setStep(4)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Photo', 'Location', 'Submit']

  return (
    <div className="page">
      <div className="container">
        <div style={{ maxWidth: 540, margin: '0 auto' }}>

          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 28,
            }}
          >
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}>File Incident Report</h2>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
                Document road damage for community review
              </p>
            </div>
            {step < 4 && (
              <button type="button" className="btn btn-gray" onClick={cancelReport} style={{ flexShrink: 0 }}>
                Cancel
              </button>
            )}
          </div>

          {/* Step indicators */}
          {step < 4 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
              {steps.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 2 ? 1 : 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    opacity: step > i + 1 ? 0.5 : 1
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: step === i + 1 ? 'var(--accent)' : step > i + 1 ? 'var(--bg4)' : 'var(--bg3)',
                      border: step === i + 1 ? 'none' : '1px solid var(--border2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: step === i + 1 ? '#fff' : 'var(--text3)',
                      boxShadow: step === i + 1 ? '0 0 14px var(--accentglow)' : 'none',
                      flexShrink: 0
                    }}>
                      {step > i + 1 ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: step === i + 1 ? 'var(--text)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {s}
                    </span>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? 'var(--accent)' : 'var(--border2)', opacity: 0.5 }} />}
                </div>
              ))}
            </div>
          )}

          <div className="card">
            {step === 1 && (
              <div>
                <p style={{ color: 'var(--text2)', marginBottom: 20, fontSize: 14 }}>
                  Capture or upload a photo of the road damage.
                </p>
                <div
                  onClick={() => fileRef.current.click()}
                  style={{
                    border: '1px dashed var(--border2)', borderRadius: 12,
                    padding: '52px 20px', textAlign: 'center', cursor: 'pointer',
                    color: 'var(--text3)', transition: 'all 0.2s',
                    background: 'var(--bg3)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text2)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
                >
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Tap to capture image</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text3)' }}>JPG, PNG, WEBP supported</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  onChange={handleImage} style={{ display: 'none' }} />
              </div>
            )}

            {step === 2 && (
              <div>
                {preview && (
                  <img src={preview} alt="preview" style={{
                    width: '100%', borderRadius: 10, marginBottom: 20,
                    maxHeight: 260, objectFit: 'cover'
                  }} />
                )}
                <p style={{ color: 'var(--text2)', marginBottom: 20, fontSize: 14 }}>
                  Share your GPS coordinates to pin this on the map.
                </p>
                <button className="btn btn-orange" style={{ width: '100%', padding: '13px' }} onClick={getLocation}>
                  📍 Acquire GPS Location
                </button>
                {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}
              </div>
            )}

            {step === 3 && (
              <div>
                {preview && (
                  <img src={preview} alt="preview" style={{
                    width: '100%', borderRadius: 10, marginBottom: 20,
                    maxHeight: 200, objectFit: 'cover'
                  }} />
                )}
                <div className="form-group">
                  <label>Incident Description (optional)</label>
                  <textarea rows={3}
                    placeholder="e.g. Large pothole near bus stop, hazardous at night..."
                    value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div style={{
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 12,
                  color: '#10b981', marginBottom: 20, fontFamily: 'monospace'
                }}>
                  ✓ GPS LOCKED — {location?.lat.toFixed(6)}, {location?.lng.toFixed(6)}
                </div>
                {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
                <button className="btn btn-orange" style={{ width: '100%', padding: '13px' }}
                  onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Transmitting...' : 'Submit Report'}
                </button>
              </div>
            )}

            {step === 4 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, margin: '0 auto 16px'
                }}>✓</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Report Transmitted</h3>
                <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                  Your report is pending review. It will appear on the map once approved.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn btn-gray" onClick={() => { setStep(1); setImage(null); setPreview(null); setLocation(null); setDescription('') }}>
                    File Another
                  </button>
                  <button className="btn btn-orange" onClick={() => setPage('home')}>View Map</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}