-- Add conversion_factor_m3_to_kwh column to contracts table
ALTER TABLE public.contracts 
ADD COLUMN conversion_factor_m3_to_kwh numeric NOT NULL DEFAULT 1;

-- Update existing Gas contracts to have a default factor of 10
UPDATE public.contracts 
SET conversion_factor_m3_to_kwh = 10 
WHERE type = 'gas';
