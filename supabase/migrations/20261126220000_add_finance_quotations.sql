-- Migration: Add Finance Quotations (Penawaran Resmi Corporate/Instansi)
-- Date: 2026-11-26

-- 1. Table: finance_quotations
CREATE TABLE IF NOT EXISTS public.finance_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT NOT NULL UNIQUE,
  ticket_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  ticket_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  device_info TEXT NOT NULL,
  serial_number TEXT,
  accessories TEXT,
  damage_description TEXT,
  technician_diagnosis TEXT,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' | 'percent'
  discount_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'approved', 'rejected'
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.finance_quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to manage finance_quotations" ON public.finance_quotations;
CREATE POLICY "Allow staff to manage finance_quotations"
  ON public.finance_quotations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'admin'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'admin'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  );

-- 2. Table: finance_quotation_items
CREATE TABLE IF NOT EXISTS public.finance_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.finance_quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_sparepart BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff to manage finance_quotation_items" ON public.finance_quotation_items;
CREATE POLICY "Allow staff to manage finance_quotation_items"
  ON public.finance_quotation_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'admin'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'admin'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  );
