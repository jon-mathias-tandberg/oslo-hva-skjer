import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, parseISO, addMonths, subMonths
} from 'date-fns'
import { nb } from 'date-fns/locale'

export default function Calendar({ events, selectedDate, onSelectDate, groupPlanDates = new Set() }) {
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
          const hasGroupPlan = groupPlanDates.has(dateStr)

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
              {hasGroupPlan && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-green-600 mt-0.5" />
              )}
              {hasEvents && !hasGroupPlan && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-red-600 mt-0.5" />
              )}
              {(hasEvents || hasGroupPlan) && isSelected && (
                <span className="w-1 h-1 rounded-full bg-white mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
