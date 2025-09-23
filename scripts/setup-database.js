#!/usr/bin/env node

// Database setup script for Adventure Log
const fs = require('fs');
const path = require('path');

console.log('🗄️  Adventure Log Database Setup Guide');
console.log('=====================================\n');

console.log('This script will help you set up your Supabase database correctly.\n');

console.log('📋 STEP 1: Access Supabase SQL Editor');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Navigate to your project: jjrqstbzzvqrgaqwdvxw');
console.log('3. Click on "SQL Editor" in the left sidebar\n');

console.log('📋 STEP 2: Apply Core Schema');
console.log('Copy and paste the contents of: database/01-core-schema.sql');
console.log('Click "Run" to execute the schema\n');

console.log('📋 STEP 3: Add Reference Data');
console.log('Copy and paste the contents of: database/02-reference-data.sql');
console.log('Click "Run" to execute the reference data\n');

console.log('📋 STEP 4: Create Storage Buckets');
console.log('1. Go to "Storage" in the left sidebar');
console.log('2. Create two buckets:');
console.log('   - Name: "photos" (Public bucket: ON)');
console.log('   - Name: "avatars" (Public bucket: ON)\n');

console.log('📋 STEP 5: Verify Setup');
console.log('Run the following queries in SQL Editor to verify:');
console.log('');
console.log('-- Check tables exist');
console.log("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
console.log('');
console.log('-- Check storage buckets');
console.log("SELECT name FROM storage.buckets;");
console.log('');
console.log('-- Test profile creation');
console.log("SELECT * FROM profiles LIMIT 1;");
console.log('');

// Read and display the schema files
console.log('🔍 SCHEMA PREVIEW:');
console.log('==================\n');

try {
  const schemaPath = path.join(__dirname, '..', 'database', '01-core-schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Core schema file found');
    console.log(`📊 Size: ${(schema.length / 1024).toFixed(1)}KB`);
    console.log(`📝 Lines: ${schema.split('\n').length}`);
  } else {
    console.log('❌ Core schema file not found at:', schemaPath);
  }

  const refDataPath = path.join(__dirname, '..', 'database', '02-reference-data.sql');
  if (fs.existsSync(refDataPath)) {
    console.log('✅ Reference data file found');
  } else {
    console.log('❌ Reference data file not found at:', refDataPath);
  }
} catch (error) {
  console.log('❌ Error reading schema files:', error.message);
}

console.log('\n🚀 After completing these steps:');
console.log('1. Your database will have all required tables');
console.log('2. Profile creation will work correctly');
console.log('3. Photo uploads will be enabled');
console.log('4. All social features will be functional\n');

console.log('💡 If you encounter errors, check the Supabase logs and ensure:');
console.log('- Your database has sufficient permissions');
console.log('- No conflicting tables exist');
console.log('- RLS policies are properly configured\n');

console.log('✨ Database setup guide generated successfully!');