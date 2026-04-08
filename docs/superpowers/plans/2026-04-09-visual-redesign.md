# Visual Redesign — Klassisk Avis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Oslo Hva Skjer frontend from flat blue Tailwind defaults to a classic newspaper/magazine visual style — white background, Georgia serif for titles, colour-coded uppercase category labels, and flat (no shadow/rounded) layout.

**Architecture:** Pure CSS/Tailwind changes across 8 React components. No logic changes. Existing behaviour tests continue to pass; only the CategoryFilter test needs a class name update (bg-blue-600 → bg-gray-900).

**Tech Stack:** React, Tailwind CSS v3, date-fns

---

## File Map

```
frontend/src/
  index.css                           # Add Georgia base font
  tailwind.config.js                  # Add serif font family entry
  App.jsx                             # Background, nav button style
  components/
    Header.jsx                        # Serif logo, thick border, black login
    AuthButton.jsx                    # Black login button
    Calendar.jsx                      # Flat, black selected day, red dot
    CategoryFilter.jsx                # Outline pills, black active
    EventCard.jsx                     # Newspaper label above title, flat
    EventList.jsx                     # Serif date heading, dividers
    WheelOfFortune.jsx                # Black/white style
  __tests__/
    CategoryFilter.test.jsx           # Update bg-blue-600 → bg-gray-900
```

---

## Task 1: Global base styles + App background

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/tailwind.config.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Add Georgia font base layer to `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #fafaf8;
    font-family: system-ui, sans-serif;
  }
}
```

