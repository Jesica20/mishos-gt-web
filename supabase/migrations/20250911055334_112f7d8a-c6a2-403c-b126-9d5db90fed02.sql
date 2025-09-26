-- Create table for appointment recommendations
CREATE TABLE public.appointment_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.appointment_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active recommendations" 
ON public.appointment_recommendations 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can view all recommendations" 
ON public.appointment_recommendations 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage recommendations" 
ON public.appointment_recommendations 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_appointment_recommendations_updated_at
BEFORE UPDATE ON public.appointment_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();