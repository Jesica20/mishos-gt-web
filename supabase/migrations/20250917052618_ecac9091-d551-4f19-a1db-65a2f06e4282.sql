-- Allow admins to update any campaign
CREATE POLICY "Admins can update any campaign"
ON public.castration_campaigns
FOR UPDATE
USING (is_admin(auth.uid()));

-- Allow admins to delete any campaign
CREATE POLICY "Admins can delete any campaign"
ON public.castration_campaigns
FOR DELETE
USING (is_admin(auth.uid()));