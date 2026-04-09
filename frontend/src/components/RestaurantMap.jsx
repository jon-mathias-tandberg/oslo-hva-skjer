import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import opening_hours from 'opening_hours'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const OSLO_CENTER = [59.9139, 10.7522]

export default function RestaurantMap() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [cuisineFilter, setCuisineFilter] = useState('')

  useEffect(() => {
    fetch('/data/restaurants_osm.json')
      .then(r => r.json())
      .then(data => { setRestaurants(data.filter(r => r.lat && r.lon)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cuisines = [...new Set(restaurants.map(r => r.cuisine).filter(Boolean))].sort()

  const filtered = restaurants.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.address.toLowerCase().includes(search.toLowerCase())
    const matchCuisine = !cuisineFilter || r.cuisine === cuisineFilter
    return matchSearch && matchCuisine
  })

  if (loading) return <p className="text-sm text-gray-400 italic">Laster kart...</p>

  if (restaurants.length === 0) return (
    <div className="text-center py-12">
      <p className="text-sm text-gray-400 italic">Restaurantdata lastes nattlig — prøv igjen i morgen.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Restauranter i Oslo</h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">{filtered.length} steder · OpenStreetMap</p>
        </div>
        <div className="flex gap-2">
          <select
            value={cuisineFilter}
            onChange={e => { setCuisineFilter(e.target.value); setSelected(null) }}
            className="border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-gray-900"
          >
            <option value="">Alle kjøkken</option>
            {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null) }}
            placeholder="Søk..."
            className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-900 w-40"
          />
        </div>
      </div>

      <div className="flex gap-0 border border-gray-200" style={{ height: '520px' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <MapContainer center={OSLO_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMarkers venues={filtered} />
            <DeselectOnMapClick onDeselect={() => setSelected(null)} />
            {filtered.map(r => (
              <Marker key={r.id} position={[r.lat, r.lon]} eventHandlers={{ click: () => setSelected(r) }} />
            ))}
          </MapContainer>
        </div>

        <div className="border-l border-gray-200 bg-white flex flex-col" style={{ width: 240, flexShrink: 0 }}>
          {selected ? (
            <div className="p-4 flex flex-col gap-3 overflow-y-auto h-full">
              <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-700 self-end uppercase tracking-widest">✕ Lukk</button>
              <div>
                {selected.cuisine && (
                  <div className="text-xs font-bold tracking-widest uppercase text-red-600 mb-1">{selected.cuisine}</div>
                )}
                <h3 className="font-serif text-lg font-bold text-gray-900 leading-snug">{selected.name}</h3>
              </div>
              {selected.address && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">📍</span>
                  <p className="text-sm text-gray-600">{selected.address}</p>
                </div>
              )}
              {selected.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">📞</span>
                  <a href={`tel:${selected.phone}`} className="text-sm text-gray-600 hover:text-gray-900">{selected.phone}</a>
                </div>
              )}
              {selected.opening_hours && <OpeningHoursPanel raw={selected.opening_hours} />}
              <div className="mt-auto flex flex-col gap-2">
                {selected.website && (
                  <a href={selected.website} target="_blank" rel="noopener noreferrer"
                    className="block w-full text-center py-2 px-4 bg-gray-900 text-white text-xs font-bold tracking-widest uppercase hover:bg-gray-700 transition-colors">
                    Nettside →
                  </a>
                )}
                <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lon}`}
                  target="_blank" rel="noopener noreferrer"
                  className="block w-full text-center py-2 px-4 border border-gray-300 text-gray-700 text-xs font-bold tracking-widest uppercase hover:border-gray-900 transition-colors">
                  Google Maps →
                </a>
              </div>
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

function FitMarkers({ venues }) {
  const map = useMap()
  useEffect(() => {
    if (venues.length === 0) return
    if (venues.length === 1) { map.setView([venues[0].lat, venues[0].lon], 16); return }
    const bounds = L.latLngBounds(venues.map(v => [v.lat, v.lon]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [venues, map])
  return null
}

function DeselectOnMapClick({ onDeselect }) {
  useMapEvents({ click: onDeselect })
  return null
}

const DAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']

function OpeningHoursPanel({ raw }) {
  const info = useMemo(() => {
    try {
      const oh = new opening_hours(raw, null, { mode: 0 })
      const now = new Date()
      const isOpen = oh.getState(now)
      const nextChange = oh.getNextChange(now)
      const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay() + 1)
      const schedule = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(start); day.setDate(start.getDate() + i)
        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59)
        const intervals = oh.getOpenIntervals(day, dayEnd)
        return { day: DAYS[day.getDay()], intervals: intervals.map(([f, t]) => `${pad(f.getHours())}:${pad(f.getMinutes())} – ${pad(t.getHours())}:${pad(t.getMinutes())}`) }
      })
      let nextLabel = ''
      if (nextChange) {
        const diff = nextChange - now; const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000)
        if (h < 24) nextLabel = isOpen ? `Stenger ${h > 0 ? `om ${h}t` : `om ${m}min`}` : `Åpner ${h > 0 ? `om ${h}t` : `om ${m}min`}`
      }
      return { isOpen, nextLabel, schedule }
    } catch { return null }
  }, [raw])
  if (!info) return <div><p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Åpningstider</p><p className="text-xs text-gray-500">{raw}</p></div>
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold tracking-widest uppercase ${info.isOpen ? 'text-green-600' : 'text-red-500'}`}>{info.isOpen ? 'Åpen nå' : 'Stengt nå'}</span>
        {info.nextLabel && <span className="text-xs text-gray-400">· {info.nextLabel}</span>}
      </div>
      <div className="flex flex-col gap-0.5">
        {info.schedule.map(({ day, intervals }) => {
          const isToday = day === DAYS[new Date().getDay()]
          return <div key={day} className={`flex justify-between text-xs ${isToday ? 'font-bold text-gray-900' : 'text-gray-500'}`}><span>{day.slice(0, 3)}</span><span>{intervals.length === 0 ? 'Stengt' : intervals.join(', ')}</span></div>
        })}
      </div>
    </div>
  )
}
function pad(n) { return String(n).padStart(2, '0') }
