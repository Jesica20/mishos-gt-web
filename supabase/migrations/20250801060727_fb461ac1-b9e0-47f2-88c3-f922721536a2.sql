-- Create profiles table for admin users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create donations table
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Enable RLS on donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create castration_campaigns table (jornadas de castración)
CREATE TABLE public.castration_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_appointments INTEGER NOT NULL DEFAULT 20,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Enable RLS on castration_campaigns
ALTER TABLE public.castration_campaigns ENABLE ROW LEVEL SECURITY;

-- Create appointments table (citas de castración)
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.castration_campaigns(id) ON DELETE CASCADE,
  appointment_time TIME NOT NULL,
  
  -- Pet information
  pet_name TEXT NOT NULL,
  pet_size TEXT NOT NULL CHECK (pet_size IN ('pequeña', 'mediana', 'grande')),
  pet_weight DECIMAL,
  pet_breed TEXT,
  pet_age INTEGER,
  pet_allergies TEXT,
  fasting_compliance BOOLEAN,
  medical_complications TEXT,
  vaccinations TEXT,
  
  -- Owner information
  owner_first_name TEXT NOT NULL,
  owner_last_name TEXT NOT NULL,
  owner_age INTEGER NOT NULL,
  owner_id TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate appointments at same time for same campaign
  UNIQUE(campaign_id, appointment_time)
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS Policies

-- Profiles policies
CREATE POLICY "Authenticated users can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Donations policies (public read, admin write)
CREATE POLICY "Anyone can view donations" 
  ON public.donations 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create donations" 
  ON public.donations 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update their donations" 
  ON public.donations 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = created_by);

-- Castration campaigns policies (public read, admin write)
CREATE POLICY "Anyone can view castration campaigns" 
  ON public.castration_campaigns 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create campaigns" 
  ON public.castration_campaigns 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update their campaigns" 
  ON public.castration_campaigns 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = created_by);

-- Appointments policies (public read/write)
CREATE POLICY "Anyone can view appointments" 
  ON public.appointments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can create appointments" 
  ON public.appointments 
  FOR INSERT 
  WITH CHECK (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true);

-- Storage policies for images
CREATE POLICY "Anyone can view images" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated users can update images" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated
  USING (bucket_id = 'images');