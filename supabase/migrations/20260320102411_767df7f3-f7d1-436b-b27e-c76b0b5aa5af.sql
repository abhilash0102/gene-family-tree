
-- Table to persist manually-moved node positions
CREATE TABLE public.node_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  x double precision NOT NULL,
  y double precision NOT NULL,
  UNIQUE (admin_id, person_id)
);

ALTER TABLE public.node_positions ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own node positions
CREATE POLICY "Admins can manage their node positions"
ON public.node_positions FOR ALL TO authenticated
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());

-- Linked viewers can read and manage node positions
CREATE POLICY "Linked users can manage node positions"
ON public.node_positions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_viewers av
    WHERE av.admin_id = node_positions.admin_id
      AND av.viewer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_viewers av
    WHERE av.admin_id = node_positions.admin_id
      AND av.viewer_id = auth.uid()
  )
);

-- Also grant table-level INSERT permission on admin_viewers for authenticated
-- (fixes "permission denied for table admin_viewers" error)
GRANT ALL ON TABLE public.admin_viewers TO authenticated;
GRANT ALL ON TABLE public.node_positions TO authenticated;
