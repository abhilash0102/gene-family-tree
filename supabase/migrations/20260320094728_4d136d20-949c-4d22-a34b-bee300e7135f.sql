-- Ensure authenticated users can access admin_viewers through RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_viewers TO authenticated;

-- Let linked users read their own admin linkage so the app can resolve treeOwnerId
CREATE POLICY "Linked users can read their admin link"
ON public.admin_viewers
FOR SELECT
TO authenticated
USING (viewer_id = auth.uid());

-- Let linked users edit the people in the admin tree they are linked to
CREATE POLICY "Linked users can insert admin people"
ON public.people
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = people.admin_id
      AND av.viewer_id = auth.uid()
  )
);

CREATE POLICY "Linked users can update admin people"
ON public.people
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = people.admin_id
      AND av.viewer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = people.admin_id
      AND av.viewer_id = auth.uid()
  )
);

CREATE POLICY "Linked users can delete admin people"
ON public.people
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = people.admin_id
      AND av.viewer_id = auth.uid()
  )
);

-- Let linked users edit relationships in the admin tree they are linked to
CREATE POLICY "Linked users can insert admin relationships"
ON public.relationships
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = relationships.admin_id
      AND av.viewer_id = auth.uid()
  )
);

CREATE POLICY "Linked users can update admin relationships"
ON public.relationships
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = relationships.admin_id
      AND av.viewer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = relationships.admin_id
      AND av.viewer_id = auth.uid()
  )
);

CREATE POLICY "Linked users can delete admin relationships"
ON public.relationships
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_viewers av
    WHERE av.admin_id = relationships.admin_id
      AND av.viewer_id = auth.uid()
  )
);