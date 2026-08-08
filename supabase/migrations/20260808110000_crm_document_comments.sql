CREATE TABLE IF NOT EXISTS public.crm_document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.crm_documents(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_document_comments_document_created
  ON public.crm_document_comments(document_id, created_at ASC);

DROP TRIGGER IF EXISTS update_crm_document_comments_updated_at ON public.crm_document_comments;
CREATE TRIGGER update_crm_document_comments_updated_at
BEFORE UPDATE ON public.crm_document_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_document_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view document comments"
ON public.crm_document_comments FOR SELECT TO authenticated
USING (
  public.is_platform_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.companies company
    WHERE company.id = crm_document_comments.company_id AND company.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.company_members member
    WHERE member.company_id = crm_document_comments.company_id
      AND member.user_id = auth.uid()
      AND member.status = 'approved'
  )
);

CREATE POLICY "Company users can add document comments"
ON public.crm_document_comments FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.crm_documents document
    WHERE document.id = crm_document_comments.document_id
      AND document.company_id = crm_document_comments.company_id
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.companies company
      WHERE company.id = crm_document_comments.company_id AND company.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.company_members member
      WHERE member.company_id = crm_document_comments.company_id
        AND member.user_id = auth.uid()
        AND member.status = 'approved'
    )
  )
);

CREATE POLICY "Authors can update document comments"
ON public.crm_document_comments FOR UPDATE TO authenticated
USING (author_user_id = auth.uid())
WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Authors can delete document comments"
ON public.crm_document_comments FOR DELETE TO authenticated
USING (author_user_id = auth.uid());