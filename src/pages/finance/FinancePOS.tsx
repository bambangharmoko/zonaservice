import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  financeService,
  FinanceProduct,
  FinanceInvoice,
  FinanceInvoiceItem,
  TicketSparepart,
} from "@/services/financeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Receipt,
  RotateCcw,
  CheckCircle,
  XCircle,
  DollarSign,
  User,
  Phone,
  CreditCard,
  QrCode,
  Banknote,
  Package,
  Layers,
  History,
  AlertCircle,
  Wrench,
  X,
  Laptop,
  Check,
  Tag,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface CartItem {
  id: string;
  product_id?: string;
  product_name: string;
  sku?: string | null;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  max_stock?: number;
  unit?: string;
  is_from_ticket?: boolean;
  is_service_labor?: boolean;
  product?: FinanceProduct;
}

export default function FinancePOS() {
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [products, setProducts] = useState<FinanceProduct[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Service Ticket Integration State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [selectedTicketWarranty, setSelectedTicketWarranty] = useState<{ duration: number; notes: string }>({ duration: 0, notes: "" });
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [unbilledTickets, setUnbilledTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");

  // Checkout states
  const [customerName, setCustomerName] = useState("Umum");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"Tunai" | "Transfer" | "QRIS">("Tunai");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dialog states
  const [printedInvoice, setPrintedInvoice] = useState<FinanceInvoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<FinanceInvoice | null>(null);
  const [voidTarget, setVoidTarget] = useState<FinanceInvoice | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [prodData, invData] = await Promise.all([
        financeService.getProducts(),
        financeService.getInvoices(),
      ]);
      setProducts(prodData);
      setInvoices(invData);
    } catch (err) {
      console.error("Failed to load POS data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["Semua", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "Semua" || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchProduct]);

  // Load Unbilled Tickets for selection
  const handleOpenTicketModal = async () => {
    setTicketModalOpen(true);
    setLoadingTickets(true);
    try {
      const orders = await financeService.getUnbilledServiceOrders();
      setUnbilledTickets(orders);
    } catch (err) {
      console.error("Failed to load unbilled tickets:", err);
      toast.error("Gagal memuat daftar tiket servis");
    } finally {
      setLoadingTickets(false);
    }
  };

  // Select a service ticket to bill
  const handleSelectTicket = (order: any) => {
    setSelectedTicket(order);
    setTicketModalOpen(false);

    // Auto-fill customer info
    if (order.customer_name) setCustomerName(order.customer_name);
    if (order.customer_phone) setCustomerPhone(order.customer_phone);

    const checks = (order.unit_checks || {}) as Record<string, any>;
    const parts = (checks._used_spareparts || []) as TicketSparepart[];
    const techActionNote = checks._technician_action_note || "";
    const techLaborCost = Number(checks._service_labor_cost ?? order.estimated_cost ?? order.final_cost ?? 0);
    const deviceName = [order.device_type, order.device_brand, order.device_model]
      .filter(Boolean)
      .join(" ");

    // Simpan masa garansi tiket yang ditentukan teknisi
    const dur = typeof order.warranty_duration === "number"
      ? order.warranty_duration
      : Number(checks._warranty_duration ?? 0);
    const wNotes = order.warranty_notes || checks._warranty_notes || "";
    setSelectedTicketWarranty({ duration: dur, notes: wNotes });

    const newTicketItems: CartItem[] = [];

    // 1. Service Labor item (HPP = Rp 0, selling price editable)
    const laborTitle = techActionNote
      ? `Jasa Servis: ${techActionNote}`
      : `Jasa Servis - Tiket #${order.ticket_number}${deviceName ? ` (${deviceName})` : ""}`;

    newTicketItems.push({
      id: `labor-${order.id}`,
      product_name: laborTitle,
      purchase_price: 0, // PRD: Jasa murni HPP = Rp 0
      selling_price: techLaborCost > 0 ? techLaborCost : 0,
      quantity: 1,
      is_service_labor: true,
    });

    // 2. Spareparts recorded by technician (is_from_ticket: true)
    parts.forEach((p) => {
      newTicketItems.push({
        id: `part-${p.id}`,
        product_id: p.product_id,
        product_name: p.product_name,
        sku: p.sku,
        purchase_price: p.purchase_price,
        selling_price: p.selling_price,
        quantity: p.quantity,
        is_from_ticket: true,
      });
    });

    // Keep retail items if already present in cart
    const existingRetailItems = cart.filter((item) => !item.is_service_labor && !item.is_from_ticket);
    setCart([...newTicketItems, ...existingRetailItems]);

    toast.success(`Tiket #${order.ticket_number} berhasil dimuat ke kasir!`);
  };

  // Detach selected ticket
  const handleDetachTicket = () => {
    setSelectedTicket(null);
    setSelectedTicketWarranty({ duration: 0, notes: "" });
    setCart(cart.filter((item) => !item.is_service_labor && !item.is_from_ticket));
    toast.info("Tiket servis dilepas dari kasir");
  };

  // Cart operations with Stock Validation
  const addToCart = (product: FinanceProduct) => {
    const existing = cart.find((item) => item.product_id === product.id && !item.is_from_ticket);
    const currentQty = existing ? existing.quantity : 0;

    // Check available stock
    if (product.stock <= 0) {
      toast.error(`Stok "${product.name}" habis!`);
      return;
    }

    if (currentQty + 1 > product.stock) {
      toast.error(`Maksimal stok tersedia hanya ${product.stock} ${product.unit}`);
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: `retail-${product.id}-${Date.now()}`,
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          purchase_price: product.purchase_price,
          selling_price: product.selling_price,
          quantity: 1,
          max_stock: product.stock,
          unit: product.unit,
          is_from_ticket: false,
          product,
        },
      ]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const existing = cart.find((item) => item.id === itemId);
    if (!existing) return;

    if (existing.is_service_labor) {
      // Labor quantity stays 1
      return;
    }

    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    if (existing.max_stock !== undefined && newQty > existing.max_stock) {
      toast.error(`Maksimal stok tersedia hanya ${existing.max_stock} ${existing.unit || "item"}`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const updateLaborPrice = (itemId: string, newPrice: number) => {
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, selling_price: Math.max(0, newPrice) } : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedTicket(null);
    setSelectedTicketWarranty({ duration: 0, notes: "" });
    setCustomerName("Umum");
    setCustomerPhone("");
    setDiscountValue(0);
    setAmountPaid(0);
    setNotes("");
  };

  // Calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    if (discountType === "percent") {
      return Math.round((subtotal * (discountValue || 0)) / 100);
    }
    return Math.min(subtotal, discountValue || 0);
  }, [subtotal, discountType, discountValue]);

  const grandTotal = Math.max(0, subtotal - discountAmount);
  const changeAmount = paymentMethod === "Tunai" ? Math.max(0, amountPaid - grandTotal) : 0;

  // Handle Quick Cash Buttons
  const setQuickCash = (amount: number) => {
    setAmountPaid(amount);
  };

  // Submit Invoice (with Anti-Double Deduction & Anti-Double Billing)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang belanja masih kosong!");
      return;
    }

    if (paymentMethod === "Tunai" && amountPaid < grandTotal) {
      toast.error("Nominal uang yang dibayarkan masih kurang!");
      return;
    }

    setSubmitting(true);
    try {
      const deviceName = selectedTicket
        ? [selectedTicket.device_type, selectedTicket.device_brand, selectedTicket.device_model]
            .filter(Boolean)
            .join(" ")
        : null;

      const newInvoice = await financeService.createInvoice({
        customer_name: customerName,
        customer_phone: customerPhone,
        ticket_id: selectedTicket ? selectedTicket.id : null,
        ticket_number: selectedTicket ? selectedTicket.ticket_number : null,
        device_info: deviceName,
        warranty_duration: selectedTicket ? selectedTicketWarranty.duration : null,
        warranty_notes: selectedTicket ? selectedTicketWarranty.notes : null,
        items: cart.map((item) => ({
          product_id: item.product_id || null,
          product_name: item.product_name,
          purchase_price: item.purchase_price,
          selling_price: item.selling_price,
          quantity: item.quantity,
          is_from_ticket: !!item.is_from_ticket,
        })),
        discount_type: discountType,
        discount_value: discountValue,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === "Tunai" ? amountPaid : grandTotal,
        notes: notes || (selectedTicket ? `Tiket Servis #${selectedTicket.ticket_number}` : undefined),
      });

      toast.success(`Nota ${newInvoice.invoice_number} berhasil dibuat!`);
      setPrintedInvoice(newInvoice);
      clearCart();
      await loadData();
    } catch (err) {
      console.error("Checkout failed:", err);
      toast.error("Gagal memproses transaksi nota");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Void
  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    setVoidLoading(true);
    try {
      await financeService.voidInvoice(voidTarget.id, voidReason);
      toast.success(`Nota ${voidTarget.invoice_number} berhasil dibatalkan. Stok barang telah dikembalikan!`);
      setVoidTarget(null);
      setVoidReason("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal membatalkan nota");
    } finally {
      setVoidLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filter history
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoice_number.toLowerCase().includes(historySearch.toLowerCase()) ||
        inv.customer_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        (inv.ticket_number && inv.ticket_number.toLowerCase().includes(historySearch.toLowerCase()));
      return matchSearch;
    });
  }, [invoices, historySearch]);

  // Filter tickets in modal
  const filteredUnbilledTickets = useMemo(() => {
    return unbilledTickets.filter((t) => {
      const q = ticketSearch.toLowerCase();
      const num = (t.ticket_number || "").toLowerCase();
      const cust = (t.customer_name || "").toLowerCase();
      const brand = (t.device_brand || "").toLowerCase();
      const model = (t.device_model || "").toLowerCase();
      return num.includes(q) || cust.includes(q) || brand.includes(q) || model.includes(q);
    });
  }, [unbilledTickets, ticketSearch]);

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Top Header & Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kasir & Buat Nota</h1>
            <p className="text-sm text-muted-foreground">
              Antarmuka transaksi kasir cepat (Point of Sale) & penarikan nota tiket servis
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action: Ambil dari Tiket Servis */}
            <Button
              onClick={handleOpenTicketModal}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 gap-1.5 shadow-sm font-semibold"
            >
              <Wrench className="h-4 w-4" />
              <span>Pilih dari Tiket Servis</span>
            </Button>

            <div className="flex items-center p-1 bg-muted rounded-lg border border-border text-xs font-medium">
              <button
                onClick={() => setActiveTab("pos")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "pos"
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Receipt className="h-4 w-4" />
                <span>Kasir (POS)</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "history"
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-4 w-4" />
                <span>Riwayat Nota ({invoices.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: KASIR / POS */}
        {activeTab === "pos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT SIDE: Product Catalog & Search (7 Cols) */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari barang atau kode SKU..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                        selectedCategory === cat
                          ? "bg-emerald-600/15 border-emerald-500/50 text-emerald-400 font-semibold"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                {filteredProducts.map((prod) => {
                  const isOutOfStock = prod.stock <= 0;
                  const inCartItem = cart.find((item) => item.product_id === prod.id && !item.is_from_ticket);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToCart(prod)}
                      className={`relative p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed bg-muted/30 border-border"
                          : "cursor-pointer bg-card hover:border-emerald-500/60 hover:shadow-md hover:bg-emerald-500/5 border-border/80"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/60">
                            {prod.category}
                          </Badge>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              prod.stock <= prod.min_stock
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}
                          >
                            Stok: {prod.stock}
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-tight">
                          {prod.name}
                        </h4>
                        {prod.sku && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            {prod.sku}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-emerald-400">
                          {formatRupiah(prod.selling_price)}
                        </span>
                        {inCartItem && (
                          <Badge className="bg-emerald-600 text-white text-[10px] h-5 px-1.5">
                            {inCartItem.quantity} di keranjang
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE: Cart & Payment Checkout (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-border/80 shadow-md">
                <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-base font-bold">Keranjang Nota</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCart}
                        className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                      >
                        Kosongkan
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5">
                  {/* Attached Ticket Banner */}
                  {selectedTicket && (
                    <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Wrench className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-purple-400 font-mono">
                              #{selectedTicket.ticket_number}
                            </span>
                            <Badge variant="outline" className="text-[9px] bg-purple-500/20 text-purple-300 border-none px-1.5 py-0">
                              {selectedTicket.status}
                            </Badge>
                            {selectedTicketWarranty.duration > 0 ? (
                              <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-1.5 py-0">
                                Garansi: {selectedTicketWarranty.duration} Hari
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground border-border px-1.5 py-0">
                                Tanpa Garansi
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground font-medium truncate mt-0.5">
                            {[selectedTicket.device_type, selectedTicket.device_brand, selectedTicket.device_model]
                              .filter(Boolean)
                              .join(" ") || "Perangkat Servis"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Pelanggan: {selectedTicket.customer_name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDetachTicket}
                        className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-rose-400 shrink-0"
                        title="Lepas Tiket dari Nota"
                      >
                        <X className="h-3.5 w-3.5 mr-0.5" /> Lepas
                      </Button>
                    </div>
                  )}

                  {/* Cart Items List */}
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg space-y-2">
                      <Package className="h-8 w-8 mx-auto opacity-40" />
                      <p className="text-xs">
                        Klik barang di sebelah kiri untuk penjualan retail, atau tarik data dari tiket servis
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenTicketModal}
                        className="text-xs gap-1.5 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Pilih Tiket Servis</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                            item.is_service_labor
                              ? "bg-purple-500/5 border-purple-500/30"
                              : item.is_from_ticket
                              ? "bg-cyan-500/5 border-cyan-500/30"
                              : "bg-muted/40 border-border/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-foreground truncate">
                                  {item.product_name}
                                </span>
                                {item.is_service_labor && (
                                  <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 text-[9px] px-1.5 py-0">
                                    Jasa Servis
                                  </Badge>
                                )}
                                {item.is_from_ticket && (
                                  <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 text-[9px] px-1.5 py-0" title="Stok sudah terpotong oleh teknisi pada pengerjaan tiket">
                                    Bawaan Tiket
                                  </Badge>
                                )}
                              </div>
                              {item.sku && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  SKU: {item.sku}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center shrink-0"
                              title="Hapus dari nota"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px]">
                            {/* Price display / edit for labor */}
                            {item.is_service_labor ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">Biaya Jasa:</span>
                                <div className="flex items-center">
                                  <span className="text-muted-foreground mr-1 text-[10px]">Rp</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.selling_price || ""}
                                    onChange={(e) => updateLaborPrice(item.id, Number(e.target.value) || 0)}
                                    placeholder="0"
                                    className="h-6 text-xs w-28 px-1.5 font-bold text-foreground"
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                {formatRupiah(item.selling_price)} x {item.quantity} ={" "}
                                <strong className="text-foreground">
                                  {formatRupiah(item.selling_price * item.quantity)}
                                </strong>
                              </span>
                            )}

                            {/* Quantity controls */}
                            {!item.is_service_labor && (
                              <div className="flex items-center gap-1 shrink-0">
                                {!item.is_from_ticket ? (
                                  <>
                                    <button
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="h-5 w-5 rounded bg-card hover:bg-muted border flex items-center justify-center text-muted-foreground"
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                                    <button
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="h-5 w-5 rounded bg-card hover:bg-muted border flex items-center justify-center text-muted-foreground"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] font-semibold text-cyan-300">
                                    Qty: {item.quantity}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customer Information Form */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <User className="h-3 w-3" /> Pelanggan
                        </label>
                        <Input
                          placeholder="Nama Pelanggan (Umum)"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mb-1">
                          <Phone className="h-3 w-3" /> No. HP / WhatsApp
                        </label>
                        <Input
                          placeholder="081234..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Discount & Payment Method */}
                  <div className="space-y-2.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Diskon</label>
                      <div className="flex items-center gap-1.5 w-44">
                        <div className="flex p-0.5 bg-muted rounded border text-[10px]">
                          <button
                            type="button"
                            onClick={() => setDiscountType("fixed")}
                            className={`px-2 py-0.5 rounded ${
                              discountType === "fixed" ? "bg-background font-bold shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            Rp
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType("percent")}
                            className={`px-2 py-0.5 rounded ${
                              discountType === "percent" ? "bg-background font-bold shadow-sm" : "text-muted-foreground"
                            }`}
                          >
                            %
                          </button>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          value={discountValue || ""}
                          onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-xs text-right"
                        />
                      </div>
                    </div>

                    {/* Metode Pembayaran */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Metode Pembayaran
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod("Tunai");
                            if (amountPaid === 0) setAmountPaid(grandTotal);
                          }}
                          className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                            paymentMethod === "Tunai"
                              ? "bg-emerald-600/15 border-emerald-500 text-emerald-400 font-bold"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Banknote className="h-3.5 w-3.5" /> Tunai
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("Transfer")}
                          className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                            paymentMethod === "Transfer"
                              ? "bg-emerald-600/15 border-emerald-500 text-emerald-400 font-bold"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("QRIS")}
                          className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                            paymentMethod === "QRIS"
                              ? "bg-emerald-600/15 border-emerald-500 text-emerald-400 font-bold"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <QrCode className="h-3.5 w-3.5" /> QRIS
                        </button>
                      </div>
                    </div>

                    {/* Cash Payment Inputs */}
                    {paymentMethod === "Tunai" && (
                      <div className="space-y-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-muted-foreground">Uang Diterima</label>
                          <Input
                            type="number"
                            min={0}
                            value={amountPaid || ""}
                            onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                            placeholder="0"
                            className="h-8 text-xs text-right w-40 font-bold"
                          />
                        </div>

                        {/* Quick Cash Buttons */}
                        <div className="flex flex-wrap gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setQuickCash(grandTotal)}
                            className="px-2 py-1 rounded bg-card hover:bg-muted border text-[10px] text-muted-foreground font-medium"
                          >
                            Uang Pas
                          </button>
                          {[50000, 100000, 200000, 500000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setQuickCash(amt)}
                              className="px-2 py-1 rounded bg-card hover:bg-muted border text-[10px] text-muted-foreground"
                            >
                              {(amt / 1000).toFixed(0)}k
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs">
                          <span className="text-muted-foreground font-medium">Kembalian:</span>
                          <span
                            className={`font-bold ${
                              amountPaid >= grandTotal ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {amountPaid >= grandTotal
                              ? formatRupiah(changeAmount)
                              : `Kurang ${formatRupiah(grandTotal - amountPaid)}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Totals */}
                  <div className="space-y-1.5 pt-3 border-t border-border/80 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatRupiah(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Diskon</span>
                        <span>-{formatRupiah(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-extrabold pt-2 border-t text-foreground">
                      <span>Grand Total</span>
                      <span className="text-emerald-400">{formatRupiah(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || submitting || (paymentMethod === "Tunai" && amountPaid < grandTotal)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-sm shadow-md transition-all gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{submitting ? "Memproses Transaksi..." : "Selesaikan & Cetak Nota"}</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: RIWAYAT NOTA & VOID */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari no. nota, pelanggan, atau tiket..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <Card className="border-border/60">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                      <tr>
                        <th className="py-3 px-4">Nomor Nota</th>
                        <th className="py-3 px-4">Tanggal & Waktu</th>
                        <th className="py-3 px-4">Pelanggan & Unit</th>
                        <th className="py-3 px-4">Metode</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            Belum ada riwayat nota transaksi
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-mono font-bold text-emerald-400">
                                {inv.invoice_number}
                              </p>
                              {inv.ticket_number ? (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/40 text-purple-400 bg-purple-500/10 mt-0.5">
                                  Tiket #{inv.ticket_number}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground border-border mt-0.5">
                                  Retail
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {format(parseISO(inv.date || inv.created_at), "dd MMM yyyy, HH:mm", {
                                locale: idLocale,
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-foreground">{inv.customer_name}</p>
                              {inv.device_info && (
                                <p className="text-[10px] text-muted-foreground truncate">{inv.device_info}</p>
                              )}
                              {inv.customer_phone && !inv.device_info && (
                                <p className="text-[10px] text-muted-foreground">{inv.customer_phone}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium">{inv.payment_method}</td>
                            <td className="py-3 px-4 text-right font-bold text-foreground">
                              {formatRupiah(inv.grand_total)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {inv.status === "paid" ? (
                                <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                  Lunas
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px]" title={inv.void_reason || ""}>
                                  Dibatalkan (Void)
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPrintedInvoice(inv)}
                                  className="h-7 px-2 text-xs gap-1"
                                  title="Cetak Struk"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>Cetak</span>
                                </Button>
                                {inv.status === "paid" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setVoidTarget(inv)}
                                    className="h-7 px-2 text-xs gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/30"
                                    title="Batalkan Nota & Kembalikan Stok"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Void</span>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DIALOG: PILIH DARI TIKET SERVIS */}
        <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-purple-400" />
                Pilih Tiket Servis untuk Dibuatkan Nota
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nomor tiket, nama pelanggan, atau tipe perangkat..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-2">
                {loadingTickets ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    Memuat data tiket servis yang telah selesai...
                  </div>
                ) : filteredUnbilledTickets.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                    <Laptop className="h-8 w-8 mx-auto mb-2 opacity-40 text-purple-400" />
                    <p className="font-medium text-foreground">Tidak ada tiket servis yang siap dibuatkan nota</p>
                    <p className="text-muted-foreground mt-0.5">
                      Tiket harus berstatus "Selesai", "Siap diAmbil", atau "Close" dan belum pernah dibuatkan nota lunas.
                    </p>
                  </div>
                ) : (
                  filteredUnbilledTickets.map((ticket) => {
                    const checks = (ticket.unit_checks || {}) as Record<string, any>;
                    const parts = (checks._used_spareparts || []) as TicketSparepart[];
                    const techActionNote = checks._technician_action_note || "";
                    const laborCost = Number(checks._service_labor_cost ?? ticket.estimated_cost ?? ticket.final_cost ?? 0);
                    const deviceName = [ticket.device_type, ticket.device_brand, ticket.device_model]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div
                        key={ticket.id}
                        className="p-3 rounded-lg border border-border/80 hover:border-purple-500/60 hover:bg-purple-500/5 transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-400 text-sm">
                              #{ticket.ticket_number}
                            </span>
                            <Badge className="text-[10px] bg-purple-500/20 text-purple-300 border-none px-2 py-0">
                              {ticket.status}
                            </Badge>
                          </div>

                          <div className="font-semibold text-foreground text-xs">
                            {ticket.customer_name} {ticket.customer_phone ? `(${ticket.customer_phone})` : ""}
                          </div>

                          <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-foreground">{deviceName || "Perangkat"}</span>
                            {ticket.problem_description && (
                              <span>• Keluhan: {ticket.problem_description}</span>
                            )}
                          </div>

                          {/* Technician Notes & Parts Summary */}
                          {(techActionNote || parts.length > 0 || laborCost > 0 || ticket.warranty_duration || checks._warranty_duration) && (
                            <div className="pt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
                              {techActionNote && (
                                <span className="bg-muted px-2 py-0.5 rounded text-foreground font-medium">
                                  Tindakan: {techActionNote}
                                </span>
                              )}
                              {parts.length > 0 && (
                                <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300 bg-cyan-500/10">
                                  {parts.length} Sparepart Terpasang
                                </Badge>
                              )}
                              {laborCost > 0 && (
                                <span className="text-emerald-400 font-bold">
                                  Estimasi Jasa: {formatRupiah(laborCost)}
                                </span>
                              )}
                              {(() => {
                                const wDur = typeof ticket.warranty_duration === "number" ? ticket.warranty_duration : (checks._warranty_duration ?? 0);
                                return (
                                  <Badge variant="outline" className={`text-[10px] ${wDur > 0 ? "border-purple-500/40 text-purple-300 bg-purple-500/10" : "border-border text-muted-foreground"}`}>
                                    {wDur > 0 ? `Garansi: ${wDur} Hari` : "Tanpa Garansi"}
                                  </Badge>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleSelectTicket(ticket)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs shrink-0 gap-1.5 font-semibold h-8"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Pilih Tiket Ini</span>
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setTicketModalOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: CETAK STRUK / NOTA MINIMALIS */}
        <Dialog open={!!printedInvoice} onOpenChange={(open) => !open && setPrintedInvoice(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-400" />
                Struk Nota Transaksi
              </DialogTitle>
            </DialogHeader>

            {printedInvoice && (
              <div ref={printAreaRef} className="space-y-4 py-2 text-foreground font-mono text-xs">
                {/* Header Struk */}
                <div className="text-center pb-3 border-b border-dashed border-border space-y-1">
                  <h3 className="font-extrabold text-base tracking-wider">ZONA SERVICE</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Jl. Ahmad Yani No.118, Balikpapan
                  </p>
                  <p className="text-[10px] text-muted-foreground">Telp / WA: 0811-540-4999</p>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Nota:</span>
                    <span className="font-bold">{printedInvoice.invoice_number}</span>
                  </div>
                  {printedInvoice.ticket_number && (
                    <div className="flex justify-between text-purple-400 font-bold">
                      <span>Ref. Tiket Servis:</span>
                      <span>#{printedInvoice.ticket_number}</span>
                    </div>
                  )}
                  {printedInvoice.device_info && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Perangkat / Unit:</span>
                      <span className="font-medium text-foreground">{printedInvoice.device_info}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal:</span>
                    <span>
                      {format(parseISO(printedInvoice.date || printedInvoice.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pelanggan:</span>
                    <span>{printedInvoice.customer_name}</span>
                  </div>
                  {printedInvoice.status === "void" && (
                    <div className="p-1 rounded bg-rose-500/20 text-rose-400 text-center font-bold text-xs mt-1">
                      *** NOTA TELAH DIBATALKAN (VOID) ***
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5 py-1">
                  {(printedInvoice.items || []).map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-medium flex items-center justify-between">
                        <span>{item.product_name}</span>
                        {item.is_from_ticket && (
                          <span className="text-[9px] text-cyan-400 font-normal">[Sparepart Servis]</span>
                        )}
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          {item.quantity} x {formatRupiah(item.selling_price)}
                        </span>
                        <span className="text-foreground font-bold">{formatRupiah(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 pt-2 border-t border-dashed border-border text-[11px]">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatRupiah(printedInvoice.subtotal)}</span>
                  </div>
                  {printedInvoice.total_discount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Diskon</span>
                      <span>-{formatRupiah(printedInvoice.total_discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold pt-1 border-t text-foreground">
                    <span>TOTAL</span>
                    <span>{formatRupiah(printedInvoice.grand_total)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-1">
                    <span>Bayar ({printedInvoice.payment_method})</span>
                    <span>{formatRupiah(printedInvoice.amount_paid)}</span>
                  </div>
                  {printedInvoice.change_amount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Kembalian</span>
                      <span>{formatRupiah(printedInvoice.change_amount)}</span>
                    </div>
                  )}
                </div>

                {/* Masa Garansi pada Struk */}
                <div className="pt-2 border-t border-dashed border-border space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Masa Garansi Servis:</span>
                    <span className="font-bold text-foreground">
                      {printedInvoice.warranty_duration && printedInvoice.warranty_duration > 0
                        ? `${printedInvoice.warranty_duration} Hari`
                        : "Tanpa Garansi"}
                    </span>
                  </div>
                  {printedInvoice.warranty_duration && printedInvoice.warranty_duration > 0 && printedInvoice.warranty_end_date && (
                    <div className="flex justify-between text-[10px] text-emerald-400">
                      <span>Berlaku Hingga:</span>
                      <span>{format(parseISO(printedInvoice.warranty_end_date), "dd MMMM yyyy", { locale: idLocale })}</span>
                    </div>
                  )}
                  {printedInvoice.warranty_notes && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Ketentuan: {printedInvoice.warranty_notes}
                    </p>
                  )}
                </div>

                <div className="text-center pt-4 pb-1 border-t border-dashed border-border text-[10px] text-muted-foreground">
                  <p>Terima kasih atas kunjungan & kepercayaan Anda!</p>
                  <p className="mt-0.5">Garansi servis dan penukaran barang berlaku sesuai syarat & ketentuan.</p>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setPrintedInvoice(null)}>
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Printer className="h-4 w-4" />
                Cetak Struk
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG: KONFIRMASI VOID (BATALKAN NOTA) */}
        <AlertDialog open={!!voidTarget} onOpenChange={(open) => !open && setVoidTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Batalkan Nota (Void)
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 pt-2">
                <p>
                  Anda akan membatalkan nota <strong>{voidTarget?.invoice_number}</strong> senilai{" "}
                  <strong>{formatRupiah(voidTarget?.grand_total || 0)}</strong>.
                </p>
                <p className="text-xs text-muted-foreground">
                  ⚠️ <strong>Efek Pembatalan:</strong> Nota tidak akan dihapus permanen agar nomor urut
                  tetap rapi, status nota diubah menjadi <em>Void</em>, dikeluarkan dari perhitungan omzet & laba, dan{" "}
                  <strong>stok barang retail dalam nota ini akan otomatis dikembalikan ke inventaris</strong>. Jika nota ini berasal dari tiket servis, status penagihan tiket akan dikembalikan agar dapat diproses ulang.
                </p>
                <div className="pt-2">
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Alasan Pembatalan:
                  </label>
                  <Input
                    placeholder="Contoh: Pelanggan salah pilih barang / salah input kasir"
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={voidLoading}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmVoid}
                disabled={voidLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {voidLoading ? "Memproses..." : "Ya, Batalkan Nota"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
