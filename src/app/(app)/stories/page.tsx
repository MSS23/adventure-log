'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MapPin, Clock, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StoryTray } from '@/components/stories/StoryTray'
import { StoryViewer } from '@/components/stories/StoryViewer'
import { CreateStoryModal } from '@/components/stories/CreateStoryModal'
import { StoryFeedItem, StoryWithStats } from '@/types/database'
import { getStoryWithStats, guessStory } from '@/app/(app)/stories/actions'
import { toast } from 'sonner'

interface StoryStats {
  totalActiveStories: number
  totalGuesses: number
  userCorrectGuesses: number
  userTotalGuesses: number
}

export default function StoriesPage() {
  const [storyViewerStories, setStoryViewerStories] = useState<StoryWithStats[]>([])
  const [viewerStartIndex, setViewerStartIndex] = useState(0)
  const [showViewer, setShowViewer] = useState(false)
  const [stats, setStats] = useState<StoryStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Load page stats
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoadingStats(true)
    try {
      // This would be a combined API call in a real implementation
      // For now, we'll simulate with placeholder data
      setStats({
        totalActiveStories: 24,
        totalGuesses: 156,
        userCorrectGuesses: 8,
        userTotalGuesses: 12
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleStoryClick = async (stories: StoryFeedItem[], startIndex: number) => {
    try {
      // Convert feed items to full story data
      const storyPromises = stories.map(async (story) => {
        const result = await getStoryWithStats(story.id)
        if (result.success && result.story) {
          return result.story
        }
        // Fallback to basic story data
        return {
          ...story,
          album: undefined,
          stats: undefined,
          user_guess: undefined,
          is_expired: new Date(story.expires_at) <= new Date(),
          is_owner: story.is_owner,
          can_view: true,
          can_guess: !story.is_owner && new Date(story.expires_at) > new Date()
        } as StoryWithStats
      })

      const fullStories = await Promise.all(storyPromises)
      setStoryViewerStories(fullStories)
      setViewerStartIndex(startIndex)
      setShowViewer(true)
    } catch (error) {
      console.error('Failed to load story details:', error)
      toast.error('Failed to load stories')
    }
  }

  const handleStoryGuess = async (storyId: string, guessCode: string) => {
    try {
      const result = await guessStory({
        story_id: storyId,
        guess_code: guessCode
      })

      if (result.success) {
        // Update the story in the viewer to reflect the guess
        setStoryViewerStories(prev =>
          prev.map(story =>
            story.id === storyId
              ? { ...story, user_guess: result.guess, can_guess: false }
              : story
          )
        )
        toast.success('Guess submitted!')
      } else {
        toast.error(result.error || 'Failed to submit guess')
      }
    } catch (error) {
      console.error('Failed to submit guess:', error)
      toast.error('Failed to submit guess')
    }
  }

  const handleStoryCreated = () => {
    // Refresh the story tray when a new story is created
    loadStats()
  }

  const correctGuessPercentage = stats?.userTotalGuesses
    ? Math.round((stats.userCorrectGuesses / stats.userTotalGuesses) * 100)
    : 0

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Stories</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover amazing places from your friends&apos; travels and test your geography knowledge
          with 24-hour story guessing games.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '...' : stats?.totalActiveStories || 0}
                </p>
                <p className="text-sm text-muted-foreground">Active Stories</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '...' : stats?.totalGuesses || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Guesses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '...' : `${correctGuessPercentage}%`}
                </p>
                <p className="text-sm text-muted-foreground">Correct Guesses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? '...' : `${stats?.userTotalGuesses || 0}`}
                </p>
                <p className="text-sm text-muted-foreground">Your Guesses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Story Tray */}
      <Card>
        <CardContent className="p-6">
          <StoryTray
            onStoryClick={handleStoryClick}
            showCreateButton={true}
          />
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            How Stories Work
          </CardTitle>
          <CardDescription>
            Learn about our 24-hour story guessing game
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="font-medium">Create Stories</h3>
              <p className="text-sm text-muted-foreground">
                Share photos from your albums as 24-hour stories with location guessing games
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="font-medium">Guess Locations</h3>
              <p className="text-sm text-muted-foreground">
                View friends&apos; stories and guess which country they&apos;re visiting
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="font-medium">See Results</h3>
              <p className="text-sm text-muted-foreground">
                After 24 hours or when expired, see the correct answer and guess statistics
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary">24-hour expiry</Badge>
              <Badge variant="secondary">One guess per story</Badge>
              <Badge variant="secondary">Privacy controlled</Badge>
              <Badge variant="secondary">Country guessing</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">Ready to Share Your Adventures?</h3>
          <p className="text-muted-foreground mb-4">
            Create albums with countries and cover photos to start sharing stories
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CreateStoryModal onStoryCreated={handleStoryCreated}>
              <Button>Create Story</Button>
            </CreateStoryModal>
            <Button variant="outline" asChild>
              <Link href="/albums/new">Create Album</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Story Viewer */}
      <AnimatePresence>
        {showViewer && (
          <StoryViewer
            stories={storyViewerStories}
            initialIndex={viewerStartIndex}
            onClose={() => setShowViewer(false)}
            onStoryGuess={handleStoryGuess}
          />
        )}
      </AnimatePresence>
    </div>
  )
}