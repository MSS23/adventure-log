/**
 * MOBILE STUB — replaces src/app/actions/album-sharing.ts during MOBILE_BUILD.
 * See `scripts/mobile-stubs/achievements.ts` for the rationale.
 */

import type { CreateAlbumShareRequest, SharePermissionLevel } from '@/types/database'

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

// All stubs have explicit return types so callers don't lose type information
// — without them, `async function f() { throw … }` is inferred as
// `Promise<void>`, which breaks every consumer of the original action's shape.
// We use `any` for the `data` payload because we don't want to import every
// downstream consumer's expected shape just to satisfy the type checker on
// throwing stubs. Callers' destructures are happy with `any`.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional, see above
type ShareResult = { success: boolean; data?: any; error?: string }

export async function createAlbumShare(_request: CreateAlbumShareRequest): Promise<ShareResult> {
  throw new MobileStubError('createAlbumShare')
}

export async function getAlbumShares(_albumId: string): Promise<ShareResult> {
  throw new MobileStubError('getAlbumShares')
}

export async function updateAlbumShare(
  _shareId: string,
  _updates: { permission_level?: SharePermissionLevel; expires_at?: string; is_active?: boolean },
): Promise<ShareResult> {
  throw new MobileStubError('updateAlbumShare')
}

export async function deleteAlbumShare(_shareId: string): Promise<{ success: boolean; error?: string }> {
  throw new MobileStubError('deleteAlbumShare')
}

export async function getShareByToken(_token: string): Promise<ShareResult> {
  throw new MobileStubError('getShareByToken')
}

export async function getUserPermission(
  _albumId: string,
  _userId?: string,
): Promise<SharePermissionLevel | null> {
  throw new MobileStubError('getUserPermission')
}
