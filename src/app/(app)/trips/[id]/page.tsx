'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Loader2,
  Plus,
  ArrowLeft,
  Trash2,
  UserPlus,
  MapPin,
  Users,
  Link as LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { MEMBER_COLOR_PALETTE, type Trip, type TripMember, type TripPin } from '@/types/trips'
import { cn } from '@/lib/utils'

const TripMap = dynamic(() => import('@/components/trips/TripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-olive-50 dark:bg-white/[0.02] rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
    </div>
  ),
})

export default function TripDetailPage() {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const tripId = params?.id

  const [trip, setTrip] = useState<Trip | null>(null)
  const [members, setMembers] = useState<TripMember[]>([])
  const [pins, setPins] = useState<TripPin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null)

  // Add pin state
  const [pinInput, setPinInput] = useState('')
  const [pinNote, setPinNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Invite state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Filter state
  const [userFilter, setUserFilter] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tripId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/trips/${tripId}`)
      const data = await res.json()
      if (res.ok) {
        setTrip(data.trip)
        setMembers(data.members || [])
        setPins(data.pins || [])
      }
    } catch (error) {
      log.error('Trip load failed', { component: 'TripDetail', action: 'load', tripId }, error as Error)
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    if (user && tripId) load()
  }, [user, tripId, load])

  const colorByUser = useMemo(() => {
    const m = new Map<string, string>()
    for (const member of members) m.set(member.user_id, member.color)
    return m
  }, [members])

  const memberByUser = useMemo(() => {
    const m = new Map<string, TripMember>()
    for (const member of members) m.set(member.user_id, member)
    return m
  }, [members])

  const visiblePins = useMemo(() => {
    if (!userFilter) return pins
    return pins.filter((p) => p.user_id === userFilter)
  }, [pins, userFilter])

  const handleAddPin = async () => {
    if (!pinInput.trim() || !tripId) return
    setAddError(null)
    try {
      setAdding(true)
      const res = await fetch(`/api/trips/${tripId}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: pinInput.trim(), note: pinNote.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error || 'Could not add pin')
        return
      }
      setPins((prev) => [...prev, data.pin])
      setPinInput('')
      setPinNote('')
    } catch (error) {
      log.error('Pin add failed', { component: 'TripDetail', action: 'addPin', tripId }, error as Error)
      setAddError('Failed to add pin')
    } finally {
      setAdding(false)
    }
  }

  const handleDeletePin = async (pinId: string) => {
    if (!tripId) return
    try {
      const res = await fetch(`/api/trips/${tripId}/pins/${pinId}`, { method: 'DELETE' })
      if (res.ok) {
        setPins((prev) => prev.filter((p) => p.id !== pinId))
      }
    } catch (error) {
      log.error('Pin delete failed', { component: 'TripDetail', action: 'deletePin', tripId }, error as Error)
    }
  }

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !tripId) return
    setInviteError(null)
    try {
      setInviting(true)
      const res = await fetch(`/api/trips/${tripId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: inviteUsername.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Could not invite')
        return
      }
      setMembers((prev) => [...prev, data.member])
      setInviteUsername('')
      setInviteOpen(false)
    } catch (error) {
      log.error('Invite failed', { component: 'TripDetail', action: 'invite', tripId }, error as Error)
      setInviteError('Failed to invite')
    } finally {
      setInviting(false)
    }
  }

  const handleChangeColor = async (memberId: string, color: string) => {
    if (!tripId) return
    try {
      const res = await fetch(`/api/trips/${tripId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
      const data = await res.json()
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? data.member : m)))
      }
    } catch (error) {
      log.error('Color change failed', { component: 'TripDetail', action: 'changeColor', tripId }, error as Error)
    }
  }

  if (loading || !trip) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
      </div>
    )
  }

  const myMember = user ? memberByUser.get(user.id) : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/trips">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{trip.cover_emoji || '🗺️'}</span>
            <h1 className="text-2xl font-bold text-olive-950 dark:text-olive-50 truncate">
              {trip.title}
            </h1>
          </div>
          {trip.description && (
            <p className="text-sm text-olive-600 dark:text-olive-400 mt-1">{trip.description}</p>
          )}
        </div>
        <Button variant="outline" className="rounded-xl" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </div>

      {/* Member legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          variant={userFilter === null ? 'default' : 'outline'}
          size="sm"
          className="rounded-full h-8"
          onClick={() => setUserFilter(null)}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" />
          All ({pins.length})
        </Button>
        {members.map((member) => {
          const count = pins.filter((p) => p.user_id === member.user_id).length
          const isMe = user && member.user_id === user.id
          return (
            <Button
              key={member.id}
              variant={userFilter === member.user_id ? 'default' : 'outline'}
              size="sm"
              className="rounded-full h-8"
              onClick={() => setUserFilter(userFilter === member.user_id ? null : member.user_id)}
            >
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: member.color }}
              />
              {member.user?.display_name || member.user?.username || 'Unknown'}
              {isMe && <span className="ml-1 text-xs opacity-60">(you)</span>}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </Button>
          )
        })}

        {myMember && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-olive-600 dark:text-olive-400 mr-1">My color:</span>
            {MEMBER_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => handleChangeColor(myMember.id, color)}
                className={cn(
                  'w-5 h-5 rounded-full border-2 transition-transform',
                  myMember.color === color
                    ? 'border-olive-900 dark:border-white scale-110'
                    : 'border-transparent hover:scale-110'
                )}
                style={{ backgroundColor: color }}
                aria-label={`Use color ${color}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Map */}
        <div className="lg:col-span-3 h-[500px] lg:h-[620px]">
          <TripMap
            pins={visiblePins}
            members={members}
            selectedPinId={selectedPinId}
            onSelectPin={setSelectedPinId}
          />
        </div>

        {/* Sidebar: add pin + list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Add a place
            </h3>
            <Input
              placeholder="Paste Google Maps URL, place name, or lat,lng"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddPin()
                }
              }}
              className="mb-2"
            />
            <Input
              placeholder="Note (optional)"
              value={pinNote}
              onChange={(e) => setPinNote(e.target.value)}
              maxLength={1000}
              className="mb-2"
            />
            {addError && <p className="text-xs text-red-600 mb-2">{addError}</p>}
            <Button
              className="w-full bg-olive-700 hover:bg-olive-800 text-white"
              onClick={handleAddPin}
              disabled={adding || !pinInput.trim()}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add pin
            </Button>
            <p className="text-[11px] text-olive-500 mt-2">
              Try: <code className="bg-olive-50 dark:bg-white/5 px-1 rounded">Eiffel Tower, Paris</code> or a{' '}
              <code className="bg-olive-50 dark:bg-white/5 px-1 rounded">maps.google.com/...</code> link
            </p>
          </Card>

          <Card className="p-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {userFilter ? 'Filtered pins' : 'All pins'} ({visiblePins.length})
              </h3>
            </div>

            {visiblePins.length === 0 ? (
              <p className="text-sm text-olive-500 py-8 text-center">
                No pins yet. Paste a link above to get started.
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 -mx-1 px-1">
                {visiblePins.map((pin, idx) => {
                  const color = colorByUser.get(pin.user_id) || '#2563eb'
                  const member = memberByUser.get(pin.user_id)
                  const isSelected = pin.id === selectedPinId
                  const canDelete = user && (pin.user_id === user.id || trip.owner_id === user.id)
                  return (
                    <div
                      key={pin.id}
                      onClick={() => setSelectedPinId(pin.id)}
                      className={cn(
                        'flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-olive-100 dark:bg-white/10'
                          : 'hover:bg-olive-50 dark:hover:bg-white/5'
                      )}
                    >
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                        style={{ backgroundColor: color }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-olive-950 dark:text-olive-50 truncate">
                          {pin.name}
                        </div>
                        {pin.note && (
                          <div className="text-xs text-olive-600 dark:text-olive-400 mt-0.5 line-clamp-2">
                            {pin.note}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member?.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {(member?.user?.display_name || member?.user?.username || '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] text-olive-500">
                            {member?.user?.display_name || member?.user?.username || 'Unknown'}
                          </span>
                          {pin.source_url && (
                            <a
                              href={pin.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-blue-600 underline"
                            >
                              open
                            </a>
                          )}
                        </div>
                      </div>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePin(pin.id)
                          }}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100"
                          aria-label="Delete pin"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite someone to this trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Username</label>
              <Input
                placeholder="friend_username"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleInvite()
                  }
                }}
              />
              <p className="text-xs text-olive-500 mt-1">
                They&apos;ll get a color automatically. You can invite multiple people.
              </p>
            </div>
            {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
            <div className="pt-2">
              <h4 className="text-xs font-medium text-olive-600 mb-2">Current members</h4>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <Badge key={m.id} variant="outline" className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                    {m.user?.display_name || m.user?.username || 'Unknown'}
                    <span className="text-[10px] opacity-60">({m.role})</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-olive-700 hover:bg-olive-800 text-white"
              onClick={handleInvite}
              disabled={inviting || !inviteUsername.trim()}
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
