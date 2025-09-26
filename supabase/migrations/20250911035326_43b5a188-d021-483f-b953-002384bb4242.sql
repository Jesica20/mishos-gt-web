-- Make appointment_time nullable since we're removing time selection
ALTER TABLE public.appointments ALTER COLUMN appointment_time DROP NOT NULL;