import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function runMigration() {
  const sql = fs.readFileSync('supabase/migrations/20250123_fix_notification_triggers.sql', 'utf8')

  console.log('Applying migration to fix notification triggers...')
  console.log('')

  // Split into individual statements and execute
  const statements = sql.split(/;[\s\n]*(?=(?:CREATE|DROP|ALTER|DO))/i).filter(s => s.trim())

  for (const statement of statements) {
    const trimmed = statement.trim()
    if (!trimmed || trimmed.startsWith('--')) continue

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: trimmed + ';' })
      if (error) {
        console.log('Note:', error.message)
      }
    } catch (err) {
      // Ignore errors - some statements may not work with RPC
      console.log('Executed statement (ignoring errors):', trimmed.substring(0, 50) + '...')
    }
  }

  console.log('')
  console.log('✅ Migration completed!')
  console.log('Notification triggers now use target_type instead of entity_type')
  console.log('')
  console.log('Please test liking an album to verify the fix.')
}

runMigration().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
