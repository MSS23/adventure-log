-- Adventure Log Demo Data SQL Script
-- Run this in Supabase SQL Editor to populate the database with demo content
-- WARNING: This creates demo users and albums. Only run in development/staging!

-- Note: You'll need to manually create auth users via Supabase Dashboard or API
-- This script only creates the profile and album data

-- Step 1: Insert demo user profiles (you must create auth users first in Supabase Auth)
-- Go to Authentication > Users in Supabase Dashboard and create users with these emails:
-- adventure_alex@demo.adventurelog.app
-- wanderlust_sarah@demo.adventurelog.app
-- backpack_ben@demo.adventurelog.app
-- luxury_lisa@demo.adventurelog.app
-- culture_carlos@demo.adventurelog.app

-- Step 2: After creating auth users, insert their profiles
-- Replace the UUID values below with the actual user IDs from Supabase Auth

-- Example profile inserts (replace UUIDs with actual user IDs):
/*
INSERT INTO public.users (id, username, display_name, bio, privacy_level)
VALUES
  ('auth-user-id-1', 'adventure_alex', 'Alex Chen', 'World traveler & photographer 📸 | 45 countries & counting', 'public'),
  ('auth-user-id-2', 'wanderlust_sarah', 'Sarah Johnson', 'Solo female traveler | Foodie | Digital nomad', 'public'),
  ('auth-user-id-3', 'backpack_ben', 'Ben Williams', 'Budget backpacker | Adventure seeker | Nature lover', 'public'),
  ('auth-user-id-4', 'luxury_lisa', 'Lisa Martinez', '5-star hotels & fine dining | Luxury travel curator', 'public'),
  ('auth-user-id-5', 'culture_carlos', 'Carlos Rodriguez', 'Cultural explorer | Museum enthusiast | History buff', 'public');
*/

-- Step 3: Insert demo albums (replace user_id with actual user IDs)
/*
INSERT INTO public.albums (user_id, title, description, location_name, country_code, latitude, longitude, date_start, date_end, visibility)
VALUES
  -- User 1 albums
  ('auth-user-id-1', 'Paris in Spring', 'Exploring the City of Lights during the most beautiful season. From the Eiffel Tower to hidden cafés in Le Marais.', 'Paris, France', 'FR', 48.8566, 2.3522, '2024-04-15', '2024-04-22', 'public'),
  ('auth-user-id-1', 'Tokyo Neon Nights', 'Shibuya crossing, ramen alleys, and cherry blossoms in Ueno Park.', 'Tokyo, Japan', 'JP', 35.6762, 139.6503, '2024-03-25', '2024-04-05', 'public'),

  -- User 2 albums
  ('auth-user-id-2', 'Iceland Road Trip', 'Chasing waterfalls, glaciers, and the Northern Lights on the Ring Road.', 'Reykjavik, Iceland', 'IS', 64.1466, -21.9426, '2024-09-10', '2024-09-20', 'public'),
  ('auth-user-id-2', 'Bali Yoga Retreat', 'Rice terraces, monkey forests, and sunrise yoga at our villa.', 'Ubud, Bali', 'ID', -8.5069, 115.2625, '2024-02-10', '2024-02-24', 'public'),

  -- User 3 albums
  ('auth-user-id-3', 'Greek Islands Hopping', 'White-washed houses, blue domes, and endless Mediterranean views. Mykonos, Santorini, and Crete.', 'Santorini, Greece', 'GR', 36.3932, 25.4615, '2024-06-05', '2024-06-18', 'public'),
  ('auth-user-id-3', 'Costa Rica Wildlife', 'Sloths, monkeys, and zip-lining through the rainforest canopy.', 'San José, Costa Rica', 'CR', 9.9281, -84.0907, '2024-07-08', '2024-07-21', 'public'),

  -- User 4 albums
  ('auth-user-id-4', 'Dubai Luxury Escape', 'Burj Khalifa, desert safaris, and shopping in the world''s largest mall.', 'Dubai, UAE', 'AE', 25.2048, 55.2708, '2024-12-01', '2024-12-08', 'public'),
  ('auth-user-id-4', 'Barcelona Architecture', 'Gaudí''s masterpieces, tapas bars, and beach life in Catalonia.', 'Barcelona, Spain', 'ES', 41.3851, 2.1734, '2024-05-20', '2024-05-27', 'public'),

  -- User 5 albums
  ('auth-user-id-5', 'Marrakech Souks Adventure', 'Getting lost in the medina, riding camels in the Sahara, and mint tea everywhere.', 'Marrakech, Morocco', 'MA', 31.6295, -7.9811, '2024-10-18', '2024-10-28', 'public'),
  ('auth-user-id-5', 'New York City Marathon', 'Running through all five boroughs and exploring the city that never sleeps.', 'New York, USA', 'US', 40.7128, -74.0060, '2024-11-03', '2024-11-10', 'public');
*/

-- Step 4: Create some follow relationships
/*
INSERT INTO public.follows (follower_id, following_id, status)
VALUES
  ('auth-user-id-1', 'auth-user-id-2', 'accepted'),
  ('auth-user-id-1', 'auth-user-id-3', 'accepted'),
  ('auth-user-id-2', 'auth-user-id-1', 'accepted'),
  ('auth-user-id-2', 'auth-user-id-4', 'accepted'),
  ('auth-user-id-3', 'auth-user-id-1', 'accepted'),
  ('auth-user-id-3', 'auth-user-id-5', 'accepted'),
  ('auth-user-id-4', 'auth-user-id-2', 'accepted'),
  ('auth-user-id-5', 'auth-user-id-3', 'accepted');
*/

-- Step 5: Add some likes to albums
-- First, get album IDs: SELECT id, title FROM albums;
-- Then insert likes:
/*
INSERT INTO public.likes (user_id, target_type, target_id)
VALUES
  ('auth-user-id-2', 'album', 'album-id-1'),
  ('auth-user-id-3', 'album', 'album-id-1'),
  ('auth-user-id-1', 'album', 'album-id-3'),
  ('auth-user-id-4', 'album', 'album-id-5');
*/

-- Step 6: Add some comments to albums
/*
INSERT INTO public.comments (user_id, target_type, target_id, content)
VALUES
  ('auth-user-id-2', 'album', 'album-id-1', 'Amazing photos! This looks incredible 😍'),
  ('auth-user-id-3', 'album', 'album-id-1', 'Adding this to my bucket list!'),
  ('auth-user-id-1', 'album', 'album-id-3', 'Wow, I went there last year too! Such a beautiful place.'),
  ('auth-user-id-4', 'album', 'album-id-5', 'This is making me want to book a flight right now ✈️');
*/

-- Instructions:
-- 1. Create auth users in Supabase Dashboard (Authentication > Users)
-- 2. Copy their user IDs
-- 3. Uncomment the INSERT statements above
-- 4. Replace all 'auth-user-id-X' placeholders with actual user IDs
-- 5. Run this script in Supabase SQL Editor
-- 6. For albums, run the SELECT query first to get album IDs, then add likes/comments

-- Note: The Node.js seed script (seed-demo-data.mjs) is much easier to use
-- as it handles auth user creation automatically via Supabase Admin API
