-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.run_sql(text);

-- Create the run_sql function with JSONB return type for better compatibility
CREATE OR REPLACE FUNCTION public.run_sql(sql_query TEXT) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') AS t' INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;