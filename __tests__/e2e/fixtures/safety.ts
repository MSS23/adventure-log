const KNOWN_PRODUCTION_PROJECT_REFS = new Set([
  'jtdkbjvqujgpwcqjydma',
])

export function getSupabaseProjectRef(urlValue: string): string {
  let url: URL
  try {
    url = new URL(urlValue)
  } catch {
    throw new Error('[e2e] NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
  }

  const suffix = '.supabase.co'
  if (url.protocol !== 'https:' || !url.hostname.endsWith(suffix)) {
    throw new Error('[e2e] mutation target must be an HTTPS *.supabase.co project')
  }

  const projectRef = url.hostname.slice(0, -suffix.length)
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error('[e2e] could not derive a valid Supabase project ref')
  }
  return projectRef
}

/**
 * Destructive E2E setup creates and deletes auth users. It is enabled only
 * when three independently supplied values agree on a non-production target.
 */
export function assertSafeE2eMutationTarget(env: NodeJS.ProcessEnv = process.env): string {
  if (env.E2E_ALLOW_MUTATIONS !== 'true') {
    throw new Error('[e2e] refusing mutations: set E2E_ALLOW_MUTATIONS=true for the staging environment')
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const expectedRef = env.E2E_SUPABASE_PROJECT_REF
  const productionRef = env.PRODUCTION_SUPABASE_PROJECT_REF
  if (!url || !expectedRef || !productionRef) {
    throw new Error(
      '[e2e] refusing mutations: NEXT_PUBLIC_SUPABASE_URL, E2E_SUPABASE_PROJECT_REF, and PRODUCTION_SUPABASE_PROJECT_REF are required',
    )
  }

  const actualRef = getSupabaseProjectRef(url)
  if (actualRef !== expectedRef) {
    throw new Error(`[e2e] refusing mutations: target ${actualRef} does not match E2E_SUPABASE_PROJECT_REF`)
  }
  if (actualRef === productionRef || KNOWN_PRODUCTION_PROJECT_REFS.has(actualRef)) {
    throw new Error(`[e2e] refusing mutations: ${actualRef} is a production project`)
  }
  return actualRef
}
