/**
 * MOBILE STUB — replaces src/app/actions/photo-metadata.ts during MOBILE_BUILD.
 * See `scripts/mobile-stubs/achievements.ts` for the rationale.
 */

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

export interface UpdatePhotoMetadataRequest {
  photoId: string
  taken_at?: string
  location_name?: string
  location_lat?: number
  location_lng?: number
  caption?: string
  camera_make?: string
  camera_model?: string
  iso?: number
  aperture?: string
  shutter_speed?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see album-sharing stub
type PhotoMetadataResult = { success: boolean; data?: any; error?: string }

export async function updatePhotoMetadata(
  _request: UpdatePhotoMetadataRequest,
): Promise<PhotoMetadataResult> {
  throw new MobileStubError('updatePhotoMetadata')
}

export async function batchUpdatePhotoMetadata(
  _requests: UpdatePhotoMetadataRequest[],
): Promise<PhotoMetadataResult> {
  throw new MobileStubError('batchUpdatePhotoMetadata')
}
