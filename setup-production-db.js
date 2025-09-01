#!/usr/bin/env node

/**
 * Production Database Setup Script
 * Initializes the database schema and seeds initial data for the deployed Adventure Log
 */

const { execSync } = require('child_process');

console.log('🗄️ Setting up Adventure Log Production Database...\n');

// Set environment to production database
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_JsEPzMf9l0vk@ep-old-truth-aeka7114-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';

try {
  console.log('📋 Step 1: Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('\n🏗️  Step 2: Pushing Database Schema...');
  console.log('Creating all tables, indexes, and constraints in Neon PostgreSQL...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('\n🌱 Step 3: Seeding Database with Initial Data...');
  console.log('Adding badges, sample data, and configurations...');
  execSync('npm run db:seed', { stdio: 'inherit' });
  
  console.log('\n✅ Production Database Setup Complete!');
  console.log('\n📊 Database Summary:');
  console.log('• All tables created in Neon PostgreSQL');
  console.log('• Badge system initialized (10 achievement badges)');
  console.log('• Sample data added for testing');
  console.log('• Database ready for user registrations');
  
  console.log('\n🔗 Next Steps:');
  console.log('1. Update NEXTAUTH_URL with your Vercel deployment URL');
  console.log('2. Update Google OAuth redirect URIs');
  console.log('3. Create Supabase storage bucket: "adventure-photos"');
  console.log('4. Test the full application workflow');
  
} catch (error) {
  console.error('\n❌ Database setup failed:', error.message);
  console.error('\n🔍 Troubleshooting:');
  console.error('• Verify DATABASE_URL environment variable is correct');
  console.error('• Ensure Neon PostgreSQL database is accessible');
  console.error('• Check that all dependencies are installed');
  process.exit(1);
}