#!/usr/bin/env node

/**
 * Automated script to upload environment variables from .env.local to Vercel
 * Reads .env.local and uploads each variable to production, preview, and development
 */

<<<<<<< HEAD
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting automated environment variable upload to Vercel...\n');

// Read .env.local file
const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const envVars = {};
const lines = envContent.split('\n');

for (const line of lines) {
  const trimmedLine = line.trim();
  
  // Skip empty lines and comments
  if (!trimmedLine || trimmedLine.startsWith('#')) continue;
  
  // Parse KEY=VALUE format
  const equalIndex = trimmedLine.indexOf('=');
  if (equalIndex === -1) continue;
  
  const key = trimmedLine.substring(0, equalIndex).trim();
  let value = trimmedLine.substring(equalIndex + 1).trim();
  
  // Remove surrounding quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  
=======
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Starting automated environment variable upload to Vercel...\n");

// Read .env.local file
const envPath = path.join(__dirname, ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local file not found!");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf8");

// Parse environment variables
const envVars = {};
const lines = envContent.split("\n");

for (const line of lines) {
  const trimmedLine = line.trim();

  // Skip empty lines and comments
  if (!trimmedLine || trimmedLine.startsWith("#")) continue;

  // Parse KEY=VALUE format
  const equalIndex = trimmedLine.indexOf("=");
  if (equalIndex === -1) continue;

  const key = trimmedLine.substring(0, equalIndex).trim();
  let value = trimmedLine.substring(equalIndex + 1).trim();

  // Remove surrounding quotes if present
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

>>>>>>> oauth-upload-fixes
  if (key && value) {
    envVars[key] = value;
  }
}

<<<<<<< HEAD
console.log(`📋 Found ${Object.keys(envVars).length} environment variables to upload:\n`);

// List all variables that will be uploaded
for (const [key, value] of Object.entries(envVars)) {
  const maskedValue = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY') 
    ? value.substring(0, 10) + '...' 
    : value.length > 50 
    ? value.substring(0, 50) + '...' 
    : value;
  console.log(`  ✓ ${key} = ${maskedValue}`);
}

console.log('\n🔧 Uploading to Vercel...\n');
=======
console.log(
  `📋 Found ${Object.keys(envVars).length} environment variables to upload:\n`
);

// List all variables that will be uploaded
for (const [key, value] of Object.entries(envVars)) {
  const maskedValue =
    key.includes("SECRET") || key.includes("PASSWORD") || key.includes("KEY")
      ? value.substring(0, 10) + "..."
      : value.length > 50
        ? value.substring(0, 50) + "..."
        : value;
  console.log(`  ✓ ${key} = ${maskedValue}`);
}

console.log("\n🔧 Uploading to Vercel...\n");
>>>>>>> oauth-upload-fixes

// Upload each environment variable
let successCount = 0;
let failureCount = 0;

for (const [key, value] of Object.entries(envVars)) {
  try {
    console.log(`⬆️  Uploading ${key}...`);
<<<<<<< HEAD
    
    // Upload to production, preview, and development environments
    const environments = ['production', 'preview', 'development'];
    
    for (const env of environments) {
      const command = `vercel env add ${key} ${env}`;
      
      // Use echo to pipe the value to vercel env add command
      const fullCommand = process.platform === 'win32' 
        ? `echo ${value} | ${command}`
        : `echo "${value}" | ${command}`;
      
      execSync(fullCommand, { 
        stdio: ['pipe', 'pipe', 'pipe'],
        input: value + '\n'
      });
    }
    
    console.log(`   ✅ ${key} uploaded successfully to all environments`);
    successCount++;
    
=======

    // Upload to production, preview, and development environments
    const environments = ["production", "preview", "development"];

    for (const env of environments) {
      const command = `vercel env add ${key} ${env}`;

      // Use echo to pipe the value to vercel env add command
      const fullCommand =
        process.platform === "win32"
          ? `echo ${value} | ${command}`
          : `echo "${value}" | ${command}`;

      execSync(fullCommand, {
        stdio: ["pipe", "pipe", "pipe"],
        input: value + "\n",
      });
    }

    console.log(`   ✅ ${key} uploaded successfully to all environments`);
    successCount++;
>>>>>>> oauth-upload-fixes
  } catch (error) {
    console.log(`   ❌ Failed to upload ${key}: ${error.message}`);
    failureCount++;
  }
}

<<<<<<< HEAD
console.log('\n📊 Upload Summary:');
=======
console.log("\n📊 Upload Summary:");
>>>>>>> oauth-upload-fixes
console.log(`✅ Successfully uploaded: ${successCount} variables`);
if (failureCount > 0) {
  console.log(`❌ Failed uploads: ${failureCount} variables`);
}

<<<<<<< HEAD
console.log('\n🎉 Environment variable upload completed!');
console.log('📝 Next steps:');
console.log('1. Update NEXTAUTH_URL with your actual Vercel deployment URL');
console.log('2. Update Google OAuth redirect URIs');
console.log('3. Create Supabase storage bucket');
console.log('4. Test your deployment!');
=======
console.log("\n🎉 Environment variable upload completed!");
console.log("📝 Next steps:");
console.log("1. Update NEXTAUTH_URL with your actual Vercel deployment URL");
console.log("2. Update Google OAuth redirect URIs");
console.log("3. Create Supabase storage bucket");
console.log("4. Test your deployment!");
>>>>>>> oauth-upload-fixes
