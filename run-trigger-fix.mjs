import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://jtdkbjvqujgpwcqjydma.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGtianZxdWpncHdjcWp5ZG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE5NTI5MCwiZXhwIjoyMDc0NzcxMjkwfQ.jC9XUaSAxzriyeX9hccl3hpgU8rJv-C6O4IWTr2JBiA'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runSql(sql) {
  try {
    // Use fetch API to execute SQL directly via Supabase Management API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      const text = await response.text()
      console.log('Response:', text)
    }

    return response.ok
  } catch (err) {
    console.log('Using alternative method...')
    return false
  }
}

async function fixTriggers() {
  console.log('🔧 Fixing notification triggers...\n')

  const sql = fs.readFileSync('fix-triggers.sql', 'utf8')

  // Split into individual statements
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (stmt.length < 10) continue

    console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 50)}...`)

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
      if (error) {
        console.log(`   ⚠️  ${error.message}`)
      } else {
        console.log(`   ✅ Success`)
      }
    } catch (err) {
      console.log(`   ℹ️  Executed (no confirmation)`)
    }
  }

  console.log('\n✅ All statements processed!')
  console.log('\n📝 IMPORTANT: If you see errors above, you need to:')
  console.log('1. Go to https://supabase.com/dashboard/project/jtdkbjvqujgpwcqjydma/sql/new')
  console.log('2. Copy the contents of fix-triggers.sql')
  console.log('3. Paste and click RUN in the SQL Editor')
  console.log('\nThis will fix the likes and comments functionality.\n')
}

fixTriggers().catch(console.error)
