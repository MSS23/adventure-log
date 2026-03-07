#!/usr/bin/env node

/**
 * Run the seed script with environment variables from .env.local
 *
 * Usage:
 *   node scripts/run-seed.js           # Preview (dry run)
 *   node scripts/run-seed.js --apply   # Apply changes
 *   node scripts/run-seed.js --clear   # Clear demo data
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  console.error('   Please create .env.local with your Supabase credentials');
  process.exit(1);
}

// Parse .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  }
});

// Check required variables
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredVars.filter(v => !envVars[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables in .env.local:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

// Build command
const args = process.argv.slice(2).join(' ');
const seedScript = path.join(__dirname, 'seed-demo-data.mjs');

// Set environment variables
Object.entries(envVars).forEach(([key, value]) => {
  process.env[key] = value;
});

console.log('🌍 Loading environment variables from .env.local...');
console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL}`);
console.log('✅ SUPABASE_SERVICE_ROLE_KEY: [hidden]\n');

// Run the seed script
try {
  execSync(`node "${seedScript}" ${args}`, {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  process.exit(error.status || 1);
}
