-- Migration: Add Finance Role & Minimalist Finance Module
-- Date: 2026-11-24

-- 1. Add 'finance' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';

-- 2. Update is_staff function to recognize finance role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('owner'::app_role, 'admin'::app_role, 'technician'::app_role, 'finance'::app_role)
      AND p.is_approved = true
  )
$function$;

-- 3. Table: finance_products (Inventory / Stok Barang)
CREATE TABLE IF NOT EXISTS public.finance_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Umum',
  purchase_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.finance_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow finance and owner to manage finance_products" ON public.finance_products;
CREATE POLICY "Allow finance and owner to manage finance_products"
  ON public.finance_products FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  );

-- 4. Table: finance_stock_logs (Histori Mutasi Stok)
CREATE TABLE IF NOT EXISTS public.finance_stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.finance_products(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'in', 'out', 'adjustment', 'sale', 'void_return'
  quantity INT NOT NULL,
  current_stock INT NOT NULL,
  notes TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.finance_stock_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow finance and owner to manage finance_stock_logs" ON public.finance_stock_logs;
CREATE POLICY "Allow finance and owner to manage finance_stock_logs"
  ON public.finance_stock_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  );

-- 5. Table: finance_invoices (Transaksi POS / Nota Penjualan)
CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL DEFAULT 'Umum',
  customer_phone TEXT,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' | 'percent'
  discount_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_hpp NUMERIC(15,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Tunai', -- 'Tunai' | 'Transfer' | 'QRIS'
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid', -- 'paid' | 'void'
  void_reason TEXT,
  void_at TIMESTAMPTZ,
  void_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow finance and owner to manage finance_invoices" ON public.finance_invoices;
CREATE POLICY "Allow finance and owner to manage finance_invoices"
  ON public.finance_invoices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  );

-- 6. Table: finance_invoice_items (Detail Item Nota)
CREATE TABLE IF NOT EXISTS public.finance_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.finance_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  purchase_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow finance and owner to manage finance_invoice_items" ON public.finance_invoice_items;
CREATE POLICY "Allow finance and owner to manage finance_invoice_items"
  ON public.finance_invoice_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  );

-- 7. Table: finance_expenses (Pengeluaran Operasional)
CREATE TABLE IF NOT EXISTS public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Operasional',
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow finance and owner to manage finance_expenses" ON public.finance_expenses;
CREATE POLICY "Allow finance and owner to manage finance_expenses"
  ON public.finance_expenses FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner'::app_role, 'finance'::app_role)
        AND p.is_approved = true
    )
  );
