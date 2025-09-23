import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import type { StorageDebugResults, StorageTestResult } from '@/types/storage-debug'

// Debug endpoint to test storage bucket access
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient()

    const results: StorageDebugResults = {
      timestamp: new Date().toISOString(),
      tests: {} as Record<string, StorageTestResult>,
      summary: {
        passedTests: 0,
        totalTests: 0,
        allPassed: false,
        criticalIssues: []
      }
    }

    // Test 1: List all buckets
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      results.tests.listBuckets = {
        success: !bucketsError,
        data: buckets,
        error: bucketsError?.message,
        bucketCount: buckets?.length || 0,
        bucketNames: buckets?.map(b => b.name) || []
      }
    } catch (error) {
      results.tests.listBuckets = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Test 2: Check specific buckets
    const bucketsToTest = ['photos', 'avatars']
    for (const bucketName of bucketsToTest) {
      try {
        const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName)
        results.tests[`getBucket_${bucketName}`] = {
          success: !bucketError,
          exists: !!bucket,
          data: bucket,
          error: bucketError?.message
        }
      } catch (error) {
        results.tests[`getBucket_${bucketName}`] = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }

    // Test 3: Check storage configuration
    try {
      results.tests.storageConfig = {
        success: true,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasStorageClient: !!supabase.storage
      }
    } catch (error) {
      results.tests.storageConfig = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Test 4: Environment variables check
    results.tests.environmentVariables = {
      success: true,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    }

    // Test 5: Simple file test (create tiny test object)
    try {
      const testFileName = `test-${Date.now()}.txt`
      const testContent = new Blob(['test content'], { type: 'text/plain' })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(testFileName, testContent)

      if (!uploadError) {
        // Clean up test file
        await supabase.storage.from('photos').remove([testFileName])
      }

      results.tests.uploadTest = {
        success: !uploadError,
        data: uploadData,
        error: uploadError?.message
      }
    } catch (error) {
      results.tests.uploadTest = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    // Summary
    const passedTests = Object.values(results.tests).filter(test => test.success).length
    const totalTests = Object.keys(results.tests).length

    results.summary = {
      passedTests,
      totalTests,
      allPassed: passedTests === totalTests,
      criticalIssues: []
    }

    // Identify critical issues
    if (!results.tests.listBuckets?.success) {
      results.summary.criticalIssues.push('Cannot list storage buckets - storage system may not be initialized')
    }

    if (!results.tests.getBucket_photos?.success) {
      results.summary.criticalIssues.push('Photos bucket does not exist or is not accessible')
    }

    if (!results.tests.getBucket_avatars?.success) {
      results.summary.criticalIssues.push('Avatars bucket does not exist or is not accessible')
    }

    if (!results.tests.environmentVariables?.hasSupabaseUrl) {
      results.summary.criticalIssues.push('NEXT_PUBLIC_SUPABASE_URL environment variable missing')
    }

    if (!results.tests.environmentVariables?.hasSupabaseKey) {
      results.summary.criticalIssues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable missing')
    }

    return NextResponse.json(results, {
      status: results.summary.allPassed ? 200 : 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Allow OPTIONS for CORS
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}