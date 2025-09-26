-- Drop and recreate FK constraints to reference profiles.user_id with ON DELETE SET NULL
-- First castration_campaigns
ALTER TABLE public.castration_campaigns
  DROP CONSTRAINT IF EXISTS castration_campaigns_created_by_fkey;
ALTER TABLE public.castration_campaigns
  ADD CONSTRAINT castration_campaigns_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- Then donations
ALTER TABLE public.donations
  DROP CONSTRAINT IF EXISTS donations_created_by_fkey;
ALTER TABLE public.donations
  ADD CONSTRAINT donations_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- Finally gallery
ALTER TABLE public.gallery
  DROP CONSTRAINT IF EXISTS gallery_created_by_fkey;
ALTER TABLE public.gallery
  ADD CONSTRAINT gallery_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;