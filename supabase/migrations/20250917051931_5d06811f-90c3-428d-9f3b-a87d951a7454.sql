-- Allow admins to update any donation
CREATE POLICY "Admins can update any donation" 
ON public.donations 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Allow admins to delete any donation
CREATE POLICY "Admins can delete any donation" 
ON public.donations 
FOR DELETE 
USING (is_admin(auth.uid()));