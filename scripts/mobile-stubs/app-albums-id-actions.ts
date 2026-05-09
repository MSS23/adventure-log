/**
 * MOBILE STUB — replaces src/app/(app)/albums/[id]/actions.ts during MOBILE_BUILD.
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

export async function deletePhoto(
  _photoId: string,
  _albumId: string,
): Promise<{ success: boolean; error?: string; albumDeleted?: boolean }> {
  throw new MobileStubError('deletePhoto')
}
