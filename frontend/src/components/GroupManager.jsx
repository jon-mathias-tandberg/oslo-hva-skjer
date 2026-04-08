import { useState } from 'react'

export default function GroupManager({ groups, createGroup, joinGroup, onSelectGroup, activeGroup }) {
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

      {activeGroup && (
        <div className="bg-gray-50 rounded p-3 flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium">Invitasjonslenke for {activeGroup.name}:</p>
          <div className="flex gap-2 items-center">
            <code className="text-xs text-gray-700 flex-1 truncate">
              {window.location.origin}?join={activeGroup.inviteCode}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}?join=${activeGroup.inviteCode}`)}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 shrink-0"
            >
              Kopier
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
