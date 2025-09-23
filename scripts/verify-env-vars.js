#!/usr/bin/env node

// Environment variables verification for Adventure Log deployment
console.log('🔧 Adventure Log Environment Variables Setup');
console.log('===========================================\n');

console.log('📋 STEP 1: Access Vercel Environment Variables');
console.log('1. Go to https://vercel.com/dashboard');
console.log('2. Find and click on your "adventure-log" project');
console.log('3. Go to Settings tab');
console.log('4. Click "Environment Variables" in the left sidebar\n');

console.log('📋 STEP 2: Required Environment Variables');
console.log('Add the following variables for ALL environments (Production, Preview, Development):\n');

// Read local env file to get current values
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');

  console.log('🔑 **NEXT_PUBLIC_SUPABASE_URL**');
  const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
  console.log(`Value: ${supabaseUrl}`);
  console.log('');

  console.log('🔑 **NEXT_PUBLIC_SUPABASE_ANON_KEY**');
  const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
  console.log(`Value: ${supabaseAnonKey}`);
  console.log('');

  console.log('🔑 **NEXT_PUBLIC_APP_URL**');
  console.log('Value: https://your-vercel-app-url.vercel.app');
  console.log('(Replace with your actual Vercel deployment URL)');
  console.log('');

  console.log('📋 STEP 3: Add Each Variable');
  console.log('For each environment variable:');
  console.log('1. Click "Add" or "Add Another"');
  console.log('2. Name: [variable name from above]');
  console.log('3. Value: [corresponding value]');
  console.log('4. Environment: Select ALL (Production, Preview, Development)');
  console.log('5. Click "Save"\n');

  console.log('📋 STEP 4: Optional Variables');
  console.log('🔑 **NODE_ENV**');
  console.log('Value: production');
  console.log('Environment: Production only');
  console.log('');

  console.log('🔑 **NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN** (Optional)');
  console.log('Value: [Your Mapbox token for enhanced geocoding]');
  console.log('Environment: All environments');
  console.log('Note: The app works without this, but provides basic location features\n');

} catch (error) {
  console.log('❌ Could not read .env.local file');
  console.log('Please ensure these environment variables are set:\n');

  console.log('🔑 **NEXT_PUBLIC_SUPABASE_URL**');
  console.log('Value: https://jjrqstbzzvqrgaqwdvxw.supabase.co');
  console.log('');

  console.log('🔑 **NEXT_PUBLIC_SUPABASE_ANON_KEY**');
  console.log('Value: [Your Supabase anon key from Supabase dashboard]');
  console.log('');

  console.log('🔑 **NEXT_PUBLIC_APP_URL**');
  console.log('Value: https://your-vercel-app-url.vercel.app');
  console.log('');
}

console.log('📋 STEP 5: Verify and Deploy');
console.log('1. After adding all variables, click "Save"');
console.log('2. Go to the "Deployments" tab');
console.log('3. Click "Redeploy" on the latest deployment');
console.log('4. Wait for deployment to complete\n');

console.log('📋 STEP 6: Test Environment Variables');
console.log('After deployment, test by visiting:');
console.log('https://your-app.vercel.app/api/health');
console.log('');
console.log('Expected response:');
console.log('{"status": "healthy", "timestamp": "..."}');
console.log('');

console.log('🚀 Expected Results:');
console.log('✅ Supabase connection works in production');
console.log('✅ Authentication flows work correctly');
console.log('✅ Database operations succeed');
console.log('✅ No console errors related to missing env vars\n');

console.log('💡 Troubleshooting:');
console.log('- If you see "NEXT_PUBLIC_SUPABASE_URL is not defined", the env vars aren\'t set');
console.log('- Environment variables only take effect after redeployment');
console.log('- Check spelling and ensure no extra spaces in variable names/values');
console.log('- Preview deployments use Preview environment variables\n');

console.log('✨ Environment variables setup guide generated successfully!');