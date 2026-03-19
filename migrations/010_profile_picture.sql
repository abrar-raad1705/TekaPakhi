-- Add profile_picture_url column to profiles table
ALTER TABLE tp.profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT DEFAULT NULL;