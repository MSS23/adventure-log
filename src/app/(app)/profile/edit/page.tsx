'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Save, Check, X, Loader2, Camera, Lock } from 'lucide-react'
import Link from 'next/link'
import { ProfileFormData, profileSchema } from '@/lib/validations/auth'
import { log } from '@/lib/utils/logger'
import { uploadAvatar } from '@/lib/utils/storage'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getDisplayInitial } from '@/lib/utils/display-name'
import { cn } from '@/lib/utils'

export default function EditProfilePage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  // Private home location — never shown to anyone; geocoded on save and used
  // only to measure how far the user has travelled. Same data model as the
  // Settings "home base" (home_city/home_country/home_latitude/home_longitude),
  // so the two stay in sync.
  const [homeCity, setHomeCity] = useState('')
  const [homeCountry, setHomeCountry] = useState('')
  const avatarObjectUrlRef = useRef<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
  })

  useEffect(() => {
    if (profile) {
      setValue('username', profile.username || profile.name || '')
      setValue('display_name', profile.display_name || profile.name || '')
      setValue('bio', profile.bio || '')
      setValue('website', profile.website || '')
      setHomeCity(profile.home_city || '')
      setHomeCountry(profile.home_country || '')
      setAvatarPreview(getPhotoUrl(profile.avatar_url, 'avatars') || null)
    }
  }, [profile, setValue])

  const currentUsername = watch('username')

  useEffect(() => {
    let cancelled = false
    const name = currentUsername

    const checkUsername = async () => {
      // Unchanged or empty → nothing to check.
      if (!name || name === profile?.username) {
        if (!cancelled) setUsernameAvailable(null)
        return
      }

      // Only query once the field passes the same rules zod enforces on save,
      // so a green "Available" can never contradict the submit-time validator.
      // (Schema: letters/numbers/underscore only, 3–50 chars — no hyphens.)
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/
      if (errors.username || !usernameRegex.test(name)) {
        if (!cancelled) setUsernameAvailable(null)
        return
      }

      if (!cancelled) setCheckingUsername(true)
      try {
        // SECURITY DEFINER RPC: case-insensitive and unaffected by RLS, so it
        // can't show a false "available" for a handle held by a private account.
        const { data, error } = await supabase
          .rpc('is_username_available', { p_username: name })

        if (error) throw error
        if (!cancelled) setUsernameAvailable(data === true)
      } catch (err) {
        log.error('Error checking username', { component: 'EditProfile' }, err instanceof Error ? err : new Error(String(err)))
        if (!cancelled) setUsernameAvailable(null)
      } finally {
        if (!cancelled) setCheckingUsername(false)
      }
    }

    const timeoutId = setTimeout(checkUsername, 500)
    // Re-running the effect (or unmount) cancels the prior run, so only the
    // latest keystroke's response is allowed to set state.
    return () => { cancelled = true; clearTimeout(timeoutId) }
  }, [currentUsername, profile?.username, errors.username, supabase])

  // Revoke any blob URL we created when the component unmounts.
  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current)
    }
  }, [])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Release the previous preview blob before creating a new one.
      if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current)
      const objectUrl = URL.createObjectURL(file)
      avatarObjectUrlRef.current = objectUrl
      setAvatarFile(file)
      setAvatarPreview(objectUrl)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true)
      setError(null)

      // Re-check at submit time to close the gap between the debounced check and
      // save (someone else could have claimed it in between). If the RPC itself
      // can't be reached we don't block — the unique index (23505 below) is the
      // authoritative backstop.
      if (data.username !== profile?.username) {
        const { data: available, error: availError } = await supabase
          .rpc('is_username_available', { p_username: data.username })
        if (availError) {
          log.warn('Username availability re-check failed; relying on DB constraint', { component: 'EditProfile', action: 'precheck' })
        } else if (!available) {
          setError('This username is already taken.')
          setUsernameAvailable(false)
          setLoading(false)
          return
        }
      }

      let avatarUrl = profile?.avatar_url

      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile, user!.id)
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        } else {
          throw new Error('Failed to upload avatar')
        }
      }

      let websiteUrl = data.website ? data.website.trim() : null
      if (websiteUrl && !websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = `https://${websiteUrl}`
      }

      // Geocode the private home location → coordinates for distance stats.
      // Best-effort: if geocoding fails we still persist the city/country text
      // and keep any previously-resolved coordinates rather than blanking them.
      const trimmedCity = homeCity.trim()
      const trimmedCountry = homeCountry.trim()
      let homeLatitude: number | null = profile?.home_latitude ?? null
      let homeLongitude: number | null = profile?.home_longitude ?? null
      const homeChanged =
        trimmedCity !== (profile?.home_city || '') ||
        trimmedCountry !== (profile?.home_country || '')

      if (homeChanged) {
        homeLatitude = null
        homeLongitude = null
        if (trimmedCity || trimmedCountry) {
          try {
            const q = [trimmedCity, trimmedCountry].filter(Boolean).join(', ')
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
            )
            const geo = await response.json()
            if (geo?.[0]) {
              homeLatitude = parseFloat(geo[0].lat)
              homeLongitude = parseFloat(geo[0].lon)
            }
          } catch (geoErr) {
            log.warn('Home location geocode failed; saving without coordinates', {
              component: 'EditProfile',
              action: 'geocode-home',
            })
            void geoErr
          }
        }
      }

      const { error } = await supabase
        .from('users')
        .update({
          username: data.username || null,
          display_name: data.display_name || data.username || null,
          name: data.display_name || data.username || null,
          bio: data.bio || null,
          website: websiteUrl,
          // Public profile location is retired — the location here is private,
          // so clear any legacy public value.
          location: null,
          home_city: trimmedCity || null,
          home_country: trimmedCountry || null,
          home_latitude: homeLatitude,
          home_longitude: homeLongitude,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (error) {
        // 23505 = unique_violation: the case-insensitive username index (or the
        // legacy UNIQUE constraint) caught a collision the pre-check missed.
        if ((error as { code?: string }).code === '23505') {
          setError('This username is already taken.')
          setUsernameAvailable(false)
          setLoading(false)
          return
        }
        throw error
      }

      await refreshProfile()
      router.push('/profile')
    } catch (err) {
      log.error('Profile update failed', { component: 'EditProfile' }, err instanceof Error ? err : new Error(String(err)))
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
          <Link href="/setup" className="mt-3 inline-block">
            <Button>Complete Profile Setup</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 pt-2 sm:pt-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/profile" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to profile
        </Link>
        <p className="al-eyebrow mb-1">Your account</p>
        <h1 className="al-display text-3xl md:text-4xl">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div
            className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3"
            role="alert"
          >
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Avatar */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-background">
                <AvatarImage src={avatarPreview || undefined} alt="Profile picture" />
                <AvatarFallback className="bg-accent text-lg text-accent-foreground">
                  {getDisplayInitial(watch('display_name'), watch('username'))}
                </AvatarFallback>
              </Avatar>
              <Label
                htmlFor="avatar"
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-sm cursor-pointer transition-all duration-200 hover:bg-primary/90 active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                aria-label="Change profile photo"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Profile photo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Square image, at least 200&times;200px</p>
              <p className="text-xs text-muted-foreground mt-2">
                Looking for your cover photo?{' '}
                <Link href="/settings" className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                  Change it in Settings
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-foreground font-medium">
              Username <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="username"
                {...register('username')}
                className={cn(
                  "pr-9",
                  errors.username || (usernameAvailable === false && watch('username') !== profile?.username) ? 'border-destructive' : '',
                  usernameAvailable === true ? 'border-primary' : ''
                )}
              />
              <div className="absolute right-3 top-2.5">
                {checkingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!checkingUsername && usernameAvailable === true && <Check className="h-4 w-4 text-primary" />}
                {!checkingUsername && usernameAvailable === false && watch('username') !== profile?.username && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            {!errors.username && usernameAvailable === false && watch('username') !== profile?.username && (
              <p className="text-xs text-destructive">Username taken</p>
            )}
            {!errors.username && usernameAvailable === true && (
              <p className="text-xs text-primary">Available</p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="display_name" className="text-foreground font-medium">
              Display name <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="display_name"
              {...register('display_name')}
              placeholder="Your name"
              className={cn(errors.display_name ? 'border-destructive' : '')}
            />
            {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-foreground font-medium">
              Bio <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Tell others about yourself..."
              rows={3}
              maxLength={1000}
              className={cn("resize-none", errors.bio ? 'border-destructive' : '')}
            />
            {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="website" className="text-foreground font-medium">
              Website <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="website"
              {...register('website')}
              placeholder="your-site.com"
              className={cn(errors.website ? 'border-destructive' : '')}
            />
          </div>

          {/* Home location — private, distance stats only */}
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <Label className="text-foreground font-medium">
                Home location <span className="text-muted-foreground font-normal">(private)</span>
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="home-city" className="text-xs font-medium text-muted-foreground">City</Label>
                <Input
                  id="home-city"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  placeholder="London"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="home-country" className="text-xs font-medium text-muted-foreground">Country</Label>
                <Input
                  id="home-country"
                  value={homeCountry}
                  onChange={(e) => setHomeCountry(e.target.value)}
                  placeholder="United Kingdom"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Never shown to anyone. Used only to measure how far you&apos;ve travelled from home.
            </p>
          </div>
        </div>

        {/* Actions — one obvious primary action; the back link handles cancel */}
        <Button
          type="submit"
          disabled={loading || checkingUsername || (usernameAvailable === false && watch('username') !== profile?.username)}
          className="w-full cursor-pointer"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Save changes</>
          )}
        </Button>
      </form>
    </div>
  )
}
