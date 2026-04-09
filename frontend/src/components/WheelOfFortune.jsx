import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'

export default function WheelOfFortune({ events, isLoggedIn = false, favorites = [], onToggleFavorite, groups = [], onAddToSpecificGroup }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [filterDate, setFilterDate] = useState('')
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  const today = format(new Date(), 'yyyy-MM-dd')

  const filteredEvents = filterDate
    ? events.filter(e => e.date === filterDate)
    : events

  if (filteredEvents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <h2 className="font-serif text-3xl font-bold text-gray-900 tracking-tight">Wheel of Fortune</h2>
        <DateFilter value={filterDate} onChange={setFilterDate} today={today} />
        <div className="border border-gray-200 p-8 text-center text-sm text-gray-400 italic">
          {filterDate ? `Ingen events den ${filterDate}.` : 'Ingen events å spinne på.'}
        </div>
      </div>
    )
  }

  function spin() {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    const spins = 5 + Math.floor(Math.random() * 5)
    setRotation(r => r + spins * 360 + Math.floor(Math.random() * 360))

    timeoutRef.current = setTimeout(() => {
      const picked = filteredEvents[Math.floor(Math.random() * filteredEvents.length)]
      setResult(picked)
      setSpinning(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h2 className="font-serif text-3xl font-bold text-gray-900 tracking-tight">Wheel of Fortune</h2>

      <DateFilter value={filterDate} onChange={v => { setFilterDate(v); setResult(null) }} today={today} />

      <div className="relative w-52 h-52">
        <div
          className="w-full h-full rounded-full border-4 border-gray-900 overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 1.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          {/* Show max 8 segments for visual clarity; all filtered events are eligible */}
          {filteredEvents.slice(0, 8).map((e, i) => (
            <div
              key={e.id}
              className="flex items-center justify-center text-xs font-medium p-1"
              style={{
                background: i % 2 === 0 ? '#fafaf8' : '#1a1a1a',
                color: i % 2 === 0 ? '#1a1a1a' : '#fafaf8',
                height: `${100 / Math.min(filteredEvents.length, 8)}%`,
              }}
            >
              <span className="truncate px-1">{e.title}</span>
            </div>
          ))}
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-2xl text-gray-900">▼</div>
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-widest">
        {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} i potten
      </p>

      <button
        onClick={spin}
        disabled={spinning}
        aria-label="spin"
        className="px-8 py-3 bg-gray-900 text-white text-xs font-bold tracking-widest uppercase hover:bg-gray-700 disabled:opacity-40 transition-colors"
      >
        {spinning ? 'Spinner...' : 'Spin!'}
      </button>

      {result && (
        <div role="alert" data-testid="wheel-result" className="w-full max-w-md border-2 border-gray-900 p-6 text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">Du fikk:</p>
          <div className="flex items-start justify-center gap-3">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-xl font-bold text-gray-900 hover:text-gray-600 transition-colors"
            >
              {result.title}
            </a>
            {isLoggedIn && (
              <div className="flex items-center gap-1 shrink-0 mt-1 relative">
                <button
                  aria-label={favorites.includes(result.id) ? 'fjern lagret' : 'lagre'}
                  onClick={() => onToggleFavorite?.(result.id)}
                  className="text-2xl leading-none text-gray-400 hover:text-gray-900 transition-colors"
                >
                  {favorites.includes(result.id) ? '★' : '☆'}
                </button>
                {groups.length > 0 && (
                  <div className="relative">
                    <button
                      aria-label="legg til i gruppeplan"
                      onClick={() => {
                        if (groups.length === 1) {
                          onAddToSpecificGroup?.(groups[0].id, result.id)
                        } else {
                          setShowGroupPicker(v => !v)
                        }
                      }}
                      className="text-xl leading-none text-gray-400 hover:text-gray-900 transition-colors"
                      title="Legg til i gruppeplan"
                    >
                      ＋
                    </button>
                    {showGroupPicker && (
                      <div className="absolute right-0 top-7 bg-white border border-gray-200 shadow-md z-10 min-w-max">
                        {groups.map(g => (
                          <button
                            key={g.id}
                            onClick={() => { onAddToSpecificGroup?.(g.id, result.id); setShowGroupPicker(false) }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
            {format(parseISO(result.date), 'd. MMMM yyyy', { locale: nb })} · {result.source}
          </p>
        </div>
      )}
    </div>
  )
}

function DateFilter({ value, onChange, today }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold tracking-widest uppercase text-gray-400">Dato:</span>
      <input
        type="date"
        value={value}
        min={today}
        onChange={e => onChange(e.target.value)}
        className="border border-gray-300 text-sm px-2 py-1 text-gray-700 focus:outline-none focus:border-gray-900"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-xs text-gray-400 hover:text-gray-900 uppercase tracking-widest"
        >
          Alle
        </button>
      )}
    </div>
  )
}
