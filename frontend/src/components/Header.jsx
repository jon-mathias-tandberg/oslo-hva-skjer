import AuthButton from './AuthButton'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900">Oslo Hva Skjer?</h1>
      <AuthButton />
    </header>
  )
}
