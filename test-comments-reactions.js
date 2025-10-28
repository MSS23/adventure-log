/**
 * Test script for Comments and Reactions functionality
 * Run this after applying the database migration
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testCommentsAndReactions() {
  try {
    console.log('Testing Comments and Reactions functionality...\n')

    // Test 1: Check if reactions table exists
    console.log('1. Checking reactions table...')
    const { data: reactionsCheck, error: reactionsError } = await supabase
      .from('reactions')
      .select('*')
      .limit(1)

    if (reactionsError) {
      console.error('❌ Reactions table not found or error:', reactionsError.message)
    } else {
      console.log('✅ Reactions table exists')
    }

    // Test 2: Check if comments table exists
    console.log('\n2. Checking comments table...')
    const { data: commentsCheck, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(1)

    if (commentsError) {
      console.error('❌ Comments table not found or error:', commentsError.message)
    } else {
      console.log('✅ Comments table exists')
    }

    // Test 3: Check if reactions_with_users view exists
    console.log('\n3. Checking reactions_with_users view...')
    const { data: viewCheck, error: viewError } = await supabase
      .from('reactions_with_users')
      .select('*')
      .limit(1)

    if (viewError) {
      console.error('❌ reactions_with_users view not found:', viewError.message)
    } else {
      console.log('✅ reactions_with_users view exists')
    }

    // Test 4: Check if RPC functions exist
    console.log('\n4. Checking RPC functions...')

    // Get a sample album to test with
    const { data: album } = await supabase
      .from('albums')
      .select('id')
      .limit(1)
      .single()

    if (album) {
      // Test toggle_reaction function
      const { error: toggleError } = await supabase
        .rpc('toggle_reaction', {
          p_target_type: 'album',
          p_target_id: album.id,
          p_reaction_type: 'thumbsup'
        })

      if (toggleError) {
        console.error('❌ toggle_reaction function error:', toggleError.message)
      } else {
        console.log('✅ toggle_reaction function works')
      }

      // Test get_reaction_counts function
      const { data: counts, error: countsError } = await supabase
        .rpc('get_reaction_counts', {
          p_target_type: 'album',
          p_target_id: album.id
        })

      if (countsError) {
        console.error('❌ get_reaction_counts function error:', countsError.message)
      } else {
        console.log('✅ get_reaction_counts function works')
        console.log('   Reaction counts:', counts)
      }
    } else {
      console.log('⚠️  No albums found to test RPC functions')
    }

    // Test 5: Check real-time subscriptions
    console.log('\n5. Testing real-time subscriptions...')

    const channel = supabase
      .channel('test-reactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        (payload) => {
          console.log('✅ Real-time event received:', payload.eventType)
        }
      )
      .subscribe()

    if (channel.state === 'SUBSCRIPTION_ERROR') {
      console.error('❌ Real-time subscription failed')
    } else {
      console.log('✅ Real-time subscription established')
    }

    // Clean up
    await channel.unsubscribe()

    console.log('\n✅ All tests completed!')
    console.log('\nNext steps:')
    console.log('1. Run the migration: npx supabase db push')
    console.log('2. Start the development server: npm run dev')
    console.log('3. Navigate to an album detail page')
    console.log('4. Test adding comments and reactions')

  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run tests
testCommentsAndReactions()