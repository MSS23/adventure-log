'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  useJournalEntry,
  useCreateJournalEntry,
  useUpdateJournalEntry,
} from '@/lib/hooks/useJournal'
import {
  ArrowLeft,
  Save,
  Eye,
  Edit3,
  MapPin,
  Tag,
  Image as ImageIcon,
  Link2,
  Globe,
  Lock,
  Users,
  Loader2,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

export default function JournalEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { user } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  const { data: existingEntry } = useJournalEntry(editId)
  const createEntry = useCreateJournalEntry()
  const updateEntry = useUpdateJournalEntry()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [locationName, setLocationName] = useState('')
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [countryCode, setCountryCode] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [albumId, setAlbumId] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [showPreview, setShowPreview] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hasLoadedExisting, setHasLoadedExisting] = useState(false)

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entryIdRef = useRef<string | null>(editId)

  // Load existing entry data
  useEffect(() => {
    if (existingEntry?.entry && !hasLoadedExisting) {
      const e = existingEntry.entry
      setTitle(e.title || '')
      setContent(e.content || '')
      setCoverImageUrl(e.cover_image_url || '')
      setLocationName(e.location_name || '')
      setLatitude(e.latitude ?? undefined)
      setLongitude(e.longitude ?? undefined)
      setCountryCode(e.country_code || '')
      setTagsInput(e.tags?.join(', ') || '')
      setAlbumId(e.album_id || '')
      setVisibility(e.visibility || 'public')
      setStatus(e.status === 'archived' ? 'draft' : (e.status || 'draft'))
      setHasLoadedExisting(true)
    }
  }, [existingEntry, hasLoadedExisting])

  const parseTags = useCallback((): string[] => {
    return tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
  }, [tagsInput])

  const buildPayload = useCallback(() => {
    return {
      title: title.trim(),
      content,
      cover_image_url: coverImageUrl || undefined,
      location_name: locationName || undefined,
      latitude,
      longitude,
      country_code: countryCode || undefined,
      album_id: albumId || undefined,
      tags: parseTags(),
      visibility,
      status,
    }
  }, [title, content, coverImageUrl, locationName, latitude, longitude, countryCode, albumId, parseTags, visibility, status])

  // Auto-save to draft every 30 seconds
  useEffect(() => {
    if (!title.trim() || !user) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving')
        const payload = buildPayload()

        if (entryIdRef.current) {
          await updateEntry.mutateAsync({
            id: entryIdRef.current,
            ...payload,
            status: 'draft',
          })
        } else {
          const result = await createEntry.mutateAsync({
            ...payload,
            status: 'draft',
          })
          if (result?.entry?.id) {
            entryIdRef.current = result.entry.id
          }
        }
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } catch {
        setAutoSaveStatus('idle')
      }
    }, 30000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [title, content, user, buildPayload, createEntry, updateEntry])

  const handleSave = async (saveStatus: 'draft' | 'published') => {
    if (!title.trim()) return

    const payload = buildPayload()

    try {
      if (entryIdRef.current) {
        await updateEntry.mutateAsync({
          id: entryIdRef.current,
          ...payload,
          status: saveStatus,
        })
      } else {
        const result = await createEntry.mutateAsync({
          ...payload,
          status: saveStatus,
        })
        if (result?.entry?.id) {
          entryIdRef.current = result.entry.id
        }
      }
      router.push('/journal')
    } catch {
      // Error is handled by the mutation
    }
  }

  const isSaving = createEntry.isPending || updateEntry.isPending

  const visibilityOptions = [
    { value: 'public' as const, label: 'Public', icon: Globe },
    { value: 'friends' as const, label: 'Friends', icon: Users },
    { value: 'private' as const, label: 'Private', icon: Lock },
  ]

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900">
      {/* Header */}
      <motion.div
        className="sticky top-0 z-10 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-xl border-b border-stone-200/50 dark:border-white/[0.08]/50"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/journal">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold text-stone-900 dark:text-white">
              {editId ? 'Edit Entry' : 'New Journal Entry'}
            </h1>
            {autoSaveStatus === 'saving' && (
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                'gap-1.5 rounded-xl text-sm',
                showPreview && 'bg-olive-50 dark:bg-olive-900/30 border-olive-200 dark:border-olive-700 text-olive-700 dark:text-olive-400'
              )}
            >
              {showPreview ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave('draft')}
              disabled={isSaving || !title.trim()}
              className="gap-1.5 rounded-xl text-sm"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave('published')}
              disabled={isSaving || !title.trim()}
              className="gap-1.5 rounded-xl text-sm bg-gradient-to-r from-olive-500 to-olive-500 hover:from-olive-600 hover:to-olive-600 text-white"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
              Publish
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          className="space-y-6"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Cover Image URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-olive-500" />
              Cover Image URL
            </label>
            <Input
              placeholder="https://example.com/cover-image.jpg"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="rounded-xl dark:bg-[#1A1A1A] dark:border-white/[0.1]"
            />
            {coverImageUrl && (
              <div className="relative h-48 rounded-xl overflow-hidden border border-stone-200 dark:border-white/[0.1]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <Input
              placeholder="Give your story a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-stone-300 dark:placeholder:text-stone-600 dark:bg-transparent dark:text-white"
            />
          </div>

          {/* Editor / Preview */}
          {showPreview ? (
            <div className="min-h-[400px] p-6 rounded-2xl bg-white dark:bg-[#111111] border border-stone-200 dark:border-white/[0.1]">
              <article className="prose prose-stone dark:prose-invert max-w-none">
                <ReactMarkdown>{content || '*Start writing your story...*'}</ReactMarkdown>
              </article>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-olive-500" />
                Content (Markdown supported)
              </label>
              <Textarea
                placeholder="Write your travel story here... Use **bold**, *italic*, # headings, - lists, and more markdown."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] rounded-xl font-mono text-sm dark:bg-[#1A1A1A] dark:border-white/[0.1] resize-y"
              />
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-olive-500" />
                Location
              </label>
              <Input
                placeholder="e.g. Paris, France"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="rounded-xl dark:bg-[#1A1A1A] dark:border-white/[0.1]"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={latitude ?? ''}
                  onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="rounded-xl text-sm dark:bg-[#1A1A1A] dark:border-white/[0.1]"
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={longitude ?? ''}
                  onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="rounded-xl text-sm dark:bg-[#1A1A1A] dark:border-white/[0.1]"
                />
                <Input
                  placeholder="Country code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                  className="rounded-xl text-sm dark:bg-[#1A1A1A] dark:border-white/[0.1]"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <Tag className="h-4 w-4 text-olive-500" />
                Tags (comma separated)
              </label>
              <Input
                placeholder="travel, adventure, food, culture"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="rounded-xl dark:bg-[#1A1A1A] dark:border-white/[0.1]"
              />
              {parseTags().length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parseTags().map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs bg-olive-50 text-olive-700 dark:bg-olive-900/30 dark:text-olive-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Album Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-olive-500" />
                Linked Album ID (optional)
              </label>
              <Input
                placeholder="Album UUID"
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="rounded-xl dark:bg-[#1A1A1A] dark:border-white/[0.1]"
              />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Visibility
              </label>
              <div className="flex gap-2">
                {visibilityOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setVisibility(value)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                      visibility === value
                        ? 'bg-olive-50 dark:bg-olive-900/30 text-olive-700 dark:text-olive-400 border-olive-200 dark:border-olive-700'
                        : 'bg-white dark:bg-[#1A1A1A] text-stone-600 dark:text-stone-400 border-stone-200 dark:border-white/[0.1] hover:border-stone-300 dark:hover:border-stone-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
