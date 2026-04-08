const SOURCE_COLORS = {
  blaa: 'bg-blue-100 text-blue-800',
  rockefeller: 'bg-purple-100 text-purple-800',
  meetup: 'bg-red-100 text-red-800',
  vink: 'bg-yellow-100 text-yellow-800',
  nieuscene: 'bg-yellow-100 text-yellow-800',
  latter: 'bg-yellow-100 text-yellow-800',
  operaen: 'bg-red-100 text-red-800',
  oslonye: 'bg-pink-100 text-pink-800',
  detnorske: 'bg-pink-100 text-pink-800',
  folketeateret: 'bg-pink-100 text-pink-800',
}

const CATEGORY_COLORS = {
  konsert: 'bg-green-100 text-green-800',
  mat: 'bg-orange-100 text-orange-800',
  kultur: 'bg-pink-100 text-pink-800',
  humor: 'bg-yellow-100 text-yellow-800',
  annet: 'bg-gray-100 text-gray-800',
}

export default function EventCard({ event, isFavorite = false, onToggleFavorite, isLoggedIn = false, onAddToGroup }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-900 hover:text-blue-600 leading-tight"
        >
          {event.title}
        </a>
        {isLoggedIn && (
          <button
            aria-label={isFavorite ? 'fjern lagret' : 'lagre'}
            onClick={() => onToggleFavorite?.(event.id)}
            className="text-xl leading-none shrink-0"
          >
            {isFavorite ? '★' : '☆'}
          </button>
        )}
        {isLoggedIn && onAddToGroup && (
          <button
            aria-label="legg til i gruppeplan"
            onClick={() => onAddToGroup(event.id)}
            className="text-sm leading-none shrink-0 text-gray-400 hover:text-blue-600"
            title="Legg til i gruppeplan"
          >
            ＋
          </button>
        )}
      </div>

      {event.time && (
        <span className="text-sm text-gray-500">{event.time}</span>
      )}

      {event.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
      )}

      <div className="flex gap-2 flex-wrap mt-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.annet}`}>
          {event.category}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[event.source] ?? 'bg-gray-100 text-gray-800'}`}>
          {event.source}
        </span>
      </div>
    </div>
  )
}
