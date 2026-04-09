import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Header from './components/Header'
import Calendar from './components/Calendar'
import EventList from './components/EventList'
import CategoryFilter from './components/CategoryFilter'
import WheelOfFortune from './components/WheelOfFortune'
import RestaurantList from './components/RestaurantList'
import GroupManager from './components/GroupManager'
import GroupPlan from './components/GroupPlan'
import { useAuth } from './hooks/useAuth'
import { useFavorites } from './hooks/useFavorites'
import { useGroupPlan } from './hooks/useGroupPlan'
import { useGroup } from './hooks/useGroup'
import { loadEvents, filterByDate, filterByCategory } from './utils/events'

export default function App() {
  const [allEvents, setAllEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState('alle')
  const [view, setView] = useState('calendar')
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [showGroupManager, setShowGroupManager] = useState(false)

  const { user } = useAuth()
  const { favorites, toggleFavorite } = useFavorites(user?.uid ?? null)
  const { groups, createGroup, joinGroup } = useGroup(user?.uid ?? null)
  const { addToPlan } = useGroupPlan(activeGroupId, user?.uid ?? null)

  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (!joinCode) return
    joinGroup(joinCode).then(id => {
      if (id) {
        setActiveGroupId(id)
        window.history.replaceState({}, '', window.location.pathname)
      }
    })
  }, [user, joinGroup])

  useEffect(() => {
    loadEvents().then(setAllEvents).catch(console.error)
  }, [])

  const eventsForDate = filterByCategory(filterByDate(allEvents, selectedDate), category)
  const activeGroup = groups.find(g => g.id === activeGroupId) ?? null

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* View tabs */}
        <div className="flex items-end gap-6 border-b border-gray-200">
          <button
            onClick={() => setView('calendar')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors ${
              view === 'calendar'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Kalender
          </button>
          <button
            onClick={() => setView('wheel')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors ${
              view === 'wheel'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Wheel of Fortune
          </button>
          <button
            onClick={() => setShowGroupManager(g => !g)}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors ${
              showGroupManager
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Grupper 👥
          </button>
          <button
            onClick={() => setView('restauranter')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors ${
              view === 'restauranter'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Restauranter
          </button>
          <button
            onClick={() => setView(v => v === 'about' ? 'calendar' : 'about')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors ${
              view === 'about'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Om
          </button>
        </div>

        {view === 'calendar' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-0 md:divide-x divide-gray-200">
              <div className="pr-0 md:pr-6">
                <Calendar
                  events={allEvents}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              </div>
              <div className="flex flex-col gap-4 pt-4 md:pt-0 md:pl-6">
                <CategoryFilter selected={category} onChange={setCategory} />
                <EventList
                  events={eventsForDate}
                  selectedDate={selectedDate}
                  isLoggedIn={!!user}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onAddToGroup={activeGroupId && user ? addToPlan : undefined}
                />
              </div>
            </div>
            {showGroupManager && user && (
              <GroupManager
                groups={groups}
                createGroup={createGroup}
                joinGroup={joinGroup}
                onSelectGroup={id => { setActiveGroupId(id); setShowGroupManager(false) }}
                activeGroup={activeGroup}
              />
            )}
            {activeGroupId && user && (
              <GroupPlan
                groupId={activeGroupId}
                uid={user.uid}
                allEvents={allEvents}
                selectedDate={selectedDate}
              />
            )}
          </>
        ) : view === 'wheel' ? (
          <WheelOfFortune events={filterByCategory(allEvents, category)} />
        ) : view === 'restauranter' ? (
          <RestaurantList />
        ) : (
          <div className="max-w-xl">
            <h2 className="font-serif text-3xl font-bold text-gray-900 mb-6 pb-4 border-b-2 border-gray-900">Om siden</h2>
            <div className="space-y-5 text-gray-700 leading-relaxed">
              <p>
                <span className="font-bold text-gray-900">Oslo Hva Skjer?</span> ble til fordi vi i vennegjengen brukte for mye tid på å sjekke ti ulike nettsider for å finne ut hva som skjer i Oslo — konserter på Blå, stand-up på Latter, teaterforestillinger, restaurantanbefalinger fra Vink. Vi ville ha alt på ett sted.
              </p>
              <p>
                I stedet for å lete etter en app som gjorde akkurat det vi ville, bygget vi den selv.
              </p>
              <p>
                Siden henter automatisk events fra Blå, Rockefeller, Latter, Oslo Operaen, Oslo Nye Teater, Det Norske Teatret, Meetup og Aftenposten Vink — og samler dem i en kalender. Du kan logge inn med Google for å lagre favoritter, og opprette en gruppe med vennegjengen for å planlegge ting i fellesskap.
              </p>
              <div className="border-t border-gray-200 pt-5">
                <p className="text-sm text-gray-500">
                  Laget av <span className="font-semibold text-gray-900">Jon Mathias Tandberg</span> — IT-konsulent i Sopra Steria, bosatt i Oslo.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Kildekode:{' '}
                  <a
                    href="https://github.com/jon-mathias-tandberg/oslo-hva-skjer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gray-900 hover:underline"
                  >
                    github.com/jon-mathias-tandberg/oslo-hva-skjer
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