- [ ] **Step 2: Add serif font to Tailwind theme in `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'ui-serif', 'Times New Roman', 'serif'],
      },
      colors: {
        paper: '#fafaf8',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Update `frontend/src/App.jsx` — background and nav buttons**

Replace the outer wrapper and nav button classes:

```jsx
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import Header from './components/Header'
import Calendar from './components/Calendar'
import EventList from './components/EventList'
import CategoryFilter from './components/CategoryFilter'
import WheelOfFortune from './components/WheelOfFortune'
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
        <div className="flex gap-6 border-b border-gray-200 pb-0">
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
        ) : (
          <WheelOfFortune events={filterByCategory(allEvents, category)} />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd frontend && npm test 2>&1 | tail -5
```
Expected: 34 passed

- [ ] **Step 5: Verify build passes**

```bash
npm run build 2>&1 | tail -3
```
Expected: ✓ built

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/src/index.css frontend/tailwind.config.js frontend/src/App.jsx
git commit -m "style: newspaper base — paper background, underline nav tabs"
```

---

## Task 2: Header + AuthButton

**Files:**
- Modify: `frontend/src/components/Header.jsx`
- Modify: `frontend/src/components/AuthButton.jsx`

- [ ] **Step 1: Update `frontend/src/components/Header.jsx`**

```jsx
import AuthButton from './AuthButton'

export default function Header() {
  return (
    <header className="bg-paper border-b-2 border-gray-900 px-4 py-3 flex items-center justify-between">
      <h1 className="font-serif text-xl font-bold text-gray-900 tracking-tight">
        Oslo Hva Skjer?
      </h1>
      <AuthButton />
    </header>
  )
}
```

- [ ] **Step 2: Update `frontend/src/components/AuthButton.jsx`**

```jsx
import { useAuth } from '../hooks/useAuth'

export default function AuthButton() {
  const { user, loading, error, signInWithGoogle, logout } = useAuth()

  if (loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="w-7 h-7 rounded-full"
        />
        <span className="text-sm text-gray-700 hidden sm:inline">{user.displayName}</span>
        <button
          onClick={logout}
          className="text-xs font-bold tracking-widest uppercase text-gray-400 hover:text-gray-900 transition-colors"
        >
          Logg ut
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold tracking-widest uppercase hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Logg inn med Google
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test 2>&1 | tail -5
```
Expected: 34 passed

- [ ] **Step 4: Commit**

```bash
cd ..
git add frontend/src/components/Header.jsx frontend/src/components/AuthButton.jsx
git commit -m "style: newspaper header — serif logo, thick border, black login button"
```

---

## Task 3: Calendar

**Files:**
- Modify: `frontend/src/components/Calendar.jsx`

- [ ] **Step 1: Read current tests to understand what must stay green**

The Calendar test checks:
- Days render (text "10", "15")
- Clicking day calls `onSelectDate('2026-04-15')`
- `data-has-events="true"` attribute on event days

None of these test CSS classes — all tests stay green.

- [ ] **Step 2: Replace `frontend/src/components/Calendar.jsx`**

```jsx
import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, parseISO, addMonths, subMonths
} from 'date-fns'
import { nb } from 'date-fns/locale'

export default function Calendar({ events, selectedDate, onSelectDate }) {
  const [viewDate, setViewDate] = useState(
    selectedDate ? parseISO(selectedDate) : new Date()
  )

  const eventDates = new Set(events.map(e => e.date))

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(d => subMonths(d, 1))}
          className="text-gray-400 hover:text-gray-900 transition-colors px-1 text-lg"
          aria-label="forrige måned"
        >
          ‹
        </button>
        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-900">
          {format(viewDate, 'MMMM yyyy', { locale: nb })}
        </h2>
        <button
          onClick={() => setViewDate(d => addMonths(d, 1))}
          className="text-gray-400 hover:text-gray-900 transition-colors px-1 text-lg"
          aria-label="neste måned"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center mb-2">
        {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(d => (
          <div key={d} className="text-xs font-bold text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonth(day, viewDate)
          const isSelected = dateStr === selectedDate
          const hasEvents = eventDates.has(dateStr)

          return (
            <button
              key={dateStr}
              data-testid={`day-${dateStr}`}
              data-has-events={hasEvents ? 'true' : 'false'}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center py-1.5 text-sm transition-colors ${
                !isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:text-gray-900'
              } ${isSelected ? 'font-bold' : ''}`}
            >
              <span className={`w-7 h-7 flex items-center justify-center ${
                isSelected ? 'bg-gray-900 text-white rounded-full' : ''
              }`}>
                {format(day, 'd')}
              </span>
              {hasEvents && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-red-600 mt-0.5" />
              )}
              {hasEvents && isSelected && (
                <span className="w-1 h-1 rounded-full bg-white mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npx vitest run src/__tests__/Calendar.test.jsx 2>&1 | tail -6
```
Expected: 3 passed

- [ ] **Step 4: Commit**

```bash
cd ..
git add frontend/src/components/Calendar.jsx
git commit -m "style: newspaper calendar — flat, black selected day, red event dot"
```

---

## Task 4: EventCard

**Files:**
- Modify: `frontend/src/components/EventCard.jsx`

This is the biggest visual change: replace badge-style category pills with uppercase newspaper-style label above the title.

- [ ] **Step 1: Check existing tests to confirm what must stay green**

`EventCard.test.jsx` tests:
- Renders title and time (`getByText('Aurora')`, `getByText('19:30')`)
- Renders source badge — test checks `getByText('rockefeller')` — **this text must still appear**
- Renders external link with `href` and `target="_blank"`
- Calls `onToggleFavorite` when star clicked (aria-label `/lagre/i`)
- No button when `isLoggedIn=false`

The test checks for text "rockefeller" in a `getByText` call. In the new design, we render `KATEGORI · KILDE` as combined text. We need to ensure the source text is still present (it will be part of the label).

- [ ] **Step 2: Define the category accent colours as a constant**

```js
const CATEGORY_TEXT_COLORS = {
  konsert: 'text-red-600',
  mat: 'text-amber-600',
  kultur: 'text-blue-600',
  humor: 'text-violet-600',
  annet: 'text-gray-500',
}
```

- [ ] **Step 3: Replace `frontend/src/components/EventCard.jsx`**

```jsx
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
```

- [ ] **Step 4: Run EventCard tests**

```bash
cd frontend && npx vitest run src/__tests__/EventCard.test.jsx 2>&1 | tail -6
```
Expected: 5 passed (the test for "rockefeller" uses `getByText('rockefeller')` which finds the text inside the label span — still present)

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/components/EventCard.jsx
git commit -m "style: newspaper event card — uppercase label above serif title, flat"
```

---

## Task 5: CategoryFilter + update test

**Files:**
- Modify: `frontend/src/components/CategoryFilter.jsx`
- Modify: `frontend/src/__tests__/CategoryFilter.test.jsx`

- [ ] **Step 1: Update test first — change class assertion**

Read `frontend/src/__tests__/CategoryFilter.test.jsx`. The test `marks selected category as active` currently checks `expect(btn).toHaveClass('bg-blue-600')`. Change to `toHaveClass('bg-gray-900')`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CategoryFilter from '../components/CategoryFilter'

describe('CategoryFilter', () => {
  it('renders all category buttons', () => {
    render(<CategoryFilter selected="alle" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /alle/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /konsert/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mat/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /kultur/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /humor/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annet/i })).toBeInTheDocument()
  })

  it('marks selected category as active', () => {
    render(<CategoryFilter selected="konsert" onChange={() => {}} />)
    const btn = screen.getByRole('button', { name: /konsert/i })
    expect(btn).toHaveClass('bg-gray-900')
  })

  it('calls onChange with category when clicked', () => {
    const onChange = vi.fn()
    render(<CategoryFilter selected="alle" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /mat/i }))
    expect(onChange).toHaveBeenCalledWith('mat')
  })
})
```

- [ ] **Step 2: Run test to verify it now fails (bg-gray-900 not yet applied)**

```bash
cd frontend && npx vitest run src/__tests__/CategoryFilter.test.jsx 2>&1 | tail -6
```
Expected: FAIL — `bg-gray-900` not found

- [ ] **Step 3: Update `frontend/src/components/CategoryFilter.jsx`**

```jsx
const CATEGORIES = ['alle', 'konsert', 'mat', 'kultur', 'humor', 'annet']

