import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Oslo city centre
const OSLO_CENTER = [59.9139, 10.7522]
const DEFAULT_ZOOM = 13

export default function PubMap() {
  const [pubs, setPubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/data/pubs.json')
      .then(r => r.json())
      .then(data => {
        // Only include pubs with valid coordinates
        setPubs(data.filter(p => p.lat && p.lon))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = pubs.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p className="text-sm text-gray-400 italic">Laster kart...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Puber & Barer</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            {filtered.length} steder i Oslo
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Søk..."
          className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-900 w-48"
        />
      </div>

      <div className="border border-gray-200" style={{ height: '520px' }}>
        <MapContainer
          center={OSLO_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMarkers pubs={filtered} />
          {filtered.map(pub => (
            <Marker key={pub.id} position={[pub.lat, pub.lon]}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong style={{ fontSize: 14 }}>{pub.name}</strong>
                  {pub.address && <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>{pub.address}</p>}
                  {pub.opening_hours && <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>{pub.opening_hours}</p>}
                  {pub.website && (
                    <a
                      href={pub.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#1a1a1a', display: 'block', marginTop: 6 }}
                    >
                      Nettside →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

// Fit map bounds to visible markers when search changes
function FitMarkers({ pubs }) {
  const map = useMap()
  useEffect(() => {
    if (pubs.length === 0) return
    if (pubs.length === 1) {
      map.setView([pubs[0].lat, pubs[0].lon], 16)
    } else {
      const bounds = L.latLngBounds(pubs.map(p => [p.lat, p.lon]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    }
  }, [pubs, map])
  return null
}
