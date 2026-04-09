import { useState, useRef, useEffect } from 'react'

export default function WheelOfFortune({ events }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  if (events.length === 0) {
    return (
      <div className="border border-gray-200 p-8 text-center text-sm text-gray-400 italic">
        Ingen events å spinne på. Velg en dato med aktiviteter.
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
      const picked = events[Math.floor(Math.random() * events.length)]
      setResult(picked)
      setSpinning(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <h2 className="font-serif text-3xl font-bold text-gray-900 tracking-tight">Wheel of Fortune</h2>

      <div className="relative w-52 h-52">
        <div
          className="w-full h-full rounded-full border-4 border-gray-900 overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 1.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          {/* Show max 8 segments for visual clarity; all events are eligible for random pick */}
          {events.slice(0, 8).map((e, i) => (
            <div
              key={e.id}
              className="flex items-center justify-center text-xs font-medium p-1"
              style={{
                background: i % 2 === 0 ? '#fafaf8' : '#1a1a1a',
                color: i % 2 === 0 ? '#1a1a1a' : '#fafaf8',
                height: `${100 / Math.min(events.length, 8)}%`,
              }}
            >
              <span className="truncate px-1">{e.title}</span>
            </div>
          ))}
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-2xl text-gray-900">▼</div>
      </div>

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
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-xl font-bold text-gray-900 hover:text-gray-600 transition-colors"
          >
            {result.title}
          </a>
          <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide">{result.date} · {result.source}</p>
        </div>
      )}
    </div>
  )
}
