-- Grant table-level permissions so authenticated admins can link viewer accounts
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_viewers TO authenticated;