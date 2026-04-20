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
  Share2,
  Sparkles,
  Check,
  BookOpen,
  Copy,
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

  // Share state
  const [shareOpen, setShareOpen] = useState(false)
  const [sharingBusy, setSharingBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  // Suggest route state
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [dayPlans, setDayPlans] = useState<Array<{ day: number; title: string; pins: TripPin[]; total_walking_km: number }>>([])

  // Save as album state
  const [savingAlbum, setSavingAlbum] = useState(false)

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

  const handleToggleShare = async (makePublic: boolean) => {
    if (!tripId) return
    try {
      setSharingBusy(true)
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: makePublic }),
      })
      const data = await res.json()
      if (res.ok) setTrip(data.trip)
    } catch (error) {
      log.error('Share toggle failed', { component: 'TripDetail', action: 'share', tripId }, error as Error)
    } finally {
      setSharingBusy(false)
    }
  }

  const handleCopyShareLink = async () => {
    if (!trip?.share_slug) return
    const url = `${window.location.origin}/t/${trip.share_slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSuggestRoute = async () => {
    if (!tripId) return
    try {
      setSuggesting(true)
      setSuggestOpen(true)
      const res = await fetch(`/api/trips/${tripId}/suggest-route`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setDayPlans(data.plans || [])
    } catch (error) {
      log.error('Suggest failed', { component: 'TripDetail', action: 'suggest', tripId }, error as Error)
    } finally {
      setSuggesting(false)
    }
  }

  const handleCheckIn = async (pinId: string, currentlyVisited: boolean) => {
    if (!tripId) return
    try {
      const res = await fetch(`/api/trips/${tripId}/pins/${pinId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ undo: currentlyVisited }),
      })
      const data = await res.json()
      if (res.ok) setPins((prev) => prev.map((p) => (p.id === pinId ? data.pin : p)))
    } catch (error) {
      log.error('Check-in failed', { component: 'TripDetail', action: 'checkin', tripId }, error as Error)
    }
  }

  const handleSaveAsAlbum = async () => {
    if (!tripId) return
    const confirmed = window.confirm(
      'Create a new album from this trip? The trip will be marked as completed.'
    )
    if (!confirmed) return
    try {
      setSavingAlbum(true)
      const res = await fetch(`/api/trips/${tripId}/save-as-album`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.album?.id) {
        window.location.href = `/albums/${data.album.id}`
      }
    } catch (error) {
      log.error('Save as album failed', { component: 'TripDetail', action: 'saveAsAlbum', tripId }, error as Error)
    } finally {
      setSavingAlbum(false)
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
        <div className="flex items-center gap-2">
          {trip.status === 'live' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={handleSuggestRoute}
            disabled={pins.length === 0}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Suggest route
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
          {user?.id === trip.owner_id && pins.some((p) => p.visited_at) && (
            <Button
              size="sm"
              className="rounded-xl bg-olive-700 hover:bg-olive-800 text-white"
              onClick={handleSaveAsAlbum}
              disabled={savingAlbum}
            >
              {savingAlbum ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4 mr-2" />
              )}
              Save as album
            </Button>
          )}
        </div>
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
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCheckIn(pin.id, Boolean(pin.visited_at))
                          }}
                          className={cn(
                            'p-1 rounded',
                            pin.visited_at
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10'
                          )}
                          aria-label={pin.visited_at ? 'Mark unvisited' : 'Check in'}
                          title={pin.visited_at ? 'Visited — click to undo' : 'Check in here'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePin(pin.id)
                            }}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                            aria-label="Delete pin"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share this trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-olive-50 dark:bg-white/5">
              <div>
                <p className="font-medium text-sm">Public link</p>
                <p className="text-xs text-olive-600 dark:text-olive-400">
                  Anyone with the link can view this trip (read-only).
                </p>
              </div>
              <Button
                size="sm"
                variant={trip.is_public ? 'outline' : 'default'}
                onClick={() => handleToggleShare(!trip.is_public)}
                disabled={sharingBusy}
                className={trip.is_public ? '' : 'bg-olive-700 hover:bg-olive-800 text-white'}
              >
                {sharingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : trip.is_public ? 'Unshare' : 'Enable'}
              </Button>
            </div>
            {trip.is_public && trip.share_slug && (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/t/${trip.share_slug}`}
                  className="font-mono text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleCopyShareLink}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggest route dialog */}
      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Suggested day-by-day plan</DialogTitle>
          </DialogHeader>
          {suggesting ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
            </div>
          ) : dayPlans.length === 0 ? (
            <p className="text-sm text-olive-500 py-6">
              Add a few pins first, then we&apos;ll cluster them into a walkable day-by-day plan.
            </p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {dayPlans.map((plan) => (
                <div key={plan.day} className="border border-stone-200 dark:border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-olive-950 dark:text-olive-50">
                      Day {plan.day}: {plan.title}
                    </h4>
                    <span className="text-xs text-olive-500">
                      ~{plan.total_walking_km} km walking
                    </span>
                  </div>
                  <ol className="space-y-1 pl-5 list-decimal text-sm text-olive-700 dark:text-olive-300">
                    {plan.pins.map((pin) => (
                      <li key={pin.id}>{pin.name}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuggestOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
