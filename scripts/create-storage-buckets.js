#!/usr/bin/env node

// Storage bucket creation guide for Adventure Log
console.log('🗄️  Adventure Log Storage Bucket Setup');
console.log('=======================================\n');

console.log('📋 STEP 1: Access Supabase Storage');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Navigate to your project: jjrqstbzzvqrgaqwdvxw');
console.log('3. Click on "Storage" in the left sidebar\n');

console.log('📋 STEP 2: Create Photos Bucket');
console.log('1. Click "New bucket"');
console.log('2. Bucket name: photos');
console.log('3. Public bucket: ON (checked)');
console.log('4. Click "Create bucket"\n');

console.log('📋 STEP 3: Create Avatars Bucket');
console.log('1. Click "New bucket" again');
console.log('2. Bucket name: avatars');
console.log('3. Public bucket: ON (checked)');
console.log('4. Click "Create bucket"\n');

console.log('📋 STEP 4: Configure Bucket Policies (Optional)');
console.log('For each bucket, you can set additional policies:');
console.log('1. Click on the bucket name');
console.log('2. Go to "Policies" tab');
console.log('3. The default public policies should work for most cases\n');

console.log('📋 STEP 5: Verify Buckets');
console.log('Run this query in SQL Editor to verify:');
console.log('');
console.log('SELECT name, public FROM storage.buckets;');
console.log('');
console.log('Expected result:');
console.log('| name    | public |');
console.log('|---------|--------|');
console.log('| photos  | true   |');
console.log('| avatars | true   |');
console.log('');

console.log('🚀 After completing these steps:');
console.log('✅ Photo uploads will work correctly');
console.log('✅ Avatar uploads will work correctly');
console.log('✅ File storage will be properly configured\n');

console.log('💡 Troubleshooting:');
console.log('- If buckets already exist, verify they are public');
console.log('- Check bucket permissions if uploads fail');
console.log('- Ensure RLS policies allow your app to upload\n');

console.log('✨ Storage bucket setup guide generated successfully!');