
-- People table scoped by admin_id
CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  date_of_birth text,
  notes text,
  photo_url text,
  created_at bigint NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Relationships table scoped by admin_id
CREATE TABLE public.relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('partner', 'parent-child')),
  person_a uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  person_b uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE
);

-- RLS policies for people
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their people"
  ON public.people FOR ALL TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Viewers can read their admin people"
  ON public.people FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_viewers av
      WHERE av.admin_id = people.admin_id
        AND av.viewer_id = auth.uid()
    )
  );

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their relationships"
  ON public.relationships FOR ALL TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Viewers can read their admin relationships"
  ON public.relationships FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_viewers av
      WHERE av.admin_id = relationships.admin_id
        AND av.viewer_id = auth.uid()
    )
  );
