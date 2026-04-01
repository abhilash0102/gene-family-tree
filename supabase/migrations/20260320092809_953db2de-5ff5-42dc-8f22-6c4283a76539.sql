-- Grant table-level permissions to authenticated role (required for RLS policies to work)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationships TO authenticated;