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
