import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet's default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SELECTED_ICON = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const OSLO_CENTER = [59.9139, 10.7522]
const DEFAULT_ZOOM = 13

export default function PubMap() {
  const [pubs, setPubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/data/pubs.json')
      .then(r => r.json())
      .then(data => {
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
          onChange={e => { setSearch(e.target.value); setSelected(null) }}
          placeholder="Søk..."
          className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-900 w-48"
        />
      </div>

      <div className="flex gap-0 border border-gray-200" style={{ height: '520px' }}>
        {/* Map */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
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
            <DeselectOnMapClick onDeselect={() => setSelected(null)} />
            {filtered.map(pub => (
              <Marker
                key={pub.id}
                position={[pub.lat, pub.lon]}
                icon={selected?.id === pub.id ? SELECTED_ICON : undefined}
                eventHandlers={{ click: () => setSelected(pub) }}
              />
            ))}
          </MapContainer>
        </div>

        {/* Preview panel */}
        <div className="border-l border-gray-200 bg-white flex flex-col" style={{ width: 240, flexShrink: 0 }}>
          {selected ? (
            <div className="p-4 flex flex-col gap-3 overflow-y-auto h-full">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-gray-400 hover:text-gray-700 self-end uppercase tracking-widest"
              >
                ✕ Lukk
              </button>
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-1">
                  {selected.type === 'pub' ? 'pub' : 'bar'}
                </div>
                <h3 className="font-serif text-lg font-bold text-gray-900 leading-snug">
                  {selected.name}
                </h3>
              </div>
              {selected.address && (
                <p className="text-sm text-gray-500">{selected.address}</p>
              )}
              {selected.opening_hours && (
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Åpningstider</p>
                  <p className="text-xs text-gray-600">{selected.opening_hours}</p>
                </div>
              )}
              {selected.phone && (
                <p className="text-sm text-gray-500">
                  <a href={`tel:${selected.phone}`} className="hover:text-gray-900">{selected.phone}</a>
                </p>
              )}
              {selected.website ? (
                <a
                  href={selected.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto block w-full text-center py-2 px-4 bg-gray-900 text-white text-xs font-bold tracking-widest uppercase hover:bg-gray-700 transition-colors"
                >
                  Besøk nettside →
                </a>
              ) : (
                <p className="text-xs text-gray-400 italic mt-auto">Ingen nettside registrert</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-4 text-center">
              <p className="text-xs text-gray-400 italic">Klikk på en markør for å se informasjon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

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

function DeselectOnMapClick({ onDeselect }) {
  useMapEvents({ click: onDeselect })
  return null
}
