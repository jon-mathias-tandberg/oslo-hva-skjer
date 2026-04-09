import { useGroupPlan } from '../hooks/useGroupPlan'

export default function GroupPlan({ groupId, uid, allEvents, selectedDate }) {
  const { plan, addToPlan, removeFromPlan, toggleVote } = useGroupPlan(groupId, uid)

  const eventsById = Object.fromEntries(allEvents.map(e => [e.id, e]))
  const planForDate = plan.filter(p => {
    const event = eventsById[p.eventId]
    return event?.date === selectedDate
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-gray-800">Gruppeplan</h3>

      {planForDate.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen events i grupplanen for denne dagen.</p>
      ) : (
        planForDate.map(p => {
          const event = eventsById[p.eventId]
          if (!event) return null
          const hasVoted = Array.isArray(p.votes) && p.votes.includes(uid)
          return (
            <div key={p.id} className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-col gap-0.5 min-w-0">
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gray-900 hover:text-blue-600 text-sm truncate"
                >
                  {event.title}
                </a>
                <span className="text-xs text-gray-500">{event.time ?? ''}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleVote(p.eventId, hasVoted)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    hasVoted ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="stem"
                >
                  ↑ {Array.isArray(p.votes) ? p.votes.length : 0}
                </button>
                {p.addedBy === uid && (
                  <button
                    onClick={() => removeFromPlan(p.eventId)}
                    className="text-gray-300 hover:text-red-400 text-xs"
                    aria-label="fjern fra gruppeplan"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
