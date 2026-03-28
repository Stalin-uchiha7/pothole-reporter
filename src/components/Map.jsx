import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const severityColor = { minor: '#16a34a', moderate: '#ea580c', severe: '#dc2626' }

function makeIcon(severity) {
  const color = severityColor[severity] || '#888'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
    className: ''
  })
}

function HeatmapLayer({ reports }) {
  const map = useMap()
  const heatRef = useRef(null)

  useEffect(() => {
    if (!reports.length) return
    import('leaflet.heat').then(() => {
      const points = reports.map(r => [r.lat, r.lng, r.severity === 'severe' ? 1 : r.severity === 'moderate' ? 0.6 : 0.3])
      if (heatRef.current) map.removeLayer(heatRef.current)
      heatRef.current = L.heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        gradient: { 0.3: '#16a34a', 0.6: '#ea580c', 1.0: '#dc2626' }
      }).addTo(map)
    })
    return () => { if (heatRef.current) map.removeLayer(heatRef.current) }
  }, [reports, map])

  return null
}

export default function Map({ reports, showHeatmap = true, onUpvote, votedIds = [] }) {
  const center = [19.2183, 72.9781] // Thane, Maharashtra

  return (
    <MapContainer center={center} zoom={13} className="map-wrap" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showHeatmap && <HeatmapLayer reports={reports} />}
      {reports.map(r => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={makeIcon(r.severity)}>
          <Popup maxWidth={260}>
            {r.image_url && (
              <img src={r.image_url} alt="pothole"
                style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
            )}
            <div style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <span className={`badge ${r.severity}`}>{r.severity}</span>
                <span className={`badge ${r.status}`}>{r.status.replace('_', ' ')}</span>
              </div>
              {r.description && <p style={{ marginBottom: 8, color: '#444' }}>{r.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
                {onUpvote && (
                  <button
                    className={`upvote-btn ${votedIds.includes(r.id) ? 'voted' : ''}`}
                    onClick={() => onUpvote(r.id)}
                  >
                    ▲ {r.upvotes}
                  </button>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}