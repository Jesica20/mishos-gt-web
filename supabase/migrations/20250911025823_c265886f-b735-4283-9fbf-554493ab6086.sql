-- Secure appointments: restrict public SELECT and add public-safe counts RPC

-- 1) Drop overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view appointments" ON public.appointments;

-- 2) Allow only authenticated users to view appointment rows
CREATE POLICY "Authenticated users can view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (true);

-- Keep existing INSERT policy that allows anyone to create appointments
-- (No change) If not present, ensure it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'appointments' AND policyname = 'Anyone can create appointments'
  ) THEN
    CREATE POLICY "Anyone can create appointments"
    ON public.appointments
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- 3) Create a SECURITY DEFINER function to return counts per campaign for public use
CREATE OR REPLACE FUNCTION public.get_appointment_counts(_campaign_ids uuid[])
RETURNS TABLE (campaign_id uuid, total integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.campaign_id, COUNT(*)::int AS total
  FROM public.appointments a
  WHERE a.campaign_id = ANY(_campaign_ids)
  GROUP BY a.campaign_id;
$$;

-- 4) Grant execute on the function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_appointment_counts(uuid[]) TO anon, authenticated;