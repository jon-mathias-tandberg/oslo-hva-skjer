import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Header from './components/Header'
import Calendar from './components/Calendar'
import EventList from './components/EventList'
import CategoryFilter from './components/CategoryFilter'
import WheelOfFortune from './components/WheelOfFortune'
import RestaurantList from './components/RestaurantList'
import RestaurantMap from './components/RestaurantMap'
import PubMap from './components/PubMap'
import GroupManager from './components/GroupManager'
import GroupPlan from './components/GroupPlan'
import Toast from './components/Toast'
import { useAuth } from './hooks/useAuth'
import { useFavorites } from './hooks/useFavorites'
import { useGroupPlan } from './hooks/useGroupPlan'
import { useGroup } from './hooks/useGroup'
import { loadEvents, filterByDate, filterByCategory } from './utils/events'
import { db } from './firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export default function App() {
  const [allEvents, setAllEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState('alle')
  const [view, setView] = useState('calendar')
  const [activeGroupId, setActiveGroupId] = useState(null)


  const { user } = useAuth()
  const { favorites, toggleFavorite } = useFavorites(user?.uid ?? null)
  const { groups, createGroup, joinGroup } = useGroup(user?.uid ?? null)
  const { plan, addToPlan, lastAdded, clearLastAdded } = useGroupPlan(activeGroupId, user?.uid ?? null)

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

  const groupPlanDates = new Set(
    plan
      .map(p => allEvents.find(e => e.id === p.eventId)?.date)
      .filter(Boolean)
  )

  const lastAddedEvent = lastAdded ? allEvents.find(e => e.id === lastAdded.eventId) : null

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* View tabs — horizontally scrollable on mobile */}
        <div className="flex items-end gap-4 sm:gap-6 border-b border-gray-200 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setView('calendar')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
              view === 'calendar'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Kalender
          </button>
          <button
            onClick={() => setView('wheel')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
              view === 'wheel'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Wheel of Fortune
          </button>
          <button
            onClick={() => setView('grupper')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
              view === 'grupper'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Grupper 👥
          </button>
          {user && (
            <button
              onClick={() => setView('favoritter')}
              className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
                view === 'favoritter'
                  ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Favoritter ★
            </button>
          )}
          <button
            onClick={() => setView('restauranter')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
              view === 'restauranter'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Restauranter
          </button>
          <button
            onClick={() => setView('puber')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
              view === 'puber'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Puber
          </button>
          <button
            onClick={() => setView('vink')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
              view === 'vink'
                ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Vink
          </button>
          <button
            onClick={() => setView(v => v === 'about' ? 'calendar' : 'about')}
            className={`pb-3 text-xs font-bold tracking-widest uppercase transition-colors shrink-0 ${
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
                  groupPlanDates={activeGroupId && user ? groupPlanDates : new Set()}
                />
              </div>
              <div className="flex flex-col gap-4 pt-4 md:pt-0 md:pl-6">
                <CategoryFilter selected={category} onChange={setCategory} />
                {activeGroup && (
                  <p className="text-xs text-green-600 font-bold tracking-widest uppercase -mt-2">
                    {activeGroup.name}
                  </p>
                )}
                {activeGroupId && user && (
                  <GroupPlan groupId={activeGroupId} uid={user.uid} allEvents={allEvents} selectedDate={selectedDate} />
                )}
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
          </>
        ) : view === 'wheel' ? (
          <WheelOfFortune
            events={filterByCategory(allEvents, category)}
            isLoggedIn={!!user}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            groups={user ? groups : []}
            onAddToSpecificGroup={user ? async (groupId, eventId) => {
              const ref = doc(db, 'groups', groupId, 'plan', eventId)
              await setDoc(ref, { eventId, addedBy: user.uid, addedAt: serverTimestamp(), votes: [user.uid] })
            } : undefined}
          />
        ) : view === 'grupper' ? (
          <div className="max-w-2xl flex flex-col gap-8">
            {!user ? (
              <p className="text-sm text-gray-400 italic">Logg inn for å bruke grupper.</p>
            ) : (
              <>
                {/* Mine grupper */}
                {groups.length > 0 && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-900">
                      Mine grupper
                    </h2>
                    <div className="flex flex-col gap-2">
                      {groups.map(g => (
                        <button
                          key={g.id}
                          onClick={() => setActiveGroupId(id => id === g.id ? null : g.id)}
                          className={`text-left px-4 py-3 border transition-colors ${
                            activeGroupId === g.id
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 hover:border-gray-900 text-gray-700'
                          }`}
                        >
                          <span className="font-semibold">{g.name}</span>
                          {activeGroupId === g.id && <span className="text-xs ml-2 opacity-70">aktiv</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aktiv gruppeplan — alle datoer */}
                {activeGroupId && (
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-900">
                      {activeGroup?.name} — agenda
                    </h2>
                    <GroupPlan groupId={activeGroupId} uid={user.uid} allEvents={allEvents} />
                  </div>
                )}

                {/* Opprett / bli med */}
                <div>
                  <h2 className="font-serif text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                    {groups.length === 0 ? 'Kom i gang' : 'Ny gruppe / bli med'}
                  </h2>
                  <GroupManager
                    groups={groups}
                    createGroup={createGroup}
                    joinGroup={joinGroup}
                    onSelectGroup={id => setActiveGroupId(id)}
                    activeGroup={activeGroup}
                  />
                </div>
              </>
            )}
          </div>
        ) : view === 'favoritter' ? (
          <div>
            <h2 className="font-serif text-2xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-900">
              Mine favoritter
            </h2>
            {favorites.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Du har ingen stjernede events ennå. Klikk ☆ på et event for å lagre det.</p>
            ) : (
              <div>
                {allEvents
                  .filter(e => favorites.includes(e.id))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(event => (
                    <div key={event.id} className="py-3 border-b border-gray-100 last:border-b-0">
                      <div className={`text-xs font-bold tracking-widest uppercase mb-1 ${
                        { konsert: 'text-red-600', mat: 'text-amber-600', kultur: 'text-blue-600', humor: 'text-violet-600' }[event.category] ?? 'text-gray-500'
                      }`}>
                        {event.category} · {event.source}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <a href={event.url} target="_blank" rel="noopener noreferrer"
                          className="font-serif font-bold text-gray-900 hover:text-gray-600 transition-colors leading-snug">
                          {event.title}
                        </a>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            aria-label="fjern lagret"
                            onClick={() => toggleFavorite(event.id)}
                            className="text-lg leading-none text-gray-700 hover:text-gray-400 transition-colors"
                          >★</button>
                          {activeGroupId && user && (
                            <button
                              aria-label="legg til i gruppeplan"
                              onClick={() => addToPlan(event.id)}
                              className="text-sm leading-none text-gray-400 hover:text-gray-700 transition-colors"
                              title="Legg til i gruppeplan"
                            >＋</button>
                          )}
                        </div>
                      </div>
                      {event.time && <span className="text-xs text-gray-500 mt-0.5 block">{event.date} · {event.time}</span>}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ) : view === 'puber' ? (
          <PubMap />
        ) : view === 'vink' ? (
          <RestaurantList />
        ) : view === 'restauranter' ? (
          <RestaurantMap />
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
      {lastAddedEvent && (
        <Toast
          message={`Lagt til: ${lastAddedEvent.title}`}
          onDismiss={clearLastAdded}
        />
      )}
    </div>
  )
}
