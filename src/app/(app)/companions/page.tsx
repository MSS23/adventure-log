'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserCircle,
  Bell,
  Search,
  Compass,
  Check,
  X,
  Clock,
  Loader2,
  Send,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GlassCard } from '@/components/ui/glass-card'
import { MeshGradient } from '@/components/ui/animated-gradient'
import CompanionCard from '@/components/companions/CompanionCard'
import TravelProfileForm from '@/components/companions/TravelProfileForm'
import {
  useCompanionMatches,
  useCompanionRequests,
  useTravelProfile,
  useSendCompanionRequest,
  useRespondToRequest,
  useUpdateTravelProfile,
} from '@/lib/hooks/useCompanions'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import Link from 'next/link'

export default function CompanionsPage() {
  const { user, profile, authLoading, profileLoading } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())

  const { data: travelProfile, isLoading: profileLoadingData } = useTravelProfile()
  const { data: matches, isLoading: matchesLoading } = useCompanionMatches()
  const { data: requests, isLoading: requestsLoading } = useCompanionRequests()
  const sendRequest = useSendCompanionRequest()
  const respondToRequest = useRespondToRequest()
  const updateProfile = useUpdateTravelProfile()

  const isAuthLoading = authLoading || profileLoading

  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-amber-950/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-stone-400" />
          </div>
          <p className="text-stone-600 dark:text-stone-400 mb-4">Please log in to find travel companions</p>
          <Link href="/login">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">Log In</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-amber-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-amber-950/30 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-12 w-12 rounded-full border-4 border-amber-200 dark:border-amber-800 border-t-amber-600 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-stone-600 dark:text-stone-400 font-medium">Loading...</p>
        </motion.div>
      </div>
    )
  }

  const handleConnect = (userId: string, message?: string) => {
    sendRequest.mutate(
      { receiver_id: userId, message },
      {
        onSuccess: () => {
          setSentRequests((prev) => new Set(prev).add(userId))
        },
      }
    )
  }

  const handleRespond = (requestId: string, status: 'accepted' | 'declined') => {
    respondToRequest.mutate({ request_id: requestId, status })
  }

  const pendingIncoming = requests?.incoming?.filter((r) => r.status === 'pending') || []
  const pendingOutgoing = requests?.outgoing?.filter((r) => r.status === 'pending') || []
  const acceptedRequests = [
    ...(requests?.incoming?.filter((r) => r.status === 'accepted') || []),
    ...(requests?.outgoing?.filter((r) => r.status === 'accepted') || []),
  ]

  return (
    <MeshGradient variant="subtle" className="min-h-screen dark:!bg-stone-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white flex items-center gap-3">
            <Compass className="h-8 w-8 text-amber-500" />
            Travel Companions
          </h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Find like-minded travelers to explore the world with.
          </p>
        </motion.div>

        <Tabs defaultValue="find" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 h-11 bg-white/80 dark:bg-stone-800/80 backdrop-blur-md border border-stone-200 dark:border-stone-700 rounded-xl p-1">
            <TabsTrigger
              value="find"
              className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md text-sm font-medium"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Find Companions
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md text-sm font-medium"
            >
              <UserCircle className="h-4 w-4 mr-1.5" />
              My Profile
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md text-sm font-medium relative"
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Requests
              {pendingIncoming.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {pendingIncoming.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Find Companions Tab */}
          <TabsContent value="find">
            {!travelProfile && !profileLoadingData ? (
              <GlassCard variant="featured" className="text-center py-12 dark:bg-amber-900/20 dark:border-amber-800/50">
                <Compass className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
                  Create Your Travel Profile First
                </h2>
                <p className="text-stone-600 dark:text-stone-400 mb-6 max-w-md mx-auto">
                  Set up your travel preferences so we can match you with compatible travelers.
                </p>
                <Tabs defaultValue="profile">
                  <TabsTrigger value="profile" asChild>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Set Up Profile
                    </Button>
                  </TabsTrigger>
                </Tabs>
              </GlassCard>
            ) : matchesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 p-6 animate-pulse"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-stone-200 dark:bg-stone-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-stone-200 dark:bg-stone-700 rounded w-32" />
                        <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-24" />
                        <div className="flex gap-2 mt-3">
                          <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded-full w-16" />
                          <div className="h-6 bg-stone-200 dark:bg-stone-700 rounded-full w-20" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : matches && matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {matches.map((match, index) => (
                  <CompanionCard
                    key={match.id || match.user_id}
                    match={match}
                    index={index}
                    onConnect={handleConnect}
                    isConnecting={sendRequest.isPending}
                    isConnected={sentRequests.has(match.user_id)}
                  />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12 dark:bg-stone-800/80 dark:border-stone-700/50">
                <Users className="h-16 w-16 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-2">
                  No Matches Yet
                </h2>
                <p className="text-stone-600 dark:text-stone-400 max-w-md mx-auto">
                  Update your travel profile with more details to find compatible travel companions.
                </p>
              </GlassCard>
            )}
          </TabsContent>

          {/* My Profile Tab */}
          <TabsContent value="profile">
            <TravelProfileForm
              profile={travelProfile || null}
              onSave={(data) => updateProfile.mutate(data)}
              isSaving={updateProfile.isPending}
            />
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-8">
            {/* Incoming Requests */}
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Incoming Requests
                {pendingIncoming.length > 0 && (
                  <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
                    ({pendingIncoming.length} pending)
                  </span>
                )}
              </h2>

              {requestsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 p-4 animate-pulse"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-32" />
                          <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-48" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingIncoming.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {pendingIncoming.map((req, index) => {
                      const sender = req.sender
                      const senderName =
                        sender?.display_name || sender?.name || sender?.username || 'Unknown'
                      const initials = senderName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)

                      return (
                        <motion.div
                          key={req.id}
                          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <GlassCard className="dark:bg-stone-800/80 dark:border-stone-700/50">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={sender?.avatar_url || undefined}
                                  alt={senderName}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-stone-900 dark:text-white">
                                  {senderName}
                                </h3>
                                {req.message && (
                                  <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                                    &quot;{req.message}&quot;
                                  </p>
                                )}
                                {req.destination && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                    <Compass className="h-3 w-3" />
                                    Wants to visit: {req.destination}
                                  </p>
                                )}
                                <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(req.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleRespond(req.id, 'accepted')}
                                  disabled={respondToRequest.isPending}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRespond(req.id, 'declined')}
                                  disabled={respondToRequest.isPending}
                                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </GlassCard>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <GlassCard className="text-center py-8 dark:bg-stone-800/80 dark:border-stone-700/50">
                  <Bell className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                  <p className="text-stone-500 dark:text-stone-400">No incoming requests</p>
                </GlassCard>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                <Send className="h-5 w-5 text-orange-500" />
                Sent Requests
                {pendingOutgoing.length > 0 && (
                  <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
                    ({pendingOutgoing.length} pending)
                  </span>
                )}
              </h2>

              {pendingOutgoing.length > 0 ? (
                <div className="space-y-4">
                  {pendingOutgoing.map((req, index) => {
                    const receiver = req.receiver
                    const receiverName =
                      receiver?.display_name || receiver?.name || receiver?.username || 'Unknown'
                    const initials = receiverName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <motion.div
                        key={req.id}
                        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <GlassCard className="dark:bg-stone-800/80 dark:border-stone-700/50">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={receiver?.avatar_url || undefined}
                                alt={receiverName}
                              />
                              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-blue-500 text-white font-bold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-stone-900 dark:text-white">
                                {receiverName}
                              </h3>
                              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Sent {new Date(req.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-xs font-medium">
                              Pending
                            </span>
                          </div>
                        </GlassCard>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <GlassCard className="text-center py-8 dark:bg-stone-800/80 dark:border-stone-700/50">
                  <Send className="h-10 w-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                  <p className="text-stone-500 dark:text-stone-400">No sent requests</p>
                </GlassCard>
              )}
            </div>

            {/* Accepted Connections */}
            {acceptedRequests.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" />
                  Accepted Connections
                </h2>
                <div className="space-y-4">
                  {acceptedRequests.map((req) => {
                    const otherUser =
                      req.sender_id === user?.id ? req.receiver : req.sender
                    const otherName =
                      otherUser?.display_name ||
                      otherUser?.name ||
                      otherUser?.username ||
                      'Unknown'
                    const initials = otherName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <GlassCard
                        key={req.id}
                        variant="featured"
                        className="dark:bg-emerald-900/20 dark:border-emerald-800/50"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={otherUser?.avatar_url || undefined}
                              alt={otherName}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-amber-500 text-white font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-stone-900 dark:text-white">
                              {otherName}
                            </h3>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Connected
                            </p>
                          </div>
                          <Link href={`/profile/${otherUser?.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                            >
                              View Profile
                            </Button>
                          </Link>
                        </div>
                      </GlassCard>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </MeshGradient>
  )
}
