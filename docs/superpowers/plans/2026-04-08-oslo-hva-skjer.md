# Oslo Hva Skjer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React web app that aggregates Oslo events from multiple sources, displays them in a calendar, and lets logged-in users save favourites via Google Auth.

**Architecture:** Static React frontend (Vite + Tailwind) hosted on Azure Static Web Apps. Events are scraped nightly by GitHub Actions (Python scripts), aggregated into `data/events.json`, and committed to the repo — no database for events. User favourites are stored in Firebase Firestore, auth via Firebase Google OAuth.

**Tech Stack:** React 18, Vite, Tailwind CSS, date-fns, Firebase (Auth + Firestore), Vitest + React Testing Library, Python 3 + BeautifulSoup + requests, GitHub Actions, Azure Static Web Apps

---

## File Map

```
oslo-hva-skjer/
├── data/
│   └── events.json                        # Aggregated events (committed by CI)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── firebase.js                    # Firebase init + exports
│   │   ├── hooks/
│   │   │   ├── useAuth.js                 # Google auth state
│   │   │   └── useFavorites.js            # Firestore read/write
│   │   ├── utils/
│   │   │   └── events.js                  # Load + filter events.json
│   │   └── components/
│   │       ├── Header.jsx                 # Nav + auth button
│   │       ├── AuthButton.jsx             # Google sign-in/out
│   │       ├── Calendar.jsx               # Month view
│   │       ├── EventList.jsx              # Events for selected date
│   │       ├── EventCard.jsx              # Single event display
│   │       ├── CategoryFilter.jsx         # Filter buttons
│   │       └── WheelOfFortune.jsx         # Random event spinner
│   └── src/__tests__/
│       ├── events.test.js
│       ├── EventCard.test.jsx
│       ├── CategoryFilter.test.jsx
│       ├── EventList.test.jsx
│       ├── Calendar.test.jsx
│       ├── WheelOfFortune.test.jsx
│       └── useFavorites.test.js
├── scrapers/
│   ├── requirements.txt
│   ├── scrape_blaa.py
│   ├── scrape_rockefeller.py
│   ├── scrape_meetup.py
│   ├── scrape_vink.py
│   └── aggregate.py
├── staticwebapp.config.json
└── .github/workflows/
    ├── scrape.yml
    └── deploy.yml
```

---

## Task 1: Scaffold the frontend

**Files:**
- Create: `frontend/` (entire Vite project)
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`

- [ ] **Step 1: Bootstrap Vite + React project**

```bash
cd /path/to/oslo-hva-skjer
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install firebase date-fns
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind — replace `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Replace `src/index.css` with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Update `vite.config.js` to add Vitest config**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 6: Create test setup file `src/__tests__/setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Replace `src/App.jsx` with empty shell**

```jsx
export default function App() {
  return <div className="min-h-screen bg-gray-50">Oslo Hva Skjer</div>
}
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: Server running at `http://localhost:5173`

- [ ] **Step 9: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: scaffold React + Vite + Tailwind frontend"
```

---

## Task 2: Sample events data + utilities

**Files:**
- Create: `data/events.json`
- Create: `frontend/src/utils/events.js`
- Create: `frontend/src/__tests__/events.test.js`

- [ ] **Step 1: Create `data/events.json` with sample data**

```json
[
  {
    "id": "blaa-2026-04-10-1",
    "title": "The Tallest Man on Earth",
    "date": "2026-04-10",
    "time": "20:00",
    "category": "konsert",
    "source": "blaa",
    "url": "https://www.blaaoslo.no/events/tallest-man",
    "description": "Konsert på Blå"
  },
  {
    "id": "rockefeller-2026-04-12-1",
    "title": "Aurora",
    "date": "2026-04-12",
    "time": "19:30",
    "category": "konsert",
    "source": "rockefeller",
    "url": "https://www.rockefeller.no/events/aurora",
    "description": "Konsert på Rockefeller"
  },
  {
    "id": "meetup-2026-04-11-1",
    "title": "Oslo Tech Meetup",
    "date": "2026-04-11",
    "time": "18:00",
    "category": "kultur",
    "source": "meetup",
    "url": "https://www.meetup.com/oslo-tech/events/123",
    "description": "Månedlig tech-treff"
  },
  {
    "id": "vink-2026-04-10-1",
    "title": "Maaemo",
    "date": "2026-04-10",
    "time": null,
    "category": "mat",
    "source": "vink",
    "url": "https://www.aftenposten.no/vink/maaemo",
    "description": "Tre-stjerners restaurant"
  }
]
```

- [ ] **Step 2: Write failing tests for `events.js`**

Create `frontend/src/__tests__/events.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { filterByDate, filterByCategory, getEventsForDateRange } from '../utils/events'

const sampleEvents = [
  { id: '1', title: 'A', date: '2026-04-10', category: 'konsert', source: 'blaa', url: '#' },
  { id: '2', title: 'B', date: '2026-04-10', category: 'mat', source: 'vink', url: '#' },
  { id: '3', title: 'C', date: '2026-04-11', category: 'konsert', source: 'rockefeller', url: '#' },
  { id: '4', title: 'D', date: '2026-04-12', category: 'kultur', source: 'meetup', url: '#' },
]

describe('filterByDate', () => {
  it('returns events matching the given date', () => {
    const result = filterByDate(sampleEvents, '2026-04-10')
    expect(result).toHaveLength(2)
    expect(result.map(e => e.id)).toEqual(['1', '2'])
  })

  it('returns empty array when no events on date', () => {
    const result = filterByDate(sampleEvents, '2026-04-20')
    expect(result).toHaveLength(0)
  })
})

