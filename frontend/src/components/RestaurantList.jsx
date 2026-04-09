import { useState, useEffect } from 'react'

export default function RestaurantList() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/restaurants.json')
      .then(r => r.json())
      .then(data => { setRestaurants(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-400 italic">Laster restauranter...</p>

  if (restaurants.length === 0) {
    return <p className="text-sm text-gray-400 italic">Ingen restaurantanbefalinger tilgjengelig.</p>
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1 pb-3 border-b-2 border-gray-900">
        Restaurantanbefalinger
      </h2>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">
        Anbefalt av Aftenposten Vink
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
        {restaurants.map(r => (
          <div key={r.id} className="py-3 border-b border-gray-100">
            <div className="text-xs font-bold tracking-widest uppercase text-amber-600 mb-1">
              vink
            </div>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif font-bold text-gray-900 hover:text-gray-600 leading-snug transition-colors"
            >
              {r.title}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
