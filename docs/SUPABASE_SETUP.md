# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project name: `adventure-log`
5. Create a secure database password
6. Choose a region close to you
7. Click "Create new project"

## 2. Set up Database Schema

1. Wait for your project to be ready (this can take a few minutes)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy the entire contents of `database-setup.sql` file
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

## 3. Configure Environment Variables

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - Project URL
   - anon/public key

3. Create a `.env.local` file in the `adventure-log` directory with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Test the Application

1. Make sure your development server is running: `npm run dev`
2. Visit http://localhost:3000
3. Try signing up with a new account
4. Complete the profile setup
5. You should be redirected to the dashboard

## Troubleshooting

### Common Issues:

1. **"Invalid API key"** - Check that your environment variables are correctly set
2. **"Table doesn't exist"** - Make sure you ran the database schema script
3. **"Row Level Security"** errors - Ensure all RLS policies were created properly

### Checking if Setup Worked:

1. Go to **Table Editor** in Supabase
2. You should see tables: `profiles`, `albums`, `photos`, `countries`, etc.
3. After signing up, check the `profiles` table for your new user

## Next Steps

Once authentication is working, you can:
1. Start building the album creation feature
2. Add photo upload functionality
3. Implement the 3D globe visualization