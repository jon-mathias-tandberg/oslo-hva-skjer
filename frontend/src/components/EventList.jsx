import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import EventCard from './EventCard'

export default function EventList({ events, selectedDate, isLoggedIn, favorites, onToggleFavorite, onAddToGroup }) {
  const formatted = selectedDate
    ? format(parseISO(selectedDate), 'd. MMMM', { locale: nb })
    : ''

  return (
    <div>
      {selectedDate && (
        <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-900">
          {formatted}
        </h2>
      )}

      {events.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Ingen aktiviteter denne dagen.</p>
      ) : (
        <div>
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isFavorite={favorites.includes(event.id)}
              onToggleFavorite={onToggleFavorite}
              isLoggedIn={isLoggedIn}
              onAddToGroup={onAddToGroup}
            />
          ))}
        </div>
      )}
    </div>
  )
}
