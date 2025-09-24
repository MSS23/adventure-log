'use client'

import { LocationWishlist } from '@/components/wishlist/LocationWishlist'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Star, Camera, MapPin, TrendingUp, Plane, Plus } from 'lucide-react'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { CompactFavoriteButton } from '@/components/ui/favorite-button'
import Link from 'next/link'
import Image from 'next/image'

export default function WishlistPage() {
  const {
    favorites,
    loading,
    getFavoritesCount
  } = useFavorites()

  const recentFavorites = favorites.slice(0, 6)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-600" />
            Favorites & Wishlist
          </h1>
          <p className="text-gray-800 mt-2">
            Your favorite memories and future dream destinations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/albums/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Adventure
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {getFavoritesCount()}
              </div>
              <div className="text-sm text-gray-800 mt-1 flex items-center justify-center gap-1">
                <Heart className="h-3 w-3" />
                Total Favorites
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {getFavoritesCount('photo')}
              </div>
              <div className="text-sm text-gray-800 mt-1 flex items-center justify-center gap-1">
                <Camera className="h-3 w-3" />
                Photos
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {getFavoritesCount('album')}
              </div>
              <div className="text-sm text-gray-800 mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                Albums
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {getFavoritesCount('location')}
              </div>
              <div className="text-sm text-gray-800 mt-1 flex items-center justify-center gap-1">
                <Star className="h-3 w-3" />
                Wishlist
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentFavorites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Recent Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentFavorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  {favorite.metadata?.photo_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={favorite.metadata.photo_url}
                        alt={favorite.metadata.title || 'Favorite'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-sm">
                        {favorite.target_type}
                      </Badge>
                      <div className="text-sm text-gray-800">
                        {new Date(favorite.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <h4 className="font-medium text-sm truncate">
                      {favorite.metadata?.title || `${favorite.target_type} ${favorite.target_id.slice(0, 8)}`}
                    </h4>
                    {favorite.metadata?.description && (
                      <p className="text-sm text-gray-800 line-clamp-1 mt-1">
                        {favorite.metadata.description}
                      </p>
                    )}
                  </div>

                  <CompactFavoriteButton
                    targetId={favorite.target_id}
                    targetType={favorite.target_type}
                    className="opacity-70 hover:opacity-100"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <Link href="/favorites">
                <Button variant="outline" size="sm">
                  View All Favorites
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="wishlist" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-96">
          <TabsTrigger value="wishlist" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Travel Wishlist
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            All Favorites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wishlist" className="space-y-6">
          <LocationWishlist />
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          {/* Quick navigation to detailed favorites page */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Link href="/favorites?tab=photos" className="block">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Photo Favorites</h3>
                    <p className="text-gray-800 text-sm mb-4">
                      Your most beloved travel photos
                    </p>
                    <Badge variant="secondary">
                      {getFavoritesCount('photo')} photos
                    </Badge>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Link href="/favorites?tab=albums" className="block">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Album Favorites</h3>
                    <p className="text-gray-800 text-sm mb-4">
                      Your favorite travel albums
                    </p>
                    <Badge variant="secondary">
                      {getFavoritesCount('album')} albums
                    </Badge>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <Link href="/favorites?tab=locations" className="block">
                  <div className="text-center">
                    <Plane className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Location Favorites</h3>
                    <p className="text-gray-800 text-sm mb-4">
                      Places you want to visit again
                    </p>
                    <Badge variant="secondary">
                      {getFavoritesCount('location')} locations
                    </Badge>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Empty state for favorites */}
          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Loading favorites...</h3>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && favorites.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No favorites yet
                  </h3>
                  <p className="text-gray-800 mb-6">
                    Start exploring and add photos, albums, or locations to your favorites!
                  </p>
                  <Link href="/dashboard">
                    <Button>
                      Explore Adventures
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}