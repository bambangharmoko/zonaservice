import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { financeService, FinanceProduct, FinanceInvoice, FinanceInvoiceItem } from "@/services/financeService";
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
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface CartItem {
  product: FinanceProduct;
  quantity: number;
}

export default function FinancePOS() {
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [products, setProducts] = useState<FinanceProduct[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);

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

  // Cart operations with Stock Validation
  const addToCart = (product: FinanceProduct) => {
    const existing = cart.find((item) => item.product.id === product.id);
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
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const existing = cart.find((item) => item.product.id === productId);
    if (!existing) return;

    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > existing.product.stock) {
      toast.error(`Maksimal stok tersedia hanya ${existing.product.stock} ${existing.product.unit}`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("Umum");
    setCustomerPhone("");
    setDiscountValue(0);
    setAmountPaid(0);
    setNotes("");
  };

  // Calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0),
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

  // Submit Invoice
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
      const newInvoice = await financeService.createInvoice({
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cart.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          purchase_price: item.product.purchase_price,
          selling_price: item.product.selling_price,
          quantity: item.quantity,
        })),
        discount_type: discountType,
        discount_value: discountValue,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === "Tunai" ? amountPaid : grandTotal,
        notes,
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
        inv.customer_name.toLowerCase().includes(historySearch.toLowerCase());
      return matchSearch;
    });
  }, [invoices, historySearch]);

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Top Header & Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kasir & Buat Nota</h1>
            <p className="text-sm text-muted-foreground">
              Antarmuka transaksi kasir cepat (Point of Sale) & riwayat cetak nota
            </p>
          </div>

          <div className="flex items-center p-1 bg-muted rounded-lg border border-border text-xs font-medium self-start sm:self-auto">
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
                  const inCartItem = cart.find((item) => item.product.id === prod.id);
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
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Cart Items List */}
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                      <Package className="h-8 w-8 mx-auto mb-1.5 opacity-40" />
                      <p className="text-xs">Klik barang di sebelah kiri untuk menambah ke nota</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{item.product.name}</p>
                            <p className="text-muted-foreground text-[11px]">
                              {formatRupiah(item.product.selling_price)} x {item.quantity} ={" "}
                              <strong className="text-foreground">
                                {formatRupiah(item.product.selling_price * item.quantity)}
                              </strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="h-6 w-6 rounded bg-card hover:bg-muted border flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="h-6 w-6 rounded bg-card hover:bg-muted border flex items-center justify-center text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="h-6 w-6 rounded text-destructive hover:bg-destructive/10 flex items-center justify-center ml-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
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
                  placeholder="Cari nomor nota atau nama pelanggan..."
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
                        <th className="py-3 px-4">Pelanggan</th>
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
                            <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                              {inv.invoice_number}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {format(parseISO(inv.date || inv.created_at), "dd MMM yyyy, HH:mm", {
                                locale: idLocale,
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-foreground">{inv.customer_name}</p>
                              {inv.customer_phone && (
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
                    <div className="p-1 rounded bg-rose-500/20 text-rose-400 text-center font-bold text-xs">
                      *** NOTA TELAH DIBATALKAN (VOID) ***
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5 py-1">
                  {(printedInvoice.items || []).map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-medium">{item.product_name}</div>
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

                <div className="text-center pt-4 pb-1 border-t border-dashed border-border text-[10px] text-muted-foreground">
                  <p>Terima kasih atas kunjungan & kepercayaan Anda!</p>
                  <p className="mt-0.5">Barang yang sudah dibeli dapat ditukar sesuai ketentuan garansi.</p>
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
                  <strong>seluruh stok barang dalam nota ini akan otomatis dikembalikan ke inventaris</strong>.
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
