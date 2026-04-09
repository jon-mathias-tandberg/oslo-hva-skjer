import { useState, useEffect } from 'react'

export default function PubList() {
  const [pubs, setPubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/data/pubs.json')
      .then(r => r.json())
      .then(data => { setPubs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = pubs.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p className="text-sm text-gray-400 italic">Laster puboversikt...</p>

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1 pb-3 border-b-2 border-gray-900">
        Puber & Barer i Oslo
      </h2>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
        {pubs.length} steder · OpenStreetMap
      </p>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Søk på navn eller adresse..."
        className="w-full border border-gray-300 px-3 py-2 text-sm mb-6 focus:outline-none focus:border-gray-900"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Ingen treff på "{search}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {filtered.map(pub => (
            <div key={pub.id} className="py-3 border-b border-gray-100">
              <div className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-1">
                {pub.type === 'pub' ? 'pub' : 'bar'}
                {pub.address && ` · ${pub.address}`}
              </div>
              {pub.website ? (
                <a
                  href={pub.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif font-bold text-gray-900 hover:text-gray-600 transition-colors leading-snug"
                >
                  {pub.name}
                </a>
              ) : (
                <span className="font-serif font-bold text-gray-900 leading-snug">{pub.name}</span>
              )}
              {pub.opening_hours && (
                <p className="text-xs text-gray-400 mt-0.5">{pub.opening_hours}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