export default function CategoryFilter({ selected, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1 text-xs font-bold tracking-widest uppercase transition-colors border ${
            selected === cat
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-paper text-gray-500 border-gray-300 hover:border-gray-700 hover:text-gray-900'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/CategoryFilter.test.jsx 2>&1 | tail -6
```
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/components/CategoryFilter.jsx frontend/src/__tests__/CategoryFilter.test.jsx
git commit -m "style: newspaper category filter — outline pills, black active state"
```

---

## Task 6: EventList

**Files:**
- Modify: `frontend/src/components/EventList.jsx`

- [ ] **Step 1: Replace `frontend/src/components/EventList.jsx`**

The test checks: renders events by title, empty state text `/ingen aktiviteter/i`, date heading `/10. april/i`. All pass with the new markup.

```jsx
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
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run src/__tests__/EventList.test.jsx 2>&1 | tail -6
```
Expected: 3 passed

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/components/EventList.jsx
git commit -m "style: newspaper event list — serif date heading with thick underline"
```

---

## Task 7: WheelOfFortune

**Files:**
- Modify: `frontend/src/components/WheelOfFortune.jsx`

- [ ] **Step 1: Replace `frontend/src/components/WheelOfFortune.jsx`**

Keep all behaviour (spin logic, setTimeout, aria attributes) — only change CSS classes.

```jsx
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
```

- [ ] **Step 2: Run WheelOfFortune tests**

```bash
cd frontend && npx vitest run src/__tests__/WheelOfFortune.test.jsx 2>&1 | tail -6
```
Expected: 3 passed

- [ ] **Step 3: Commit**

```bash
cd ..
git add frontend/src/components/WheelOfFortune.jsx
git commit -m "style: newspaper wheel of fortune — black/white alternating segments, flat result card"
```

---

## Task 8: Full test suite + build + deploy

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npm test 2>&1 | tail -8
```
Expected: 10 files, 34 tests, all pass

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -5
```
Expected: ✓ built, no errors

- [ ] **Step 3: Push to deploy**

```bash
cd .. && git push
```
Expected: GitHub Actions deploy runs and publishes to https://oslo-hva-skjer.web.app
