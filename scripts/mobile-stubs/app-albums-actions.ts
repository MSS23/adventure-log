/**
 * MOBILE STUB — replaces src/app/(app)/albums/actions.ts during MOBILE_BUILD.
 * See `scripts/mobile-stubs/achievements.ts` for the rationale.
 */

import type {
  Album,
  AlbumPhoto,
  CreateAlbumRequest,
  UpdateAlbumRequest,
  AddPhotosRequest,
  AlbumListResponse,
} from '@/types/database'

class MobileStubError extends Error {
  constructor(name: string) {
    super(
      `Server action "${name}" was called from a mobile (Capacitor) build. ` +
        `Server actions are not available in static export. Wire this through ` +
        `an /api/* route called via apiFetch() instead.`,
    )
    this.name = 'MobileStubError'
  }
}

export async function createAlbumWithPhotos(
  _albumInput: CreateAlbumRequest,
  _photosInput: Array<{
    storage_path: string
    width?: number
    height?: number
    taken_at?: string
  }>,
): Promise<{ success: boolean; album?: Album; error?: string }> {
  throw new MobileStubError('createAlbumWithPhotos')
}

export async function updateAlbum(
  _input: UpdateAlbumRequest,
): Promise<{ success: boolean; album?: Album; error?: string }> {
  throw new MobileStubError('updateAlbum')
}

export async function deleteAlbum(
  _albumId: string,
): Promise<{ success: boolean; error?: string }> {
  throw new MobileStubError('deleteAlbum')
}

export async function addPhotos(
  _input: AddPhotosRequest,
): Promise<{ success: boolean; photos?: AlbumPhoto[]; error?: string }> {
  throw new MobileStubError('addPhotos')
}

export async function getUploadUrls(
  _albumId: string,
  _fileNames: string[],
): Promise<{
  success: boolean
  urls?: { fileName: string; uploadUrl: string; storagePath: string }[]
  error?: string
}> {
  throw new MobileStubError('getUploadUrls')
}

export async function listVisibleAlbums(
  _cursor?: string,
  _limit: number = 20,
  _filterUserId?: string,
): Promise<{ success: boolean; data?: AlbumListResponse; error?: string }> {
  throw new MobileStubError('listVisibleAlbums')
}

export async function getAlbum(
  _albumId: string,
): Promise<{ success: boolean; album?: Album; error?: string }> {
  throw new MobileStubError('getAlbum')
}

export async function cleanupOrphanedAlbums(): Promise<{
  success: boolean
  deletedCount?: number
  error?: string
}> {
  throw new MobileStubError('cleanupOrphanedAlbums')
}

export async function getOrphanedAlbums(): Promise<{
  success: boolean
  orphanedAlbums?: Array<{ album_id: string; album_title: string; created_at: string }>
  error?: string
}> {
  throw new MobileStubError('getOrphanedAlbums')
}

export async function canDeletePhoto(
  _photoId: string,
): Promise<{ success: boolean; canDelete?: boolean; error?: string }> {
  throw new MobileStubError('canDeletePhoto')
}

export async function deletePhoto(
  _photoId: string,
): Promise<{
  success: boolean
  message?: string
  remainingPhotos?: number
  error?: string
}> {
  throw new MobileStubError('deletePhoto')
}
