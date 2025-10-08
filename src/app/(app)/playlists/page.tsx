/**
 * Playlists Page
 * Browse and manage Globe Playlists
 */

'use client'

import { useState } from 'react'
import { usePlaylists } from '@/lib/hooks/usePlaylists'
import { PlaylistCard } from '@/components/playlists/PlaylistCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Music, Globe, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function PlaylistsPage() {
  const {
    playlists,
    loading,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    subscribeToPlaylist,
    unsubscribeFromPlaylist,
    discoverPlaylists
  } = usePlaylists()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [discoveredPlaylists, setDiscoveredPlaylists] = useState<any[]>([])

  // Form state
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [newPlaylistType, setNewPlaylistType] = useState<'curated' | 'travel_route' | 'theme'>('curated')
  const [newPlaylistCategory, setNewPlaylistCategory] = useState('')
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<'public' | 'private' | 'friends' | 'followers'>('public')

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) {
      toast.error('Please enter a playlist title')
      return
    }

    try {
      await createPlaylist({
        title: newPlaylistTitle,
        description: newPlaylistDescription,
        playlist_type: newPlaylistType,
        category: newPlaylistCategory,
        visibility: newPlaylistVisibility
      })

      toast.success('Playlist created successfully!')
      setIsCreateOpen(false)
      resetForm()
    } catch (error) {
      toast.error('Failed to create playlist')
      console.error(error)
    }
  }

  const resetForm = () => {
    setNewPlaylistTitle('')
    setNewPlaylistDescription('')
    setNewPlaylistType('curated')
    setNewPlaylistCategory('')
    setNewPlaylistVisibility('public')
  }

  const handleDelete = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return

    try {
      await deletePlaylist(playlistId)
      toast.success('Playlist deleted')
    } catch (error) {
      toast.error('Failed to delete playlist')
    }
  }

  const handleSubscribe = async (playlistId: string) => {
    try {
      await subscribeToPlaylist(playlistId)
      toast.success('Subscribed to playlist')
    } catch (error) {
      toast.error('Failed to subscribe')
    }
  }

  const handleUnsubscribe = async (playlistId: string) => {
    try {
      await unsubscribeFromPlaylist(playlistId)
      toast.success('Unsubscribed from playlist')
    } catch (error) {
      toast.error('Failed to unsubscribe')
    }
  }

  const handleDiscover = async () => {
    try {
      const discovered = await discoverPlaylists()
      setDiscoveredPlaylists(discovered)
    } catch (error) {
      toast.error('Failed to load playlists')
    }
  }

  const myPlaylists = playlists.filter(p => p.is_owner)
  const subscribedPlaylists = playlists.filter(p => p.is_subscribed && !p.is_owner)
  const collaboratingPlaylists = playlists.filter(p => p.is_collaborator && !p.is_owner)

  const filteredPlaylists = (list: typeof playlists) => {
    if (!searchQuery) return list
    return list.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Globe Playlists</h1>
        <p className="text-muted-foreground">
          Curate and discover amazing travel collections
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription>
                Curate a collection of your favourite places
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Best Coffee in Lisbon"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your playlist..."
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newPlaylistType} onValueChange={(v: any) => setNewPlaylistType(v)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curated">🎨 Curated</SelectItem>
                      <SelectItem value="travel_route">🗺️ Travel Route</SelectItem>
                      <SelectItem value="theme">🎭 Theme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={newPlaylistVisibility} onValueChange={(v: any) => setNewPlaylistVisibility(v)}>
                    <SelectTrigger id="visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">🌍 Public</SelectItem>
                      <SelectItem value="friends">👥 Friends</SelectItem>
                      <SelectItem value="private">🔒 Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <Input
                  id="category"
                  placeholder="e.g., food, nature, architecture"
                  value={newPlaylistCategory}
                  onChange={(e) => setNewPlaylistCategory(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlaylist}>
                Create Playlist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-playlists" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="my-playlists" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Mine ({myPlaylists.length})
          </TabsTrigger>
          <TabsTrigger value="subscribed" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Subscribed ({subscribedPlaylists.length})
          </TabsTrigger>
          <TabsTrigger value="collaborating" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collaborating ({collaboratingPlaylists.length})
          </TabsTrigger>
          <TabsTrigger 
            value="discover" 
            className="flex items-center gap-2"
            onClick={handleDiscover}
          >
            <Globe className="h-4 w-4" />
            Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-playlists" className="mt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : myPlaylists.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first playlist to start curating locations
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlaylists(myPlaylists).map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onDelete={handleDelete}
                  onSubscribe={handleSubscribe}
                  onUnsubscribe={handleUnsubscribe}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscribed" className="mt-6">
          {subscribedPlaylists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>No subscribed playlists yet</p>
              <p className="text-sm mt-2">Discover and subscribe to playlists from other travellers</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlaylists(subscribedPlaylists).map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onSubscribe={handleSubscribe}
                  onUnsubscribe={handleUnsubscribe}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collaborating" className="mt-6">
          {collaboratingPlaylists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4" />
              <p>Not collaborating on any playlists yet</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlaylists(collaboratingPlaylists).map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onSubscribe={handleSubscribe}
                  onUnsubscribe={handleUnsubscribe}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discover" className="mt-6">
          {discoveredPlaylists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4" />
              <p>Discover popular playlists from the community</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {discoveredPlaylists.map(playlist => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onSubscribe={handleSubscribe}
                  onUnsubscribe={handleUnsubscribe}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

