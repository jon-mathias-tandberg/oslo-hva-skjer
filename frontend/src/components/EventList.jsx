import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import EventCard from './EventCard'

export default function EventList({ events, selectedDate, isLoggedIn, favorites, onToggleFavorite, onAddToGroup }) {
  const formatted = selectedDate
    ? format(parseISO(selectedDate), 'd. MMMM', { locale: nb })
    : ''

  return (
    <div className="flex flex-col gap-3">
      {selectedDate && (
        <h2 className="text-lg font-semibold text-gray-800">{formatted}</h2>
      )}

      {events.length === 0 ? (
        <p className="text-gray-400 text-sm">Ingen aktiviteter denne dagen.</p>
      ) : (
        events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            isFavorite={favorites.includes(event.id)}
            onToggleFavorite={onToggleFavorite}
            isLoggedIn={isLoggedIn}
            onAddToGroup={onAddToGroup}
          />
        ))
      )}
    </div>
  )
}
