'use client'

import { useState } from 'react'
import { approveUser, rejectUser } from './actions'

export function UserActions({
  userId,
  status,
}: {
  userId: string
  status: 'PENDING'
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setLoading('approve')
    setError(null)
    const res = await approveUser(userId)
    setLoading(null)
    if (res?.error) setError(res.error)
  }

  async function handleReject() {
    if (!confirm('¿Rechazar a este usuario?')) return
    setLoading('reject')
    setError(null)
    const res = await rejectUser(userId)
    setLoading(null)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span className="text-xs text-red-600 mr-1">{error}</span>
      )}
      <button
        type="button"
        onClick={handleApprove}
        disabled={!!loading}
        className="px-3 py-1.5 text-sm bg-ifedel-primary text-white rounded hover:opacity-90 disabled:opacity-50 font-medium"
      >
        {loading === 'approve' ? '...' : 'Aprobar'}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={!!loading}
        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
      >
        {loading === 'reject' ? '...' : 'Rechazar'}
      </button>
    </div>
  )
}
