-- =============================================================================
-- ONBOARDING TRIGGER
-- Run this in your Supabase SQL Editor to automate profile creation for invited staff.
-- =============================================================================

-- 1. Create the function that will handle the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email, team)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(new.raw_user_meta_data->>'role', 'pm'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'team', 'N/A')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    team = EXCLUDED.team;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the auth.users table
-- Dropping existing trigger if it exists to prevent errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- REFRESH POSTGREST CACHE
-- =============================================================================
NOTIFY pgrst, 'reload schema';
