import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Header from './components/Header'
import Calendar from './components/Calendar'
import EventList from './components/EventList'
import CategoryFilter from './components/CategoryFilter'
import WheelOfFortune from './components/WheelOfFortune'
import { useAuth } from './hooks/useAuth'
import { useFavorites } from './hooks/useFavorites'
import { loadEvents, filterByDate, filterByCategory } from './utils/events'

export default function App() {
  const [allEvents, setAllEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState('alle')
  const [view, setView] = useState('calendar') // 'calendar' | 'wheel'

  const { user } = useAuth()
  const { favorites, toggleFavorite } = useFavorites(user?.uid ?? null)

  useEffect(() => {
    loadEvents().then(setAllEvents).catch(console.error)
  }, [])

  const eventsForDate = filterByCategory(filterByDate(allEvents, selectedDate), category)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Kalender
          </button>
          <button
            onClick={() => setView('wheel')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === 'wheel' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Wheel of Fortune
          </button>
        </div>

        {view === 'calendar' ? (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4">
            <div className="flex flex-col gap-3">
              <Calendar
                events={allEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
            <div className="flex flex-col gap-3">
              <CategoryFilter selected={category} onChange={setCategory} />
              <EventList
                events={eventsForDate}
                selectedDate={selectedDate}
                isLoggedIn={!!user}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          </div>
        ) : (
          <WheelOfFortune events={filterByCategory(allEvents, category)} />
        )}
      </main>
    </div>
  )
}
