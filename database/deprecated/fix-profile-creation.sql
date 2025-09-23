-- Fix for automatic profile creation after user signup
-- This bypasses the RLS issue by creating profiles automatically server-side

-- Drop existing function and trigger for clean setup
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, privacy_level, created_at, updated_at)
  VALUES (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    'public',
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create trigger that runs after a new user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;