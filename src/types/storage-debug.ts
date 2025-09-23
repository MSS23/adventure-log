// TypeScript interfaces for storage debugging

export interface StorageTestResult {
  success: boolean
  data?: unknown
  error?: string
  bucketCount?: number
  bucketNames?: string[]
  exists?: boolean
  url?: string
  hasStorageClient?: boolean
  hasSupabaseUrl?: boolean
  hasSupabaseKey?: boolean
  supabaseUrlLength?: number
  supabaseKeyLength?: number
}

export interface StorageDebugResults {
  timestamp: string
  tests: Record<string, StorageTestResult>
  summary: {
    passedTests: number
    totalTests: number
    allPassed: boolean
    criticalIssues: string[]
  }
}

export interface BucketDebugInfo {
  exists: boolean
  accessible: boolean
  error?: string
  details?: unknown
}

export interface UploadDebugResult {
  success: boolean
  url?: string
  error?: string
  debugInfo?: unknown
}

export interface EmergencyUploadResult {
  success: boolean
  url?: string
  error?: string
}