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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-400">
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center gap-6">
      <h2 className="text-xl font-bold text-gray-800">Wheel of Fortune</h2>

      <div className="relative w-48 h-48">
        <div
          className="w-full h-full rounded-full border-4 border-blue-600 flex items-center justify-center overflow-hidden transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 1.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          <div className="grid grid-cols-1 gap-0 w-full h-full">
            {/* Show max 8 segments for visual clarity; all events are still eligible for the random pick */}
            {events.slice(0, 8).map((e, i) => (
              <div
                key={e.id}
                className="flex items-center justify-center text-xs font-medium p-1"
                style={{
                  background: `hsl(${(i / Math.min(events.length, 8)) * 360}, 70%, 85%)`,
                  height: `${100 / Math.min(events.length, 8)}%`,
                }}
              >
                <span className="truncate px-1">{e.title}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-2xl">▼</div>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        aria-label="spin"
        className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {spinning ? 'Spinner...' : 'Spin!'}
      </button>

      {result && (
        <div role="alert" data-testid="wheel-result" className="w-full mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <p className="text-sm text-blue-600 font-medium mb-1">Du fikk:</p>
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-bold text-gray-900 hover:text-blue-600"
          >
            {result.title}
          </a>
          <p className="text-sm text-gray-500 mt-1">{result.date} · {result.source}</p>
        </div>
      )}
    </div>
  )
}
