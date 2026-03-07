#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error('Please add it to run this migration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔧 Applying follow system fix migration...\n')

  const sql = readFileSync('supabase/migrations/20251027_fix_follow_functions.sql', 'utf8')

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 60).replace(/\n/g, ' ')

    console.log(`${i + 1}. Executing: ${preview}...`)

    try {
      // Execute using raw SQL
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      })

      if (error) {
        throw error
      }

      console.log('   ✅ Success')
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)

      // If exec_sql doesn't exist, provide instructions
      if (error.message.includes('exec_sql')) {
        console.log('\n⚠️  Cannot execute via script. Please run manually:')
        console.log('1. Go to: https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/sql/new')
        console.log('2. Copy contents of: supabase/migrations/20251027_fix_follow_functions.sql')
        console.log('3. Click "Run"\n')
        process.exit(1)
      }
    }
  }

  console.log('\n✅ Migration completed successfully!')
  console.log('Follow system is now fixed. Try following someone again!')
}

runMigration().catch(console.error)
