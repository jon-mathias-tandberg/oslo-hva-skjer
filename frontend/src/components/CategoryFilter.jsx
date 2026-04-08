const CATEGORIES = ['alle', 'konsert', 'mat', 'kultur', 'humor', 'annet']

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
