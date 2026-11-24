import { supabase } from "@/integrations/supabase/client";

export interface FinanceProduct {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceStockLog {
  id: string;
  product_id: string;
  product_name?: string;
  type: "in" | "out" | "adjustment" | "sale" | "void_return";
  quantity: number;
  current_stock: number;
  notes?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface TicketSparepart {
  id: string;
  product_id: string;
  product_name: string;
  sku?: string | null;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  added_at: string;
  added_by?: string;
}

export interface FinanceInvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string | null;
  product_name: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  subtotal: number;
  is_from_ticket?: boolean;
  created_at?: string;
}

export interface FinanceInvoice {
  id: string;
  invoice_number: string;
  ticket_id?: string | null;
  ticket_number?: string | null;
  device_info?: string | null;
  date: string;
  customer_name: string;
  customer_phone?: string | null;
  warranty_duration?: number | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  warranty_notes?: string | null;
  subtotal: number;
  discount_type: "fixed" | "percent";
  discount_value: number;
  total_discount: number;
  total_hpp: number;
  grand_total: number;
  payment_method: "Tunai" | "Transfer" | "QRIS";
  amount_paid: number;
  change_amount: number;
  status: "paid" | "void";
  void_reason?: string | null;
  void_at?: string | null;
  void_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: FinanceInvoiceItem[];
}

export interface FinanceExpense {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Fallback Local Storage Keys & Default Seed Data
// ─────────────────────────────────────────────────────────────
const STORAGE_PREFIX = "zs_finance_";
const STORAGE_KEYS = {
  PRODUCTS: `${STORAGE_PREFIX}products`,
  INVOICES: `${STORAGE_PREFIX}invoices`,
  INVOICE_ITEMS: `${STORAGE_PREFIX}invoice_items`,
  STOCK_LOGS: `${STORAGE_PREFIX}stock_logs`,
  EXPENSES: `${STORAGE_PREFIX}expenses`,
};

const DEFAULT_PRODUCTS: FinanceProduct[] = [
  {
    id: "prod-1",
    sku: "PRD-SSD-256",
    name: "SSD NVMe 256GB PCIe Gen3",
    category: "Sparepart",
    purchase_price: 240000,
    selling_price: 360000,
    stock: 12,
    min_stock: 5,
    unit: "pcs",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-2",
    sku: "PRD-RAM-8D4",
    name: "RAM DDR4 8GB 3200MHz SODIMM",
    category: "Sparepart",
    purchase_price: 260000,
    selling_price: 395000,
    stock: 8,
    min_stock: 3,
    unit: "pcs",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-3",
    sku: "PRD-THM-MX4",
    name: "Thermal Paste Arctic MX-4 4g",
    category: "Aksesoris",
    purchase_price: 65000,
    selling_price: 95000,
    stock: 15,
    min_stock: 5,
    unit: "pcs",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-4",
    sku: "PRD-ADP-65W",
    name: "Adaptor Laptop ASUS Original 19V 3.42A 65W",
    category: "Aksesoris",
    purchase_price: 135000,
    selling_price: 210000,
    stock: 6,
    min_stock: 2,
    unit: "pcs",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod-5",
    sku: "PRD-JSA-CLN",
    name: "Jasa Deep Cleaning & Repaste Cooling",
    category: "Jasa",
    purchase_price: 0,
    selling_price: 150000,
    stock: 999,
    min_stock: 0,
    unit: "layanan",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Failed to write to localStorage:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Service Layer Implementation
// ─────────────────────────────────────────────────────────────
export const financeService = {
  // ─── Products ───
  async getProducts(): Promise<FinanceProduct[]> {
    try {
      const { data, error } = await supabase
        .from("finance_products" as any)
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) return data as unknown as FinanceProduct[];
      
      // If table empty or freshly created, check local or seed
      const local = getLocal<FinanceProduct[]>(STORAGE_KEYS.PRODUCTS, []);
      if (local.length > 0) return local;

      // Seed local storage default
      setLocal(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      return DEFAULT_PRODUCTS;
    } catch {
      const local = getLocal<FinanceProduct[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      return local;
    }
  },

  async createProduct(payload: Omit<FinanceProduct, "id" | "created_at" | "updated_at">): Promise<FinanceProduct> {
    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from("finance_products" as any)
        .insert([{ ...payload, updated_at: now }])
        .select()
        .single();

      if (error) throw error;
      const created = data as unknown as FinanceProduct;

      // Also mirror to local
      const local = getLocal<FinanceProduct[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      setLocal(STORAGE_KEYS.PRODUCTS, [created, ...local]);

      // Create initial stock log if stock > 0
      if (payload.stock > 0) {
        await this.logStockMovement({
          product_id: created.id,
          product_name: created.name,
          type: "in",
          quantity: payload.stock,
          current_stock: payload.stock,
          notes: "Stok awal produk baru",
        });
      }

      return created;
    } catch {
      const id = `prod-${Date.now()}`;
      const newProduct: FinanceProduct = {
        id,
        ...payload,
        created_at: now,
        updated_at: now,
      };
      const local = getLocal<FinanceProduct[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      setLocal(STORAGE_KEYS.PRODUCTS, [newProduct, ...local]);

      if (payload.stock > 0) {
        await this.logStockMovement({
          product_id: newProduct.id,
          product_name: newProduct.name,
          type: "in",
          quantity: payload.stock,
          current_stock: payload.stock,
          notes: "Stok awal produk baru (local)",
        });
      }

      return newProduct;
    }
  },

  async updateProduct(id: string, updates: Partial<FinanceProduct>): Promise<FinanceProduct> {
    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from("finance_products" as any)
        .update({ ...updates, updated_at: now })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      const updated = data as unknown as FinanceProduct;

      const local = getLocal<FinanceProduct[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      setLocal(STORAGE_KEYS.PRODUCTS, local.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch {
      const local = getLocal<FinanceProduct[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
      const existing = local.find((p) => p.id === id);
      if (!existing) throw new Error("Produk tidak ditemukan");
      const updated: FinanceProduct = { ...existing, ...updates, updated_at: now };
      setLocal(STORAGE_KEYS.PRODUCTS, local.map((p) => (p.id === id ? updated : p)));
      return updated;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await supabase.from("finance_products" as any).delete().eq("id", id);
    } catch {
      // ignore
    }
    const local = getLocal<FinanceProduct[]>(STORAGE_KEYS.PRODUCTS, DEFAULT_PRODUCTS);
    setLocal(STORAGE_KEYS.PRODUCTS, local.filter((p) => p.id !== id));
  },

  async adjustStock(
    productId: string,
    delta: number,
    type: "in" | "out" | "adjustment",
    notes?: string
  ): Promise<FinanceProduct> {
    const products = await this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error("Produk tidak ditemukan");

    const newStock = Math.max(0, product.stock + delta);
    const updated = await this.updateProduct(productId, { stock: newStock });

    await this.logStockMovement({
      product_id: productId,
      product_name: product.name,
      type,
      quantity: Math.abs(delta),
      current_stock: newStock,
      notes: notes || (delta > 0 ? "Penambahan stok / kulakan" : "Pengurangan / penyesuaian stok"),
    });

    return updated;
  },

  // ─── Stock Logs ───
  async getStockLogs(productId?: string): Promise<FinanceStockLog[]> {
    try {
      let query = supabase
        .from("finance_stock_logs" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) return data as unknown as FinanceStockLog[];
      
      const local = getLocal<FinanceStockLog[]>(STORAGE_KEYS.STOCK_LOGS, []);
      return productId ? local.filter((l) => l.product_id === productId) : local;
    } catch {
      const local = getLocal<FinanceStockLog[]>(STORAGE_KEYS.STOCK_LOGS, []);
      return productId ? local.filter((l) => l.product_id === productId) : local;
    }
  },

  async logStockMovement(entry: Omit<FinanceStockLog, "id" | "created_at">): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const fullLog: FinanceStockLog = {
      id,
      ...entry,
      created_at: now,
    };

    try {
      await supabase.from("finance_stock_logs" as any).insert([fullLog]);
    } catch {
      // ignore
    }

    const localLogs = getLocal<FinanceStockLog[]>(STORAGE_KEYS.STOCK_LOGS, []);
    setLocal(STORAGE_KEYS.STOCK_LOGS, [fullLog, ...localLogs]);
  },

  // ─── Invoices (POS) ───
  async getInvoices(): Promise<FinanceInvoice[]> {
    try {
      const { data: invoices, error } = await supabase
        .from("finance_invoices" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (invoices && invoices.length > 0) {
        const { data: items } = await supabase
          .from("finance_invoice_items" as any)
          .select("*");

        const itemsMap = (items || []).reduce((acc: any, it: any) => {
          if (!acc[it.invoice_id]) acc[it.invoice_id] = [];
          acc[it.invoice_id].push(it);
          return acc;
        }, {});

        return (invoices as unknown as FinanceInvoice[]).map((inv) => ({
          ...inv,
          items: itemsMap[inv.id] || [],
        }));
      }

      const local = getLocal<FinanceInvoice[]>(STORAGE_KEYS.INVOICES, []);
      return local;
    } catch {
      const local = getLocal<FinanceInvoice[]>(STORAGE_KEYS.INVOICES, []);
      return local;
    }
  },

  async createInvoice(payload: {
    customer_name: string;
    customer_phone?: string;
    ticket_id?: string | null;
    ticket_number?: string | null;
    device_info?: string | null;
    warranty_duration?: number | null;
    warranty_notes?: string | null;
    items: {
      product_id?: string;
      product_name: string;
      purchase_price: number;
      selling_price: number;
      quantity: number;
      is_from_ticket?: boolean;
    }[];
    discount_type: "fixed" | "percent";
    discount_value: number;
    payment_method: "Tunai" | "Transfer" | "QRIS";
    amount_paid: number;
    notes?: string;
  }): Promise<FinanceInvoice> {
    // 1. Calculate totals
    const subtotal = payload.items.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
    const total_hpp = payload.items.reduce((sum, item) => sum + item.purchase_price * item.quantity, 0);

    let total_discount = 0;
    if (payload.discount_type === "percent") {
      total_discount = Math.round((subtotal * (payload.discount_value || 0)) / 100);
    } else {
      total_discount = Math.min(subtotal, payload.discount_value || 0);
    }

    const grand_total = Math.max(0, subtotal - total_discount);
    const amount_paid = payload.payment_method === "Tunai" ? payload.amount_paid : grand_total;
    const change_amount = Math.max(0, amount_paid - grand_total);

    // 2. Generate invoice number: INV-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const invoice_number = `INV-${dateStr}-${randomSeq}`;

    const invoiceId = `inv-${Date.now()}`;
    const invoiceRecord: FinanceInvoice = {
      id: invoiceId,
      invoice_number,
      ticket_id: payload.ticket_id || null,
      ticket_number: payload.ticket_number || null,
      device_info: payload.device_info || null,
      warranty_duration: payload.warranty_duration ?? null,
      warranty_notes: payload.warranty_notes || null,
      date: now.toISOString(),
      customer_name: payload.customer_name?.trim() || "Umum",
      customer_phone: payload.customer_phone?.trim() || null,
      subtotal,
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      total_discount,
      total_hpp,
      grand_total,
      payment_method: payload.payment_method,
      amount_paid,
      change_amount,
      status: "paid",
      notes: payload.notes || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const invoiceItems: FinanceInvoiceItem[] = payload.items.map((item, idx) => ({
      id: `item-${invoiceId}-${idx}`,
      invoice_id: invoiceId,
      product_id: item.product_id || null,
      product_name: item.product_name,
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      quantity: item.quantity,
      subtotal: item.selling_price * item.quantity,
      is_from_ticket: !!item.is_from_ticket,
      created_at: now.toISOString(),
    }));

    invoiceRecord.items = invoiceItems;

    // 3. Persist to Supabase if available
    try {
      const { data: dbInv, error: invErr } = await supabase
        .from("finance_invoices" as any)
        .insert([{
          invoice_number,
          customer_name: invoiceRecord.customer_name,
          customer_phone: invoiceRecord.customer_phone,
          subtotal,
          discount_type: invoiceRecord.discount_type,
          discount_value: invoiceRecord.discount_value,
          total_discount,
          total_hpp,
          grand_total,
          payment_method: invoiceRecord.payment_method,
          amount_paid,
          change_amount,
          status: "paid",
          notes: invoiceRecord.notes,
        }])
        .select()
        .single();

      if (!invErr && dbInv) {
        const dbId = (dbInv as any).id;
        invoiceRecord.id = dbId;
        const itemsToInsert = invoiceItems.map((it) => ({
          invoice_id: dbId,
          product_id: it.product_id,
          product_name: it.product_name,
          purchase_price: it.purchase_price,
          selling_price: it.selling_price,
          quantity: it.quantity,
          subtotal: it.subtotal,
        }));
        await supabase.from("finance_invoice_items" as any).insert(itemsToInsert);
      }
    } catch {
      // Local fallback continues smoothly
    }

    // 4. Anti-Double Deduction:
    // Only deduct stock for items that are NOT from service ticket (spareparts from ticket already deducted by technician!)
    for (const item of payload.items) {
      if (item.product_id && !item.is_from_ticket) {
        try {
          await this.adjustStock(
            item.product_id,
            -item.quantity,
            "sale",
            `Penjualan kasir: ${invoice_number} (${item.quantity} ${item.product_name})`
          );
        } catch (err) {
          console.warn(`Failed to deduct stock for ${item.product_id}:`, err);
        }
      }
    }

    // 5. Anti-Double Billing, Warranty Activation & Auto-Close:
    // If invoice created from service ticket, activate warranty countdown, auto-close ticket to 'Close', and update log
    if (payload.ticket_id) {
      try {
        const { data: orderData } = await supabase
          .from("service_orders")
          .select("id, ticket_number, status, unit_checks, warranty_duration, warranty_notes")
          .eq("id", payload.ticket_id)
          .single();

        const currentChecks = (orderData?.unit_checks || {}) as Record<string, any>;
        const warrantyDuration = payload.warranty_duration !== undefined && payload.warranty_duration !== null
          ? payload.warranty_duration
          : (orderData?.warranty_duration ?? currentChecks._warranty_duration ?? 0);
        const warrantyNotes = payload.warranty_notes !== undefined && payload.warranty_notes !== null
          ? payload.warranty_notes
          : (orderData?.warranty_notes ?? currentChecks._warranty_notes ?? null);

        let warrantyExpiry: string | null = null;
        let warrantyStartDate: string | null = null;

        if (warrantyDuration && warrantyDuration > 0) {
          warrantyStartDate = now.toISOString();
          const exp = new Date(now.getTime() + warrantyDuration * 24 * 60 * 60 * 1000);
          warrantyExpiry = exp.toISOString();
        }

        invoiceRecord.warranty_duration = warrantyDuration;
        invoiceRecord.warranty_start_date = warrantyStartDate;
        invoiceRecord.warranty_end_date = warrantyExpiry;
        invoiceRecord.warranty_notes = warrantyNotes;

        const updatedChecks = {
          ...currentChecks,
          _invoice_status: "invoiced",
          _invoice_id: invoiceRecord.id,
          _invoice_number: invoiceRecord.invoice_number,
          _invoiced_at: now.toISOString(),
          _warranty_duration: warrantyDuration || 0,
          _warranty_unit: "hari",
          _warranty_start_date: warrantyStartDate,
          _warranty_expiry: warrantyExpiry,
          _warranty_notes: warrantyNotes,
        };

        // Otomatis ubah status tiket ke "Close" dan simpan masa garansi
        await supabase
          .from("service_orders")
          .update({
            status: "Close" as any,
            unit_checks: updatedChecks as any,
            final_cost: grand_total,
            warranty_duration: warrantyDuration || 0,
            warranty_unit: "hari",
            warranty_notes: warrantyNotes,
            warranty_expiry: warrantyExpiry,
          })
          .eq("id", payload.ticket_id);

        // Catat riwayat status di service_updates
        const expiryFormatted = warrantyExpiry ? new Date(warrantyExpiry).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";
        await supabase.from("service_updates").insert({
          order_id: payload.ticket_id,
          status: "Close" as any,
          description: `Nota lunas diterbitkan oleh Finance (No. Nota: ${invoiceRecord.invoice_number}). Unit telah diambil & status ditutup. ${
            warrantyDuration > 0
              ? `Masa garansi ${warrantyDuration} hari aktif mulai sekarang s/d ${expiryFormatted}.`
              : "Layanan ini Tanpa Garansi."
          }`,
        });
      } catch (err) {
        console.warn("Failed to mark service order as invoiced & Close in Supabase:", err);
      }

      // Also mark local ticket cache
      const localTicketsKey = "zs_unbilled_tickets_cache";
      try {
        const localCached = JSON.parse(localStorage.getItem(localTicketsKey) || "{}");
        localCached[payload.ticket_id] = {
          status: "invoiced",
          invoice_number,
          invoiced_at: now.toISOString(),
        };
        localStorage.setItem(localTicketsKey, JSON.stringify(localCached));
      } catch {
        // ignore
      }
    }

    // 6. Save to local storage
    const localInvoices = getLocal<FinanceInvoice[]>(STORAGE_KEYS.INVOICES, []);
    setLocal(STORAGE_KEYS.INVOICES, [invoiceRecord, ...localInvoices]);

    return invoiceRecord;
  },

  async voidInvoice(id: string, reason?: string): Promise<void> {
    const invoices = await this.getInvoices();
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) throw new Error("Nota tidak ditemukan");
    if (invoice.status === "void") throw new Error("Nota ini sudah dibatalkan sebelumnya");

    const now = new Date().toISOString();

    // 1. Restore Stock ONLY for items that were retail (not from ticket, since ticket parts are managed on the ticket)
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        if (item.product_id && !item.is_from_ticket) {
          try {
            await this.adjustStock(
              item.product_id,
              item.quantity,
              "void_return",
              `Pengembalian stok pembatalan nota: ${invoice.invoice_number} (${item.quantity} ${item.product_name})`
            );
          } catch (err) {
            console.warn(`Failed to restore stock for ${item.product_id}:`, err);
          }
        }
      }
    }

    // 2. If invoice was from a ticket, restore ticket status back to "Siap diAmbil" and reset warranty countdown
    if (invoice.ticket_id) {
      try {
        const { data: orderData } = await supabase
          .from("service_orders")
          .select("id, unit_checks")
          .eq("id", invoice.ticket_id)
          .single();

        const currentChecks = (orderData?.unit_checks || {}) as Record<string, any>;
        const updatedChecks = {
          ...currentChecks,
          _invoice_status: "unbilled",
          _invoice_id: null,
          _invoice_number: null,
          _voided_at: now,
          _warranty_start_date: null,
          _warranty_expiry: null,
        };

        await supabase
          .from("service_orders")
          .update({
            status: "Siap diAmbil" as any,
            unit_checks: updatedChecks as any,
            warranty_expiry: null,
          })
          .eq("id", invoice.ticket_id);

        await supabase.from("service_updates").insert({
          order_id: invoice.ticket_id,
          status: "Siap diAmbil" as any,
          description: `Nota pembayaran ${invoice.invoice_number} dibatalkan (Void) oleh Finance. Status tiket dikembalikan ke Siap diAmbil dan hitung mundur garansi di-reset.`,
        });
      } catch (err) {
        console.warn("Failed to unmark ticket invoice status in Supabase:", err);
      }

      // Also revert local ticket cache
      const localTicketsKey = "zs_unbilled_tickets_cache";
      try {
        const localCached = JSON.parse(localStorage.getItem(localTicketsKey) || "{}");
        delete localCached[invoice.ticket_id];
        localStorage.setItem(localTicketsKey, JSON.stringify(localCached));
      } catch {
        // ignore
      }
    }

    // 3. Update status in Supabase
    try {
      await supabase
        .from("finance_invoices" as any)
        .update({
          status: "void",
          void_reason: reason || "Dibatalkan oleh staf",
          void_at: now,
          updated_at: now,
        })
        .eq("id", id);
    } catch {
      // local fallback
    }

    // 4. Update local storage
    const updatedInvoices = invoices.map((inv) =>
      inv.id === id
        ? {
            ...inv,
            status: "void" as const,
            void_reason: reason || "Dibatalkan oleh staf",
            void_at: now,
            updated_at: now,
          }
        : inv
    );
    setLocal(STORAGE_KEYS.INVOICES, updatedInvoices);
  },

  // ─── Ticket Sparepart Management (Dashboard Teknisi & Service Billing) ───
  getTicketSpareparts(order: any): TicketSparepart[] {
    if (!order) return [];
    const checks = (order.unit_checks || {}) as Record<string, any>;
    return (checks._used_spareparts || []) as TicketSparepart[];
  },

  async addSparepartToTicket(
    order: { id: string; ticket_number: string; unit_checks?: any },
    product: FinanceProduct,
    quantity: number,
    userId?: string
  ): Promise<TicketSparepart[]> {
    if (quantity <= 0) throw new Error("Jumlah kuantitas harus minimal 1");
    if (product.stock < quantity) {
      throw new Error(`Stok tidak mencukupi. Sisa stok tersedia: ${product.stock} ${product.unit}`);
    }

    // 1. Deduct stock from inventory
    await this.adjustStock(
      product.id,
      -quantity,
      "out",
      `Terpakai oleh teknisi di Tiket Servis #${order.ticket_number} (${quantity} ${product.name})`
    );

    // 2. Prepare sparepart record
    const newPart: TicketSparepart = {
      id: `tsp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku || null,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      quantity,
      added_at: new Date().toISOString(),
      added_by: userId,
    };

    const currentChecks = (order.unit_checks || {}) as Record<string, any>;
    const currentParts = (currentChecks._used_spareparts || []) as TicketSparepart[];
    const updatedParts = [...currentParts, newPart];

    const updatedChecks = {
      ...currentChecks,
      _used_spareparts: updatedParts,
    };

    // 3. Persist to service_orders
    try {
      await supabase
        .from("service_orders")
        .update({ unit_checks: updatedChecks as any })
        .eq("id", order.id);
    } catch (err) {
      console.warn("Failed to persist sparepart to service_orders in Supabase:", err);
    }

    return updatedParts;
  },

  async removeSparepartFromTicket(
    order: { id: string; ticket_number: string; unit_checks?: any },
    sparepartId: string
  ): Promise<TicketSparepart[]> {
    const currentChecks = (order.unit_checks || {}) as Record<string, any>;
    const currentParts = (currentChecks._used_spareparts || []) as TicketSparepart[];
    const partToRemove = currentParts.find((p) => p.id === sparepartId);

    if (!partToRemove) return currentParts;

    // 1. Restore stock to inventory
    await this.adjustStock(
      partToRemove.product_id,
      partToRemove.quantity,
      "in",
      `Dibatalkan/dihapus dari Tiket Servis #${order.ticket_number} (${partToRemove.quantity} ${partToRemove.product_name})`
    );

    // 2. Remove from ticket
    const updatedParts = currentParts.filter((p) => p.id !== sparepartId);
    const updatedChecks = {
      ...currentChecks,
      _used_spareparts: updatedParts,
    };

    // 3. Persist to service_orders
    try {
      await supabase
        .from("service_orders")
        .update({ unit_checks: updatedChecks as any })
        .eq("id", order.id);
    } catch (err) {
      console.warn("Failed to update spareparts on service_orders:", err);
    }

    return updatedParts;
  },

  async saveTicketServiceAction(
    order: { id: string; unit_checks?: any },
    actionNote: string,
    laborCost: number
  ): Promise<void> {
    const currentChecks = (order.unit_checks || {}) as Record<string, any>;
    const updatedChecks = {
      ...currentChecks,
      _technician_action_note: actionNote.trim(),
      _service_labor_cost: laborCost >= 0 ? laborCost : 0,
    };

    try {
      await supabase
        .from("service_orders")
        .update({
          unit_checks: updatedChecks as any,
          estimated_cost: laborCost >= 0 ? laborCost : 0,
        })
        .eq("id", order.id);
    } catch (err) {
      console.warn("Failed to save service action note on ticket:", err);
    }
  },

  async restoreCancelledTicketSpareparts(order: any): Promise<void> {
    if (!order) return;
    const checks = (order.unit_checks || {}) as Record<string, any>;
    const parts = (checks._used_spareparts || []) as TicketSparepart[];
    if (!parts || parts.length === 0) return;

    for (const part of parts) {
      if (part.product_id) {
        try {
          await this.adjustStock(
            part.product_id,
            part.quantity,
            "in",
            `Pengembalian stok pembatalan tiket servis #${order.ticket_number} (${part.quantity} ${part.product_name})`
          );
        } catch (err) {
          console.warn(`Failed to return stock for cancelled ticket item ${part.product_id}:`, err);
        }
      }
    }

    const updatedChecks = {
      ...checks,
      _used_spareparts: [],
    };

    try {
      await supabase
        .from("service_orders")
        .update({ unit_checks: updatedChecks as any })
        .eq("id", order.id);
    } catch {
      // ignore
    }
  },

  async getUnbilledServiceOrders(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .in("status", ["Siap diAmbil", "Selesai"])
        .order("updated_at", { ascending: false });

      if (error) throw error;
      if (!data) return [];

      // Filter only unbilled orders
      const unbilled = data.filter((order) => {
        const checks = (order.unit_checks || {}) as Record<string, any>;
        return checks._invoice_status !== "invoiced";
      });

      return unbilled;
    } catch (err) {
      console.warn("Failed to fetch unbilled service orders from Supabase:", err);
      return [];
    }
  },

  // ─── Expenses ───
  async getExpenses(): Promise<FinanceExpense[]> {
    try {
      const { data, error } = await supabase
        .from("finance_expenses" as any)
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) return data as unknown as FinanceExpense[];

      const local = getLocal<FinanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      return local;
    } catch {
      const local = getLocal<FinanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      return local;
    }
  },

  async createExpense(payload: Omit<FinanceExpense, "id" | "created_at" | "updated_at">): Promise<FinanceExpense> {
    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from("finance_expenses" as any)
        .insert([{ ...payload, updated_at: now }])
        .select()
        .single();

      if (error) throw error;
      const created = data as unknown as FinanceExpense;

      const local = getLocal<FinanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      setLocal(STORAGE_KEYS.EXPENSES, [created, ...local]);
      return created;
    } catch {
      const id = `exp-${Date.now()}`;
      const newExpense: FinanceExpense = {
        id,
        ...payload,
        created_at: now,
        updated_at: now,
      };
      const local = getLocal<FinanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      setLocal(STORAGE_KEYS.EXPENSES, [newExpense, ...local]);
      return newExpense;
    }
  },

  async updateExpense(id: string, updates: Partial<FinanceExpense>): Promise<FinanceExpense> {
    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from("finance_expenses" as any)
        .update({ ...updates, updated_at: now })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      const updated = data as unknown as FinanceExpense;

      const local = getLocal<FinanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      setLocal(STORAGE_KEYS.EXPENSES, local.map((e) => (e.id === id ? updated : e)));
      return updated;
    } catch {
      const local = getLocal<FinanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
      const existing = local.find((e) => e.id === id);
      if (!existing) throw new Error("Pengeluaran tidak ditemukan");
      const updated: FinanceExpense = { ...existing, ...updates, updated_at: now };
      setLocal(STORAGE_KEYS.EXPENSES, local.map((e) => (e.id === id ? updated : e)));
      return updated;
    }
  },

  async deleteExpense(id: string): Promise<void> {
    try {
      await supabase.from("finance_expenses" as any).delete().eq("id", id);
    } catch {
      // ignore
    }
    const local = getLocal<FinanceExpense[]>(STORAGE_KEYS.EXPENSES, []);
    setLocal(STORAGE_KEYS.EXPENSES, local.filter((e) => e.id !== id));
  },
};
