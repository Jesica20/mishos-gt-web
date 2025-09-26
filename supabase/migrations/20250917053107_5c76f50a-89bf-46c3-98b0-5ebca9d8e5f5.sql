DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- Castration campaigns FK -> profiles.user_id
ALTER TABLE public.castration_campaigns
  DROP CONSTRAINT IF EXISTS castration_campaigns_created_by_fkey;
ALTER TABLE public.castration_campaigns
  ADD CONSTRAINT castration_campaigns_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- Donations FK -> profiles.user_id
ALTER TABLE public.donations
  DROP CONSTRAINT IF EXISTS donations_created_by_fkey;
ALTER TABLE public.donations
  ADD CONSTRAINT donations_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- Gallery FK -> profiles.user_id
ALTER TABLE public.gallery
  DROP CONSTRAINT IF EXISTS gallery_created_by_fkey;
ALTER TABLE public.gallery
  ADD CONSTRAINT gallery_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;