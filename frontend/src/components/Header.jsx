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
