
-- Grant table-level permissions
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.admin_viewers TO authenticated;

-- Create the trigger on auth.users to auto-create profile + role
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