describe('filterByCategory', () => {
  it('returns all events when category is "alle"', () => {
    expect(filterByCategory(sampleEvents, 'alle')).toHaveLength(4)
  })

  it('filters events by category', () => {
    const result = filterByCategory(sampleEvents, 'konsert')
    expect(result).toHaveLength(2)
    expect(result.every(e => e.category === 'konsert')).toBe(true)
  })
})

describe('getEventsForDateRange', () => {
  it('returns events within date range inclusive', () => {
    const result = getEventsForDateRange(sampleEvents, '2026-04-10', '2026-04-11')
    expect(result).toHaveLength(3)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/events.test.js
```
Expected: FAIL — `filterByDate` not defined

- [ ] **Step 4: Create `frontend/src/utils/events.js`**

```js
/**
 * Filter events to those occurring on a specific date (YYYY-MM-DD).
 */
export function filterByDate(events, date) {
  return events.filter(e => e.date === date)
}

/**
 * Filter events by category. Pass 'alle' to return all events.
 */
export function filterByCategory(events, category) {
  if (category === 'alle') return events
  return events.filter(e => e.category === category)
}

/**
 * Return events within [fromDate, toDate] inclusive (YYYY-MM-DD strings).
 */
export function getEventsForDateRange(events, fromDate, toDate) {
  return events.filter(e => e.date >= fromDate && e.date <= toDate)
}

/**
 * Fetch and parse events.json. Path is relative to public root.
 */
export async function loadEvents() {
  const res = await fetch('/data/events.json')
  if (!res.ok) throw new Error(`Failed to load events: ${res.status}`)
  return res.json()
}
```

- [ ] **Step 5: Copy `data/events.json` to `frontend/public/data/`**

```bash
mkdir -p frontend/public/data
cp data/events.json frontend/public/data/events.json
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/events.test.js
```
Expected: PASS (3 test suites, all green)

- [ ] **Step 7: Commit**

```bash
cd ..
git add data/ frontend/
git commit -m "feat: add events data and filter utilities"
```

---

## Task 3: EventCard component

**Files:**
- Create: `frontend/src/components/EventCard.jsx`
- Create: `frontend/src/__tests__/EventCard.test.jsx`

- [ ] **Step 1: Write failing test**

Create `frontend/src/__tests__/EventCard.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EventCard from '../components/EventCard'

const event = {
  id: '1',
  title: 'Aurora',
  date: '2026-04-12',
  time: '19:30',
  category: 'konsert',
  source: 'rockefeller',
  url: 'https://example.com',
  description: 'Konsert på Rockefeller',
}

describe('EventCard', () => {
  it('renders event title and time', () => {
    render(<EventCard event={event} />)
    expect(screen.getByText('Aurora')).toBeInTheDocument()
    expect(screen.getByText('19:30')).toBeInTheDocument()
  })

  it('renders source badge', () => {
    render(<EventCard event={event} />)
    expect(screen.getByText('rockefeller')).toBeInTheDocument()
  })

  it('renders external link', () => {
    render(<EventCard event={event} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('calls onToggleFavorite when star clicked (logged in)', () => {
    const onToggle = vi.fn()
    render(<EventCard event={event} isFavorite={false} onToggleFavorite={onToggle} isLoggedIn={true} />)
    fireEvent.click(screen.getByRole('button', { name: /lagre/i }))
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('does not render favorite button when not logged in', () => {
    render(<EventCard event={event} isLoggedIn={false} />)
    expect(screen.queryByRole('button', { name: /lagre/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/EventCard.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create `frontend/src/components/EventCard.jsx`**

```jsx
const SOURCE_COLORS = {
  blaa: 'bg-blue-100 text-blue-800',
  rockefeller: 'bg-purple-100 text-purple-800',
  meetup: 'bg-red-100 text-red-800',
  vink: 'bg-yellow-100 text-yellow-800',
}

const CATEGORY_COLORS = {
  konsert: 'bg-green-100 text-green-800',
  mat: 'bg-orange-100 text-orange-800',
  kultur: 'bg-pink-100 text-pink-800',
  annet: 'bg-gray-100 text-gray-800',
}

export default function EventCard({ event, isFavorite = false, onToggleFavorite, isLoggedIn = false }) {
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
            onClick={() => onToggleFavorite(event.id)}
            className="text-xl leading-none shrink-0"
          >
            {isFavorite ? '★' : '☆'}
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/EventCard.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add EventCard component"
```

---

## Task 4: CategoryFilter component

**Files:**
- Create: `frontend/src/components/CategoryFilter.jsx`
- Create: `frontend/src/__tests__/CategoryFilter.test.jsx`

- [ ] **Step 1: Write failing test**

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
  })

  it('marks selected category as active', () => {
    render(<CategoryFilter selected="konsert" onChange={() => {}} />)
    const btn = screen.getByRole('button', { name: /konsert/i })
    expect(btn).toHaveClass('bg-blue-600')
  })

  it('calls onChange with category when clicked', () => {
    const onChange = vi.fn()
    render(<CategoryFilter selected="alle" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /mat/i }))
    expect(onChange).toHaveBeenCalledWith('mat')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/CategoryFilter.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create `frontend/src/components/CategoryFilter.jsx`**

```jsx
const CATEGORIES = ['alle', 'konsert', 'mat', 'kultur', 'annet']

export default function CategoryFilter({ selected, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
            selected === cat
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
cd frontend && npx vitest run src/__tests__/CategoryFilter.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add CategoryFilter component"
```

---

## Task 5: EventList component

**Files:**
- Create: `frontend/src/components/EventList.jsx`
- Create: `frontend/src/__tests__/EventList.test.jsx`

- [ ] **Step 1: Write failing test**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EventList from '../components/EventList'

const events = [
  { id: '1', title: 'Konsert A', date: '2026-04-10', category: 'konsert', source: 'blaa', url: '#' },
  { id: '2', title: 'Restaurant B', date: '2026-04-10', category: 'mat', source: 'vink', url: '#' },
]

describe('EventList', () => {
  it('renders all events', () => {
    render(<EventList events={events} selectedDate="2026-04-10" isLoggedIn={false} favorites={[]} onToggleFavorite={() => {}} />)
    expect(screen.getByText('Konsert A')).toBeInTheDocument()
    expect(screen.getByText('Restaurant B')).toBeInTheDocument()
  })

  it('shows empty state when no events', () => {
    render(<EventList events={[]} selectedDate="2026-04-20" isLoggedIn={false} favorites={[]} onToggleFavorite={() => {}} />)
    expect(screen.getByText(/ingen aktiviteter/i)).toBeInTheDocument()
  })

  it('shows selected date in heading', () => {
    render(<EventList events={events} selectedDate="2026-04-10" isLoggedIn={false} favorites={[]} onToggleFavorite={() => {}} />)
    expect(screen.getByText(/10. april/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/EventList.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create `frontend/src/components/EventList.jsx`**

```jsx
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import EventCard from './EventCard'

export default function EventList({ events, selectedDate, isLoggedIn, favorites, onToggleFavorite }) {
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
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/EventList.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add EventList component"
```

---

## Task 6: Calendar component

**Files:**
- Create: `frontend/src/components/Calendar.jsx`
- Create: `frontend/src/__tests__/Calendar.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Calendar from '../components/Calendar'

const events = [
  { id: '1', date: '2026-04-10', category: 'konsert', title: 'A', source: 'blaa', url: '#' },
  { id: '2', date: '2026-04-15', category: 'mat', title: 'B', source: 'vink', url: '#' },
]

describe('Calendar', () => {
  it('renders days of selected month', () => {
    render(<Calendar events={events} selectedDate="2026-04-10" onSelectDate={() => {}} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('calls onSelectDate when day is clicked', () => {
    const onSelect = vi.fn()
    render(<Calendar events={events} selectedDate="2026-04-10" onSelectDate={onSelect} />)
    fireEvent.click(screen.getByText('15'))
    expect(onSelect).toHaveBeenCalledWith('2026-04-15')
  })

  it('marks days with events with a dot indicator', () => {
    render(<Calendar events={events} selectedDate="2026-04-10" onSelectDate={() => {}} />)
    // Days with events have data-has-events attribute
    const day10 = screen.getByTestId('day-2026-04-10')
    expect(day10).toHaveAttribute('data-has-events', 'true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/Calendar.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create `frontend/src/components/Calendar.jsx`**

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(d => subMonths(d, 1))}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="forrige måned"
        >
          ‹
        </button>
        <h2 className="font-semibold capitalize">
          {format(viewDate, 'MMMM yyyy', { locale: nb })}
        </h2>
        <button
          onClick={() => setViewDate(d => addMonths(d, 1))}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="neste måned"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
        {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map(d => (
          <div key={d}>{d}</div>
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
              className={`relative flex flex-col items-center py-1 rounded text-sm transition-colors ${
                !isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100'
              } ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
            >
              {format(day, 'd')}
              {hasEvents && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/Calendar.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add Calendar component"
```

---

## Task 7: Wheel of Fortune component

**Files:**
- Create: `frontend/src/components/WheelOfFortune.jsx`
- Create: `frontend/src/__tests__/WheelOfFortune.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import WheelOfFortune from '../components/WheelOfFortune'

const events = [
  { id: '1', title: 'Konsert A', date: '2026-04-10', category: 'konsert', source: 'blaa', url: '#' },
  { id: '2', title: 'Restaurant B', date: '2026-04-10', category: 'mat', source: 'vink', url: '#' },
  { id: '3', title: 'Meetup C', date: '2026-04-11', category: 'kultur', source: 'meetup', url: '#' },
]

describe('WheelOfFortune', () => {
  it('renders spin button', () => {
    render(<WheelOfFortune events={events} />)
    expect(screen.getByRole('button', { name: /spin/i })).toBeInTheDocument()
  })

  it('shows a result after spinning', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<WheelOfFortune events={events} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /spin/i }))
      await new Promise(r => setTimeout(r, 1600))
    })
    expect(screen.getByTestId('wheel-result')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('shows empty state when no events', () => {
    render(<WheelOfFortune events={[]} />)
    expect(screen.getByText(/ingen events/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/WheelOfFortune.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Create `frontend/src/components/WheelOfFortune.jsx`**

```jsx
import { useState } from 'react'

export default function WheelOfFortune({ events }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)

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

    setTimeout(() => {
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
        <div data-testid="wheel-result" className="w-full mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/WheelOfFortune.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add WheelOfFortune component"
```

---

## Task 8: Firebase setup + useAuth hook

**Files:**
- Create: `frontend/src/firebase.js`
- Create: `frontend/src/hooks/useAuth.js`

> **Prerequisites:** Create a Firebase project at console.firebase.google.com, enable Google Sign-In under Authentication → Sign-in method, and copy the config values.

- [ ] **Step 1: Create `frontend/src/firebase.js`**

Replace the config values with those from your Firebase project console.

```js
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
```

- [ ] **Step 2: Create `frontend/.env.local` with your Firebase values**

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

- [ ] **Step 3: Add `.env.local` to `.gitignore`**

```bash
echo "frontend/.env.local" >> .gitignore
```

- [ ] **Step 4: Create `frontend/src/hooks/useAuth.js`**

```js
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  async function logout() {
    await signOut(auth)
  }

  return { user, loading, signInWithGoogle, logout }
}
```

- [ ] **Step 5: Verify Firebase connects — run dev server and check console for errors**

```bash
cd frontend && npm run dev
```
Expected: No Firebase initialization errors in browser console.

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/src/firebase.js frontend/src/hooks/useAuth.js .gitignore
git commit -m "feat: add Firebase auth setup and useAuth hook"
```

---

## Task 9: useFavorites hook + AuthButton

**Files:**
- Create: `frontend/src/hooks/useFavorites.js`
- Create: `frontend/src/components/AuthButton.jsx`
- Create: `frontend/src/__tests__/useFavorites.test.js`

- [ ] **Step 1: Write failing tests for useFavorites**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock Firebase
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn((_, cb) => { cb({ docs: [] }); return () => {} }),
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 'ts'),
}))

import { useFavorites } from '../hooks/useFavorites'

describe('useFavorites', () => {
  it('returns empty favorites when not logged in', () => {
    const { result } = renderHook(() => useFavorites(null))
    expect(result.current.favorites).toEqual([])
  })

  it('toggleFavorite adds new favorite', async () => {
    const { setDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useFavorites('uid-123'))
    await act(async () => {
      await result.current.toggleFavorite('event-1')
    })
    expect(setDoc).toHaveBeenCalled()
  })

  it('toggleFavorite removes existing favorite', async () => {
    const { deleteDoc, onSnapshot } = await import('firebase/firestore')
    onSnapshot.mockImplementationOnce((_, cb) => {
      cb({ docs: [{ id: 'event-1' }] })
      return () => {}
    })
    const { result } = renderHook(() => useFavorites('uid-123'))
    await act(async () => {
      await result.current.toggleFavorite('event-1')
    })
    expect(deleteDoc).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/useFavorites.test.js
```
Expected: FAIL

- [ ] **Step 3: Create `frontend/src/hooks/useFavorites.js`**

```js
import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export function useFavorites(uid) {
  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    if (!uid) { setFavorites([]); return }

    const ref = collection(db, 'users', uid, 'favorites')
    const unsubscribe = onSnapshot(ref, snap => {
      setFavorites(snap.docs.map(d => d.id))
    })
    return unsubscribe
  }, [uid])

  async function toggleFavorite(eventId) {
    if (!uid) return
    const ref = doc(db, 'users', uid, 'favorites', eventId)
    if (favorites.includes(eventId)) {
      await deleteDoc(ref)
    } else {
      await setDoc(ref, { savedAt: serverTimestamp() })
    }
  }

  return { favorites, toggleFavorite }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/useFavorites.test.js
```
Expected: PASS

- [ ] **Step 5: Create `frontend/src/components/AuthButton.jsx`**

```jsx
import { useAuth } from '../hooks/useAuth'

export default function AuthButton() {
  const { user, loading, signInWithGoogle, logout } = useAuth()

  if (loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={user.photoURL}
          alt={user.displayName}
          className="w-8 h-8 rounded-full"
        />
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Logg ut
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Logg inn med Google
    </button>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add useFavorites hook and AuthButton component"
```

---

## Task 10: Header + wire up App

**Files:**
- Create: `frontend/src/components/Header.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create `frontend/src/components/Header.jsx`**

```jsx
import AuthButton from './AuthButton'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900">Oslo Hva Skjer? 🎉</h1>
      <AuthButton />
    </header>
  )
}
```

- [ ] **Step 2: Update `frontend/src/App.jsx` to wire everything together**

```jsx
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
            Wheel of Fortune 🎡
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
```

- [ ] **Step 3: Run dev server and verify the app works end-to-end**

```bash
cd frontend && npm run dev
```
Expected: App loads, calendar shows, clicking a date shows events, Wheel of Fortune spins, Google login button visible.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: wire up App with Calendar, EventList, Auth, and WheelOfFortune"
```

---

## Task 11: Python scraper setup

**Files:**
- Create: `scrapers/requirements.txt`
- Create: `scrapers/scrape_blaa.py`
- Create: `scrapers/scrape_rockefeller.py`
- Create: `scrapers/scrape_meetup.py`
- Create: `scrapers/scrape_vink.py`

> **Note:** CSS selectors in these scrapers must be verified against each live site before they will work. Each scraper includes a `verify()` function — run it after writing the scraper to confirm the selectors are correct, and adjust as needed.

- [ ] **Step 1: Create `scrapers/requirements.txt`**

```
requests==2.31.0
beautifulsoup4==4.12.3
python-dateutil==2.9.0
```

- [ ] **Step 2: Create `scrapers/scrape_blaa.py`**

```python
"""
Scraper for Blå Oslo (blaaoslo.no).
Returns a list of event dicts matching the events.json schema.

Verify selectors by running: python scrape_blaa.py
"""
import re
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

BASE_URL = "https://www.blaaoslo.no"
EVENTS_URL = f"{BASE_URL}/program"


def scrape() -> list[dict]:
    res = requests.get(EVENTS_URL, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    # Selector: inspect blaaoslo.no/program and update this selector to match event list items
    for item in soup.select("article.event, .event-item, li.program-item"):
        try:
            title_el = item.select_one("h2, h3, .event-title, .title")
            date_el = item.select_one("time, .date, .event-date")
            link_el = item.select_one("a[href]")

            if not title_el or not date_el:
                continue

            title = title_el.get_text(strip=True)
            raw_date = date_el.get("datetime") or date_el.get_text(strip=True)
            parsed = dateparser.parse(raw_date, dayfirst=True)
            if not parsed:
                continue

            href = link_el["href"] if link_el else ""
            url = href if href.startswith("http") else BASE_URL + href

            events.append({
                "id": f"blaa-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M") if parsed.hour else None,
                "category": "konsert",
                "source": "blaa",
                "url": url,
                "description": "",
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Blå")
    for e in results[:3]:
        print(e)
```

- [ ] **Step 3: Create `scrapers/scrape_rockefeller.py`**

```python
"""
Scraper for Rockefeller (rockefeller.no).
Returns a list of event dicts matching the events.json schema.

Verify selectors by running: python scrape_rockefeller.py
"""
import re
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

BASE_URL = "https://www.rockefeller.no"
EVENTS_URL = f"{BASE_URL}/program"


def scrape() -> list[dict]:
    res = requests.get(EVENTS_URL, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    # Selector: inspect rockefeller.no/program and update to match event list items
    for item in soup.select("article, .event, .program-item, li[class*='event']"):
        try:
            title_el = item.select_one("h2, h3, .title, .event-name")
            date_el = item.select_one("time, .date, [class*='date']")
            link_el = item.select_one("a[href]")

            if not title_el or not date_el:
                continue

            title = title_el.get_text(strip=True)
            raw_date = date_el.get("datetime") or date_el.get_text(strip=True)
            parsed = dateparser.parse(raw_date, dayfirst=True)
            if not parsed:
                continue

            href = link_el["href"] if link_el else ""
            url = href if href.startswith("http") else BASE_URL + href

            events.append({
                "id": f"rockefeller-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M") if parsed.hour else None,
                "category": "konsert",
                "source": "rockefeller",
                "url": url,
                "description": "",
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Rockefeller")
    for e in results[:3]:
        print(e)
```

- [ ] **Step 4: Create `scrapers/scrape_meetup.py`**

```python
"""
Fetches Oslo events from Meetup's public GraphQL API.
Returns a list of event dicts matching the events.json schema.

Verify by running: python scrape_meetup.py
"""
import re
import requests

API_URL = "https://www.meetup.com/gql"

QUERY = """
query($lat: Float!, $lon: Float!, $radius: Int!, $first: Int!) {
  recommendedEvents(filter: {lat: $lat, lon: $lon, radius: $radius}, first: $first) {
    edges {
      node {
        id
        title
        dateTime
        eventUrl
        description
        group { name }
      }
    }
  }
}
"""


def scrape() -> list[dict]:
    payload = {
        "query": QUERY,
        "variables": {"lat": 59.9139, "lon": 10.7522, "radius": 10, "first": 50},
    }
    res = requests.post(API_URL, json=payload, timeout=15, headers={"Content-Type": "application/json"})
    res.raise_for_status()
    data = res.json()

    events = []
    edges = data.get("data", {}).get("recommendedEvents", {}).get("edges", [])
    for edge in edges:
        node = edge.get("node", {})
        try:
            from dateutil import parser as dateparser
            parsed = dateparser.parse(node["dateTime"])
            title = node["title"]
            events.append({
                "id": f"meetup-{parsed.strftime('%Y-%m-%d')}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": parsed.strftime("%Y-%m-%d"),
                "time": parsed.strftime("%H:%M"),
                "category": "kultur",
                "source": "meetup",
                "url": node["eventUrl"],
                "description": (node.get("description") or "")[:200],
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} events from Meetup")
    for e in results[:3]:
        print(e)
```

- [ ] **Step 5: Create `scrapers/scrape_vink.py`**

```python
"""
Scraper for Aftenposten Vink restaurant recommendations.
Returns a list of event dicts matching the events.json schema.

Verify selectors by running: python scrape_vink.py
"""
import re
import requests
from bs4 import BeautifulSoup
from datetime import date

BASE_URL = "https://www.aftenposten.no"
VINK_URL = f"{BASE_URL}/vink/restauranter"


def scrape() -> list[dict]:
    res = requests.get(VINK_URL, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    events = []
    today = date.today().strftime("%Y-%m-%d")

    # Vink lists restaurants, not time-bound events — we add them as standing recommendations
    # Selector: inspect aftenposten.no/vink/restauranter and update to match restaurant cards
    for item in soup.select("article, .article-teaser, [class*='teaser']"):
        try:
            title_el = item.select_one("h2, h3, [class*='title']")
            link_el = item.select_one("a[href]")

            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            if not title:
                continue

            href = link_el["href"] if link_el else ""
            url = href if href.startswith("http") else BASE_URL + href

            events.append({
                "id": f"vink-{today}-{re.sub(r'[^a-z0-9]', '-', title.lower())[:30]}",
                "title": title,
                "date": today,
                "time": None,
                "category": "mat",
                "source": "vink",
                "url": url,
                "description": "Anbefalt av Aftenposten Vink",
            })
        except Exception:
            continue

    return events


if __name__ == "__main__":
    results = scrape()
    print(f"Found {len(results)} recommendations from Vink")
    for e in results[:3]:
        print(e)
```

- [ ] **Step 6: Verify each scraper returns results**

```bash
cd scrapers
pip install -r requirements.txt
python scrape_blaa.py
python scrape_rockefeller.py
python scrape_meetup.py
python scrape_vink.py
```
Expected: Each prints "Found N events from [source]". If N is 0, inspect the live site HTML and update the CSS selectors in that scraper.

- [ ] **Step 7: Commit**

```bash
cd ..
git add scrapers/
git commit -m "feat: add Python scrapers for Blå, Rockefeller, Meetup, Vink"
```

---

## Task 12: Aggregate script

**Files:**
- Create: `scrapers/aggregate.py`

- [ ] **Step 1: Create `scrapers/aggregate.py`**

```python
"""
Aggregates all scrapers into data/events.json and frontend/public/data/events.json.
Run: python scrapers/aggregate.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import scrape_blaa
import scrape_rockefeller
import scrape_meetup
import scrape_vink

SCRAPERS = [scrape_blaa, scrape_rockefeller, scrape_meetup, scrape_vink]

OUTPUT_PATHS = [
    Path(__file__).parent.parent / "data" / "events.json",
    Path(__file__).parent.parent / "frontend" / "public" / "data" / "events.json",
]


def aggregate() -> list[dict]:
    all_events = []
    seen_ids = set()

    for scraper in SCRAPERS:
        name = scraper.__name__
        try:
            events = scraper.scrape()
            for e in events:
                if e["id"] not in seen_ids:
                    seen_ids.add(e["id"])
                    all_events.append(e)
            print(f"  {name}: {len(events)} events")
        except Exception as exc:
            print(f"  {name}: ERROR — {exc}", file=sys.stderr)

    all_events.sort(key=lambda e: (e["date"], e.get("time") or ""))
    return all_events


if __name__ == "__main__":
    print("Aggregating events...")
    events = aggregate()
    print(f"Total: {len(events)} events")

    for path in OUTPUT_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(events, ensure_ascii=False, indent=2))
        print(f"Written to {path}")
```

- [ ] **Step 2: Run aggregate script**

```bash
python scrapers/aggregate.py
```
Expected: Prints event counts per source, writes `data/events.json` and `frontend/public/data/events.json`.

- [ ] **Step 3: Commit**

```bash
git add scrapers/aggregate.py data/events.json frontend/public/data/events.json
git commit -m "feat: add aggregate script and initial events.json"
```

---

## Task 13: GitHub Actions — scraping workflow

**Files:**
- Create: `.github/workflows/scrape.yml`

- [ ] **Step 1: Create `.github/workflows/scrape.yml`**

```yaml
name: Scrape events

on:
  schedule:
    - cron: '0 2 * * *'   # 02:00 UTC nightly
  workflow_dispatch:        # allow manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: scrapers/requirements.txt

      - name: Install dependencies
        run: pip install -r scrapers/requirements.txt

      - name: Run scrapers
        run: python scrapers/aggregate.py

      - name: Commit updated events.json
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/events.json frontend/public/data/events.json
          git diff --staged --quiet || git commit -m "chore: update events.json [skip ci]"
          git push
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "feat: add nightly scraping GitHub Actions workflow"
```

---

## Task 14: Azure Static Web Apps + deploy workflow

**Files:**
- Create: `staticwebapp.config.json`
- Create: `.github/workflows/deploy.yml`

> **Prerequisites:** Create an Azure Static Web App resource in the Azure Portal, linked to this GitHub repo. Azure will auto-generate a deployment token — copy it as a GitHub secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`.

- [ ] **Step 1: Create `staticwebapp.config.json` in repo root**

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/data/*", "/assets/*"]
  },
  "globalHeaders": {
    "Cache-Control": "no-cache"
  }
}
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install and build
        working-directory: frontend
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
        run: |
          npm ci
          npm run build

      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: upload
          app_location: frontend
          output_location: dist
          skip_app_build: true

  close_pull_request:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: close
```

- [ ] **Step 3: Add Firebase secrets to GitHub**

Go to GitHub repo → Settings → Secrets and variables → Actions, and add:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `AZURE_STATIC_WEB_APPS_API_TOKEN`

- [ ] **Step 4: Commit and push to trigger first deploy**

```bash
git add staticwebapp.config.json .github/workflows/deploy.yml
git commit -m "feat: add Azure Static Web Apps deploy workflow"
git push -u origin main
```
Expected: GitHub Actions deploy workflow runs and app appears at the Azure Static Web Apps URL.

---

## Task 15: Create GitHub repo and push

> Do this before Task 14 if the repo doesn't exist on GitHub yet.

- [ ] **Step 1: Create repo on GitHub**

```bash
gh repo create oslo-hva-skjer --public --description "Oslo event calendar for friends"
```

- [ ] **Step 2: Add remote and push**

```bash
git remote add origin https://github.com/<your-username>/oslo-hva-skjer.git
git push -u origin main
```

---

## Post-deploy checklist

- [ ] Verify app is live at the Azure Static Web Apps URL
- [ ] Test Google login works (add your domain to Firebase Auth → Authorized domains)
- [ ] Manually trigger `scrape.yml` workflow and verify `events.json` is updated
- [ ] Verify favourites are saved and synced across browser/device when logged in

---

## Task 16: useGroup hook

**Files:**
- Create: `frontend/src/hooks/useGroup.js`
- Create: `frontend/src/__tests__/useGroup.test.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(() => ({ id: 'group-abc' })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  onSnapshot: vi.fn((_, cb) => { cb({ docs: [] }); return () => {} }),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
  arrayUnion: vi.fn(v => v),
}))

import { useGroup } from '../hooks/useGroup'

describe('useGroup', () => {
  it('returns empty groups when uid is null', () => {
    const { result } = renderHook(() => useGroup(null))
    expect(result.current.groups).toEqual([])
  })

  it('createGroup calls setDoc and returns groupId', async () => {
    const { setDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useGroup('uid-1'))
    let groupId
    await act(async () => {
      groupId = await result.current.createGroup('Fredagsklubben')
    })
    expect(setDoc).toHaveBeenCalled()
    expect(groupId).toBeDefined()
  })

  it('joinGroup returns false when invite code not found', async () => {
    const { result } = renderHook(() => useGroup('uid-1'))
    let joined
    await act(async () => {
      joined = await result.current.joinGroup('BADCODE')
    })
    expect(joined).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/useGroup.test.js
```

- [ ] **Step 3: Create `frontend/src/hooks/useGroup.js`**

```js
import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, updateDoc, getDoc, getDocs,
  onSnapshot, query, where, serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { db } from '../firebase'

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function useGroup(uid) {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!uid) { setGroups([]); return }

    // Listen to all groups where user is a member
    const ref = collection(db, 'groups')
    const q = query(ref, where(`members.${uid}`, '!=', null))
    const unsubscribe = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [uid])

  async function createGroup(name) {
    if (!uid) return null
    const groupRef = doc(collection(db, 'groups'))
    const inviteCode = generateInviteCode()
    await setDoc(groupRef, {
      name,
      inviteCode,
      createdBy: uid,
      members: {
        [uid]: { joinedAt: serverTimestamp() },
      },
      createdAt: serverTimestamp(),
    })
    return groupRef.id
  }

  async function joinGroup(inviteCode) {
    if (!uid) return false
    const ref = collection(db, 'groups')
    const q = query(ref, where('inviteCode', '==', inviteCode.toUpperCase()))
    const snap = await getDocs(q)
    if (snap.empty) return false
    const groupDoc = snap.docs[0]
    await updateDoc(groupDoc.ref, {
      [`members.${uid}`]: { joinedAt: serverTimestamp() },
    })
    return groupDoc.id
  }

  return { groups, createGroup, joinGroup }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/useGroup.test.js
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add useGroup hook (create, join, list groups)"
```

---

## Task 17: useGroupPlan hook

**Files:**
- Create: `frontend/src/hooks/useGroupPlan.js`
- Create: `frontend/src/__tests__/useGroupPlan.test.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn((_, cb) => { cb({ docs: [] }); return () => {} }),
  serverTimestamp: vi.fn(() => 'ts'),
  arrayUnion: vi.fn(v => v),
  arrayRemove: vi.fn(v => v),
}))

import { useGroupPlan } from '../hooks/useGroupPlan'

describe('useGroupPlan', () => {
  it('returns empty plan when groupId is null', () => {
    const { result } = renderHook(() => useGroupPlan(null, 'uid-1'))
    expect(result.current.plan).toEqual([])
  })

  it('addToPlan calls setDoc', async () => {
    const { setDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useGroupPlan('group-1', 'uid-1'))
    await act(async () => {
      await result.current.addToPlan('event-42')
    })
    expect(setDoc).toHaveBeenCalled()
  })

  it('toggleVote calls updateDoc', async () => {
    const { updateDoc } = await import('firebase/firestore')
    const { result } = renderHook(() => useGroupPlan('group-1', 'uid-1'))
    await act(async () => {
      await result.current.toggleVote('event-42', false)
    })
    expect(updateDoc).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/useGroupPlan.test.js
```

- [ ] **Step 3: Create `frontend/src/hooks/useGroupPlan.js`**

```js
import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, deleteDoc, updateDoc,
  onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from '../firebase'

export function useGroupPlan(groupId, uid) {
  const [plan, setPlan] = useState([])

  useEffect(() => {
    if (!groupId) { setPlan([]); return }

    const ref = collection(db, 'groups', groupId, 'plan')
    const unsubscribe = onSnapshot(ref, snap => {
      setPlan(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [groupId])

  async function addToPlan(eventId) {
    if (!groupId || !uid) return
    const ref = doc(db, 'groups', groupId, 'plan', eventId)
    await setDoc(ref, {
      eventId,
      addedBy: uid,
      addedAt: serverTimestamp(),
      votes: [],
    })
  }

  async function removeFromPlan(eventId) {
    if (!groupId || !uid) return
    const ref = doc(db, 'groups', groupId, 'plan', eventId)
    await deleteDoc(ref)
  }

  async function toggleVote(eventId, hasVoted) {
    if (!groupId || !uid) return
    const ref = doc(db, 'groups', groupId, 'plan', eventId)
    await updateDoc(ref, {
      votes: hasVoted ? arrayRemove(uid) : arrayUnion(uid),
    })
  }

  return { plan, addToPlan, removeFromPlan, toggleVote }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/useGroupPlan.test.js
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add useGroupPlan hook (add, remove, vote on group plan events)"
```

---

## Task 18: GroupManager component

**Files:**
- Create: `frontend/src/components/GroupManager.jsx`
- Create: `frontend/src/__tests__/GroupManager.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GroupManager from '../components/GroupManager'

const mockUseGroup = {
  groups: [],
  createGroup: vi.fn().mockResolvedValue('new-group-id'),
  joinGroup: vi.fn().mockResolvedValue('existing-group-id'),
}

vi.mock('../hooks/useGroup', () => ({
  useGroup: () => mockUseGroup,
}))

describe('GroupManager', () => {
  it('renders create group form', () => {
    render(<GroupManager uid="uid-1" onSelectGroup={() => {}} />)
    expect(screen.getByPlaceholderText(/gruppenavn/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /opprett/i })).toBeInTheDocument()
  })

  it('renders join group form', () => {
    render(<GroupManager uid="uid-1" onSelectGroup={() => {}} />)
    expect(screen.getByPlaceholderText(/invitasjonskode/i)).toBeInTheDocument()
  })

  it('calls createGroup and onSelectGroup when form submitted', async () => {
    const onSelect = vi.fn()
    render(<GroupManager uid="uid-1" onSelectGroup={onSelect} />)
    fireEvent.change(screen.getByPlaceholderText(/gruppenavn/i), { target: { value: 'Fredagsklubben' } })
    fireEvent.click(screen.getByRole('button', { name: /opprett/i }))
    await waitFor(() => {
      expect(mockUseGroup.createGroup).toHaveBeenCalledWith('Fredagsklubben')
      expect(onSelect).toHaveBeenCalledWith('new-group-id')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/GroupManager.test.jsx
```

- [ ] **Step 3: Create `frontend/src/components/GroupManager.jsx`**

```jsx
import { useState } from 'react'
import { useGroup } from '../hooks/useGroup'

export default function GroupManager({ uid, onSelectGroup }) {
  const { groups, createGroup, joinGroup } = useGroup(uid)
  const [newName, setNewName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const id = await createGroup(newName.trim())
    if (id) { setNewName(''); onSelectGroup(id) }
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    const id = await joinGroup(inviteCode.trim())
    if (id) { setInviteCode(''); onSelectGroup(id) }
    else setError('Fant ingen gruppe med den koden.')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
      <h3 className="font-semibold text-gray-800">Grupper</h3>

      {groups.length > 0 && (
        <div className="flex flex-col gap-1">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => onSelectGroup(g.id)}
              className="text-left px-3 py-2 rounded hover:bg-gray-50 text-sm text-gray-700"
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Gruppenavn"
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
        >
          Opprett
        </button>
      </form>

      <form onSubmit={handleJoin} className="flex gap-2">
        <input
          value={inviteCode}
          onChange={e => { setInviteCode(e.target.value); setError(null) }}
          placeholder="Invitasjonskode"
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm uppercase"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
        >
          Bli med
        </button>
      </form>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/GroupManager.test.jsx
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add GroupManager component (create/join groups)"
```

---

## Task 19: GroupPlan component + integrate into App

**Files:**
- Create: `frontend/src/components/GroupPlan.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create `frontend/src/components/GroupPlan.jsx`**

```jsx
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
                  +1 {Array.isArray(p.votes) ? p.votes.length : 0}
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
```

- [ ] **Step 2: Add "Legg til i gruppeplan" button to EventCard**

Modify `frontend/src/components/EventCard.jsx` — add an optional `onAddToGroup` prop. When provided, show a small "+" button next to the favorite star:

```jsx
// In the header div, after the favorite button:
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
```

- [ ] **Step 3: Update `frontend/src/App.jsx` to integrate groups**

Add group state and wire GroupManager + GroupPlan into the calendar view:

```jsx
// Add these imports:
import { useState } from 'react' // already imported
import GroupManager from './components/GroupManager'
import GroupPlan from './components/GroupPlan'

// Add state:
const [activeGroupId, setActiveGroupId] = useState(null)
const [showGroupManager, setShowGroupManager] = useState(false)

// In the calendar view layout, add a third column or below EventList:
// Show GroupManager (toggle) and GroupPlan when a group is active
```

The exact integration: add a "Grupper" button in the view toggle row. When clicked, show GroupManager inline. When a group is selected (`activeGroupId` is set), show GroupPlan below EventList in the calendar view, passing `allEvents`, `selectedDate`, `activeGroupId`, and `user?.uid`.

Pass `onAddToGroup={activeGroupId ? (id) => addToPlan(id) : undefined}` to EventList → EventCard (requires threading `onAddToGroup` through EventList).

- [ ] **Step 4: Thread onAddToGroup through EventList**

Modify `frontend/src/components/EventList.jsx` — accept optional `onAddToGroup` prop and pass it to each EventCard.

- [ ] **Step 5: Run full test suite**

```bash
cd frontend && npm test 2>&1 | tail -10
```
Expected: All tests pass

- [ ] **Step 6: Run build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add GroupPlan component and integrate groups into App"
```

---

## Task 20: Invite link support

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/GroupManager.jsx`

- [ ] **Step 1: Read invite code from URL on mount**

In `App.jsx`, add a `useEffect` that reads `?join=CODE` from `window.location.search` on mount. If present and user is logged in, call `joinGroup(code)` automatically and redirect to the group.

```jsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const joinCode = params.get('join')
  if (joinCode && user) {
    joinGroup(joinCode).then(id => {
      if (id) {
        setActiveGroupId(id)
        // Remove the ?join= param from URL without reload
        window.history.replaceState({}, '', window.location.pathname)
      }
    })
  }
}, [user])
```

Note: `joinGroup` comes from a `useGroup` call at App level — move `useGroup` usage from GroupManager to App and pass `groups`, `createGroup`, `joinGroup` as props to GroupManager.

- [ ] **Step 2: Add "Kopier invitasjonslenke" in GroupManager**

When a group is selected (after create or join), show the invite link:

```jsx
const inviteLink = `${window.location.origin}?join=${group.inviteCode}`
// Show a button that copies this to clipboard:
<button onClick={() => navigator.clipboard.writeText(inviteLink)}>
  Kopier invitasjonslenke
</button>
```

- [ ] **Step 3: Run full test suite and build**

```bash
cd frontend && npm test 2>&1 | tail -10 && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: add invite link support for joining groups via URL"
```

---

## Updated post-deploy checklist

- [ ] Verify app is live at the Azure Static Web Apps URL
- [ ] Test Google login works (add your domain to Firebase Auth → Authorized domains)
- [ ] Manually trigger `scrape.yml` workflow and verify `events.json` is updated
- [ ] Test group creation and invite link flow end-to-end
- [ ] Test real-time group plan updates across two browser sessions
- [ ] Test voting (+1) on group plan events
