const CATEGORIES = ['alle', 'konsert', 'kultur', 'humor', 'annet']

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
