'use client'

import { useState, useEffect } from 'react'
import { Plus, Image as ImageIcon, Clock, Globe, X, Check } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Album } from '@/types/database'
import { countryCodeToFlag, formatCountryCodeDisplay } from '@/lib/countries'
import { createStory } from '@/app/(app)/stories/actions'
import { listVisibleAlbums } from '@/app/(app)/albums/actions'
import { toast } from 'sonner'

interface CreateStoryModalProps {
  children?: React.ReactNode
  onStoryCreated?: (storyId: string) => void
  className?: string
}

interface AlbumWithStoryEligibility extends Album {
  can_create_story: boolean
  story_preview_url?: string
}

export function CreateStoryModal({ children, onStoryCreated, className }: CreateStoryModalProps) {
  const [open, setOpen] = useState(false)
  const [albums, setAlbums] = useState<AlbumWithStoryEligibility[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithStoryEligibility | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // Load user's albums when modal opens
  useEffect(() => {
    if (open) {
      loadUserAlbums()
    }
  }, [open])

  const loadUserAlbums = async () => {
    setIsLoading(true)
    try {
      const result = await listVisibleAlbums(undefined, 50)
      if (result.success && result.data) {
        // Filter albums that can be used for stories (have country code and cover image)
        const eligibleAlbums = result.data.albums.map(album => ({
          ...album,
          can_create_story: !!(album.country_code && album.cover_image_url),
          story_preview_url: album.cover_image_url
        }))
        setAlbums(eligibleAlbums)
      } else {
        toast.error('Failed to load albums')
      }
    } catch (error) {
      console.error('Failed to load albums:', error)
      toast.error('Failed to load albums')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAlbumSelect = (album: AlbumWithStoryEligibility) => {
    if (!album.can_create_story) return

    setSelectedAlbum(album)
    setPreviewImageUrl(album.cover_image_url || null)
  }

  const handleCreateStory = async () => {
    if (!selectedAlbum) return

    setIsCreating(true)
    try {
      const result = await createStory({
        album_id: selectedAlbum.id,
        image_url: previewImageUrl || undefined
      })

      if (result.success && result.story) {
        toast.success('Story created successfully! It will be visible for 24 hours.')
        setOpen(false)
        setSelectedAlbum(null)
        setPreviewImageUrl(null)
        onStoryCreated?.(result.story.id)
      } else {
        toast.error(result.error || 'Failed to create story')
      }
    } catch (error) {
      console.error('Failed to create story:', error)
      toast.error('Failed to create story')
    } finally {
      setIsCreating(false)
    }
  }


  const eligibleAlbums = albums.filter(album => album.can_create_story)
  const ineligibleAlbums = albums.filter(album => !album.can_create_story)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className={className}>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Story
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Create a Story
          </DialogTitle>
          <DialogDescription>
            Share a 24-hour story with a country guessing game from one of your albums
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Album Selection */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="font-medium mb-3">Select an Album</h3>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-3">
                        <Skeleton className="aspect-square w-full mb-3" />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Eligible Albums */}
                  {eligibleAlbums.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Ready for Stories ({eligibleAlbums.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {eligibleAlbums.map((album) => (
                          <motion.div
                            key={album.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Card
                              className={`cursor-pointer transition-all ${
                                selectedAlbum?.id === album.id
                                  ? 'ring-2 ring-primary border-primary'
                                  : 'hover:border-primary/50'
                              }`}
                              onClick={() => handleAlbumSelect(album)}
                            >
                              <CardContent className="p-3">
                                <div className="aspect-square relative mb-3 rounded-lg overflow-hidden bg-muted">
                                  {album.cover_image_url ? (
                                    <Image
                                      src={album.cover_image_url}
                                      alt={album.title}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 50vw, 25vw"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                  )}
                                  {selectedAlbum?.id === album.id && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                      <Check className="w-6 h-6 text-primary" />
                                    </div>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm mb-1 line-clamp-1">
                                  {album.title}
                                </h4>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                  <Globe className="w-3 h-3" />
                                  <span>{countryCodeToFlag(album.country_code!)}</span>
                                  <span>{formatCountryCodeDisplay(album.country_code!).split(' ')[1]}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <ImageIcon className="w-3 h-3" />
                                  <span>{album.photos?.length || 0} photos</span>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ineligible Albums */}
                  {ineligibleAlbums.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        Need Country & Cover Image ({ineligibleAlbums.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {ineligibleAlbums.map((album) => (
                          <Card key={album.id} className="opacity-60">
                            <CardContent className="p-3">
                              <div className="aspect-square relative mb-3 rounded-lg overflow-hidden bg-muted">
                                {album.cover_image_url ? (
                                  <Image
                                    src={album.cover_image_url}
                                    alt={album.title}
                                    fill
                                    className="object-cover grayscale"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <h4 className="font-medium text-sm mb-1 line-clamp-1">
                                {album.title}
                              </h4>
                              <div className="text-xs text-muted-foreground">
                                {!album.country_code && 'Missing country'}
                                {!album.country_code && !album.cover_image_url && ' & '}
                                {!album.cover_image_url && 'Missing cover image'}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {albums.length === 0 && !isLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm mb-2">No albums found</p>
                      <p className="text-xs">Create an album with photos and a country to make stories</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Story Preview */}
          <div className="w-80 flex flex-col">
            <h3 className="font-medium mb-3">Story Preview</h3>

            {selectedAlbum ? (
              <div className="flex-1 flex flex-col">
                {/* Story Preview Frame */}
                <div className="bg-black rounded-lg p-4 mb-4 flex-1 flex items-center justify-center">
                  <div className="w-48 aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden relative">
                    {previewImageUrl ? (
                      <Image
                        src={previewImageUrl}
                        alt="Story preview"
                        fill
                        className="object-cover"
                        sizes="192px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-500" />
                      </div>
                    )}

                    {/* Story UI Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-between p-3 text-white text-xs">
                      {/* Top bar */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-white/20 rounded-full" />
                        <span className="flex-1 opacity-80">Your Story</span>
                      </div>

                      {/* Bottom overlay */}
                      <div className="bg-black/50 rounded p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span>{countryCodeToFlag(selectedAlbum.country_code!)}</span>
                        </div>
                        <p className="text-xs opacity-80">Guess which country I&apos;m in!</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Album Info */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{selectedAlbum.title}</h4>
                    {selectedAlbum.caption && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {selectedAlbum.caption}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        {formatCountryCodeDisplay(selectedAlbum.country_code!)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        24h expiry
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Create Button */}
                <Button
                  onClick={handleCreateStory}
                  disabled={isCreating}
                  size="lg"
                  className="w-full"
                >
                  {isCreating ? 'Creating Story...' : 'Create Story'}
                </Button>

                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Your story will be visible to friends for 24 hours
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select an album to preview your story</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}