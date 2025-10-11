#!/usr/bin/env node
/**
 * Test if the feed query works after schema cache reload
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

console.log('🧪 Testing feed query after schema cache reload...\n');

// This is the exact query that's failing in useFeedData
const { data, error } = await supabase
  .from('albums')
  .select(`
    *,
    users!albums_user_id_fkey(username, display_name, avatar_url)
  `)
  .or('visibility.eq.public,visibility.is.null')
  .neq('status', 'draft')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.log('❌ Feed query still failing:');
  console.log(JSON.stringify(error, null, 2));
  console.log('\n💡 The schema cache may not be reloaded yet.');
  console.log('   Wait 1-2 minutes and run this script again.');
} else {
  console.log('✅ Feed query working!');
  console.log(`Found ${data.length} albums`);

  if (data.length > 0) {
    console.log('\nSample album:');
    console.log({
      title: data[0].title,
      user: data[0].users?.username || 'N/A',
      visibility: data[0].visibility
    });
  }

  console.log('\n🎉 Your feed should be working in the app now!');
}
