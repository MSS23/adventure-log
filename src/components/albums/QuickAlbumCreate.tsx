'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Zap,
  Camera,
  Mountain,
  Plane,
  Utensils,
  Palmtree,
  Building,
  Heart,
  ArrowRight
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/toast-provider'
import { log } from '@/lib/utils/logger'

interface AlbumTemplate {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  defaultTitle: string
  defaultDescription: string
  suggestedTags: string[]
}

const templates: AlbumTemplate[] = [
  {
    id: 'weekend-trip',
    name: 'Weekend Getaway',
    icon: <Palmtree className="h-6 w-6" />,
    description: 'Quick escape from the daily routine',
    defaultTitle: 'Weekend in [Location]',
    defaultDescription: 'A refreshing weekend getaway filled with relaxation and adventure.',
    suggestedTags: ['weekend', 'short-trip', 'getaway']
  },
  {
    id: 'city-exploration',
    name: 'City Explorer',
    icon: <Building className="h-6 w-6" />,
    description: 'Urban adventures and city discoveries',
    defaultTitle: '[City] City Adventure',
    defaultDescription: 'Exploring the sights, sounds, and culture of the city.',
    suggestedTags: ['city', 'urban', 'exploration']
  },
  {
    id: 'nature-adventure',
    name: 'Nature Adventure',
    icon: <Mountain className="h-6 w-6" />,
    description: 'Hiking, camping, and outdoor activities',
    defaultTitle: 'Nature Adventure in [Location]',
    defaultDescription: 'Connecting with nature through hiking, camping, and outdoor exploration.',
    suggestedTags: ['nature', 'outdoors', 'hiking']
  },
  {
    id: 'international-trip',
    name: 'International Journey',
    icon: <Plane className="h-6 w-6" />,
    description: 'Cross-border travels and cultural experiences',
    defaultTitle: 'Journey to [Country]',
    defaultDescription: 'An international adventure discovering new cultures, cuisines, and landscapes.',
    suggestedTags: ['international', 'travel', 'culture']
  },
  {
    id: 'food-tour',
    name: 'Culinary Tour',
    icon: <Utensils className="h-6 w-6" />,
    description: 'Food-focused travel experiences',
    defaultTitle: 'Culinary Journey through [Location]',
    defaultDescription: 'A delicious exploration of local cuisine and dining experiences.',
    suggestedTags: ['food', 'culinary', 'restaurants']
  },
  {
    id: 'romantic-trip',
    name: 'Romantic Escape',
    icon: <Heart className="h-6 w-6" />,
    description: 'Couples travel and romantic destinations',
    defaultTitle: 'Romantic Getaway to [Location]',
    defaultDescription: 'A memorable romantic journey filled with special moments.',
    suggestedTags: ['romantic', 'couples', 'special']
  }
]

interface QuickAlbumCreateProps {
  trigger?: React.ReactNode
}

export function QuickAlbumCreate({ trigger }: QuickAlbumCreateProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'template' | 'details'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<AlbumTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const supabase = createClient()

  const handleSelectTemplate = (template: AlbumTemplate) => {
    setSelectedTemplate(template)
    setTitle(template.defaultTitle)
    setDescription(template.defaultDescription)
    setStep('details')
  }

  const handleCreateAlbum = async () => {
    if (!user || !selectedTemplate) return

    try {
      setCreating(true)

      // Replace placeholder with actual location
      const finalTitle = location
        ? title.replace('[Location]', location).replace('[City]', location).replace('[Country]', location)
        : title.replace(' in [Location]', '').replace(' to [City]', '').replace(' to [Country]', '')

      // Create album
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .insert({
          user_id: user.id,
          title: finalTitle,
          description,
          location_name: location || null,
          visibility: 'public',
          status: 'active'
        })
        .select()
        .single()

      if (albumError) throw albumError

      log.info('Quick album created', {
        component: 'QuickAlbumCreate',
        template: selectedTemplate.id,
        albumId: album.id
      })

      success('Album created!', 'Now add your photos to bring it to life')

      // Navigate to album page
      router.push(`/albums/${album.id}`)
      setOpen(false)
    } catch (err) {
      log.error('Failed to create album', {
        component: 'QuickAlbumCreate',
        template: selectedTemplate?.id
      }, err instanceof Error ? err : new Error(String(err)))
      showError('Creation failed', 'Could not create album. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const resetDialog = () => {
    setStep('template')
    setSelectedTemplate(null)
    setTitle('')
    setDescription('')
    setLocation('')
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetDialog()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Zap className="h-4 w-4" />
            Quick Create
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Album Creator
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Start with a template and customize it to your trip
          </p>
        </DialogHeader>

        {step === 'template' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 p-6 text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white group-hover:scale-110 transition-transform">
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Album Option */}
            <button
              onClick={() => {
                setSelectedTemplate({
                  id: 'custom',
                  name: 'Custom Album',
                  icon: <Camera className="h-6 w-6" />,
                  description: 'Create your own from scratch',
                  defaultTitle: 'My Adventure',
                  defaultDescription: '',
                  suggestedTags: []
                })
                setStep('details')
              }}
              className="w-full bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-100 transition-all duration-300 p-6 text-center"
            >
              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">Start from Scratch</p>
              <p className="text-sm text-gray-500 mt-1">Create a custom album</p>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('template')}
              className="mb-2"
            >
              ← Choose Different Template
            </Button>

            {/* Selected Template Badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                {selectedTemplate?.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedTemplate?.name}</p>
                <p className="text-sm text-gray-600">{selectedTemplate?.description}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (Optional)
                </label>
                <Input
                  placeholder="e.g., Paris, Tokyo, New York"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be used in your album title
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Album Title
                </label>
                <Input
                  placeholder="Give your album a name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <Textarea
                  placeholder="Describe your adventure..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('template')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateAlbum}
                disabled={!title.trim() || creating}
                className="flex-1 gap-2"
              >
                <Zap className="h-4 w-4" />
                {creating ? 'Creating...' : 'Create Album'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
