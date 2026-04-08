const CATEGORY_TEXT_COLORS = {
  konsert: 'text-red-600',
  mat: 'text-amber-600',
  kultur: 'text-blue-600',
  humor: 'text-violet-600',
  annet: 'text-gray-500',
}

export default function EventCard({ event, isFavorite = false, onToggleFavorite, isLoggedIn = false, onAddToGroup }) {
  const labelColor = CATEGORY_TEXT_COLORS[event.category] ?? CATEGORY_TEXT_COLORS.annet

  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      {/* Category · Source label */}
      <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${labelColor}`}>
        {event.category} · <span>{event.source}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif font-bold text-gray-900 hover:text-gray-600 leading-snug transition-colors"
        >
          {event.title}
        </a>
        <div className="flex items-center gap-1 shrink-0">
          {isLoggedIn && (
            <button
              aria-label={isFavorite ? 'fjern lagret' : 'lagre'}
              onClick={() => onToggleFavorite?.(event.id)}
              className="text-lg leading-none text-gray-300 hover:text-gray-700 transition-colors"
            >
              {isFavorite ? '★' : '☆'}
            </button>
          )}
          {isLoggedIn && onAddToGroup && (
            <button
              aria-label="legg til i gruppeplan"
              onClick={() => onAddToGroup(event.id)}
              className="text-sm leading-none text-gray-300 hover:text-gray-700 transition-colors"
              title="Legg til i gruppeplan"
            >
              ＋
            </button>
          )}
        </div>
      </div>

      {/* Time */}
      {event.time && (
        <span className="text-xs text-gray-500 mt-0.5 block">{event.time}</span>
      )}

      {/* Description */}
      {event.description && event.description !== 'Anbefalt av Aftenposten Vink' && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{event.description}</p>
      )}
    </div>
  )
}
