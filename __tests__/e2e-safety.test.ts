import {
  assertSafeE2eMutationTarget,
  getSupabaseProjectRef,
} from './e2e/fixtures/safety'

const safeEnv = {
  E2E_ALLOW_MUTATIONS: 'true',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  E2E_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
  PRODUCTION_SUPABASE_PROJECT_REF: 'zyxwvutsrqponmlkjihg',
} as NodeJS.ProcessEnv

describe('E2E mutation safety', () => {
  it('extracts a valid project reference', () => {
    expect(getSupabaseProjectRef(safeEnv.NEXT_PUBLIC_SUPABASE_URL!)).toBe('abcdefghijklmnopqrst')
  })

  it('allows an explicitly confirmed non-production target', () => {
    expect(assertSafeE2eMutationTarget(safeEnv)).toBe('abcdefghijklmnopqrst')
  })

  it('requires the mutation opt-in', () => {
    expect(() => assertSafeE2eMutationTarget({ ...safeEnv, E2E_ALLOW_MUTATIONS: 'false' }))
      .toThrow('refusing mutations')
  })

  it('rejects a target that does not match the expected staging project', () => {
    expect(() => assertSafeE2eMutationTarget({ ...safeEnv, E2E_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaaaaaa' }))
      .toThrow('does not match')
  })

  it('rejects production even when the expected ref is misconfigured', () => {
    expect(() => assertSafeE2eMutationTarget({
      ...safeEnv,
      E2E_SUPABASE_PROJECT_REF: 'jtdkbjvqujgpwcqjydma',
      NEXT_PUBLIC_SUPABASE_URL: 'https://jtdkbjvqujgpwcqjydma.supabase.co',
    })).toThrow('production project')
  })
})
