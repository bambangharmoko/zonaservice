import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  financeService,
  FinanceProduct,
  FinanceStockLog,
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
  Package,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Edit,
  Trash2,
  History,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function FinanceInventory() {
  const [products, setProducts] = useState<FinanceProduct[]>([]);
  const [stockLogs, setStockLogs] = useState<FinanceStockLog[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FinanceProduct | null>(null);
  const [quickStockTarget, setQuickStockTarget] = useState<FinanceProduct | null>(null);
  const [quickStockType, setQuickStockType] = useState<"kulakan" | "adjustment">("kulakan");
  const [quickStockQty, setQuickStockQty] = useState<number>(1);
  const [quickStockNotes, setQuickStockNotes] = useState("");
  const [stockActionLoading, setStockActionLoading] = useState(false);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FinanceProduct | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "Sparepart",
    purchase_price: 0,
    selling_price: 0,
    stock: 0,
    min_stock: 5,
    unit: "pcs",
    description: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, logsData] = await Promise.all([
        financeService.getProducts(),
        financeService.getStockLogs(),
      ]);
      setProducts(prodData);
      setStockLogs(logsData);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["Semua", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === "Semua" || p.category === categoryFilter;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, search]);

  const totalAssetValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.purchase_price * p.stock, 0);
  }, [products]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      name: "",
      category: "Sparepart",
      purchase_price: 0,
      selling_price: 0,
      stock: 10,
      min_stock: 3,
      unit: "pcs",
      description: "",
    });
    setProductModalOpen(true);
  };

  const openEditModal = (p: FinanceProduct) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku || "",
      name: p.name,
      category: p.category,
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      stock: p.stock,
      min_stock: p.min_stock,
      unit: p.unit || "pcs",
      description: p.description || "",
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Nama barang wajib diisi!");
      return;
    }

    try {
      if (editingProduct) {
        await financeService.updateProduct(editingProduct.id, {
          sku: formData.sku?.trim() || null,
          name: formData.name.trim(),
          category: formData.category,
          purchase_price: Number(formData.purchase_price) || 0,
          selling_price: Number(formData.selling_price) || 0,
          stock: Number(formData.stock) || 0,
          min_stock: Number(formData.min_stock) || 0,
          unit: formData.unit || "pcs",
          description: formData.description || null,
        });
        toast.success(`Produk "${formData.name}" berhasil diperbarui`);
      } else {
        await financeService.createProduct({
          sku: formData.sku?.trim() || null,
          name: formData.name.trim(),
          category: formData.category,
          purchase_price: Number(formData.purchase_price) || 0,
          selling_price: Number(formData.selling_price) || 0,
          stock: Number(formData.stock) || 0,
          min_stock: Number(formData.min_stock) || 0,
          unit: formData.unit || "pcs",
          description: formData.description || null,
        });
        toast.success(`Produk "${formData.name}" berhasil ditambahkan`);
      }
      setProductModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan produk");
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    try {
      await financeService.deleteProduct(deleteTarget.id);
      toast.success(`Produk "${deleteTarget.name}" berhasil dihapus`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus produk");
    }
  };

  const handleQuickStockAction = async () => {
    if (!quickStockTarget) return;
    if (quickStockQty <= 0) {
      toast.error("Jumlah stok harus lebih dari 0");
      return;
    }

    setStockActionLoading(true);
    try {
      if (quickStockType === "kulakan") {
        await financeService.adjustStock(
          quickStockTarget.id,
          quickStockQty,
          "in",
          quickStockNotes || `Kulakan / Tambah Stok (+${quickStockQty})`
        );
        toast.success(`Berhasil menambah ${quickStockQty} ${quickStockTarget.unit} untuk ${quickStockTarget.name}`);
      } else {
        await financeService.adjustStock(
          quickStockTarget.id,
          -quickStockQty,
          "adjustment",
          quickStockNotes || `Penyesuaian stok berkurang / rusak / hilang (-${quickStockQty})`
        );
        toast.success(`Berhasil menyesuaikan stok (-${quickStockQty}) untuk ${quickStockTarget.name}`);
      }
      setQuickStockTarget(null);
      setQuickStockQty(1);
      setQuickStockNotes("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui stok");
    } finally {
      setStockActionLoading(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Header & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Manajemen Stok Barang</h1>
              <Badge variant="outline" className="text-xs">
                {products.length} SKU Barang
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Kelola harga modal (HPP), harga jual, kulakan stok, dan histori mutasi barang
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHistoryModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <History className="h-4 w-4" />
              <span>Riwayat Mutasi</span>
            </Button>
            <Button
              size="sm"
              onClick={openAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Barang Baru</span>
            </Button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Item Barang</p>
                <p className="text-xl font-bold mt-1">{products.length} Produk</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Estimasi Nilai Aset Stok (HPP)</p>
                <p className="text-xl font-bold mt-1 text-emerald-400">{formatRupiah(totalAssetValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Stok Menipis / Kritis</p>
                <p className="text-xl font-bold mt-1 text-amber-400">
                  {products.filter((p) => p.stock <= p.min_stock).length} Produk
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama barang atau kode SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  categoryFilter === cat
                    ? "bg-emerald-600/15 border-emerald-500/50 text-emerald-400 font-semibold"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Table */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Nama Barang & SKU</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Harga Beli (Modal)</th>
                    <th className="py-3 px-4 text-right">Harga Jual</th>
                    <th className="py-3 px-4 text-right">Margin / Unit</th>
                    <th className="py-3 px-4 text-center">Stok</th>
                    <th className="py-3 px-4 text-right">Aksi Stok & Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Tidak ada barang yang cocok dengan pencarian
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const margin = p.selling_price - p.purchase_price;
                      const isLowStock = p.stock <= p.min_stock;
                      return (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-foreground text-sm leading-tight">{p.name}</p>
                            {p.sku && (
                              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                SKU: {p.sku}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {p.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                            {formatRupiah(p.purchase_price)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-foreground font-mono">
                            {formatRupiah(p.selling_price)}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-mono font-medium">
                            +{formatRupiah(margin)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={`text-[11px] font-bold ${
                                p.stock === 0
                                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                  : isLowStock
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                  : "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                              }`}
                            >
                              {p.stock} {p.unit}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setQuickStockTarget(p);
                                  setQuickStockType("kulakan");
                                  setQuickStockQty(5);
                                }}
                                className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/30"
                                title="Tambah Stok / Kulakan Cepat"
                              >
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                <span>Kulakan</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setQuickStockTarget(p);
                                  setQuickStockType("adjustment");
                                  setQuickStockQty(1);
                                }}
                                className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
                                title="Penyesuaian Stok (Rusak / Hilang)"
                              >
                                <ArrowDownRight className="h-3 w-3 mr-1" />
                                <span>Koreksi</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditModal(p)}
                                className="h-7 w-7 p-0"
                                title="Edit Detail Barang"
                              >
                                <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(p)}
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                title="Hapus Barang"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* DIALOG: TAMBAH / EDIT BARANG */}
        <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Detail Barang" : "Tambah Barang / Produk Baru"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 py-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Kode / SKU (Opsional)</label>
                  <Input
                    placeholder="Contoh: PRD-SSD-512"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Kategori</label>
                  <Input
                    placeholder="Sparepart / Aksesoris / Jasa"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="h-8 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama Barang *</label>
                <Input
                  placeholder="Contoh: SSD NVMe 512GB Kingston"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Harga Modal / Beli (Rp) *</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.purchase_price || ""}
                    onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8 text-xs text-right font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Harga Jual (Rp) *</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.selling_price || ""}
                    onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8 text-xs text-right font-mono font-bold text-emerald-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Stok Awal</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.stock || ""}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8 text-xs text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Min. Alert Stok</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.min_stock || ""}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) || 0 })}
                    placeholder="3"
                    className="h-8 text-xs text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Satuan</label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setProductModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Simpan Produk
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG: QUICK KULAKAN / PENYESUAIAN STOK */}
        <Dialog open={!!quickStockTarget} onOpenChange={(open) => !open && setQuickStockTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {quickStockType === "kulakan" ? (
                  <>
                    <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                    <span>Tambah Stok / Kulakan</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-5 w-5 text-amber-400" />
                    <span>Penyesuaian Stok (Koreksi)</span>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {quickStockTarget && (
              <div className="space-y-3 py-1 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/50 border space-y-1">
                  <p className="font-bold text-foreground">{quickStockTarget.name}</p>
                  <p className="text-muted-foreground">
                    Sisa stok saat ini:{" "}
                    <strong>
                      {quickStockTarget.stock} {quickStockTarget.unit}
                    </strong>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">
                    {quickStockType === "kulakan" ? "Jumlah Masuk (Tambah)" : "Jumlah Berkurang (Koreksi)"}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={quickStockQty || ""}
                    onChange={(e) => setQuickStockQty(Number(e.target.value) || 0)}
                    className="h-9 font-bold text-center text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Catatan / Supplier / Alasan</label>
                  <Input
                    placeholder={
                      quickStockType === "kulakan"
                        ? "Kulakan nota no. xxx dari supplier"
                        : "Barang rusak, hilang, atau selisih opname"
                    }
                    value={quickStockNotes}
                    onChange={(e) => setQuickStockNotes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={stockActionLoading}
                    onClick={() => setQuickStockTarget(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={stockActionLoading}
                    onClick={handleQuickStockAction}
                    className={
                      quickStockType === "kulakan"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    }
                  >
                    {stockActionLoading ? "Menyimpan..." : "Konfirmasi Perubahan Stok"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* DIALOG: RIWAYAT MUTASI STOK */}
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-400" />
                Riwayat Mutasi Stok Barang
              </DialogTitle>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 pr-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Barang</th>
                    <th className="py-2.5 px-3 text-center">Tipe Mutasi</th>
                    <th className="py-2.5 px-3 text-right">Perubahan</th>
                    <th className="py-2.5 px-3 text-right">Sisa Akhir</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {stockLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        Belum ada riwayat mutasi stok
                      </td>
                    </tr>
                  ) : (
                    stockLogs.map((log) => {
                      const isPlus = log.type === "in" || log.type === "void_return";
                      return (
                        <tr key={log.id} className="hover:bg-muted/20">
                          <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                            {format(parseISO(log.created_at), "dd/MM/yy HH:mm")}
                          </td>
                          <td className="py-2 px-3 font-medium text-foreground">
                            {log.product_name || "Produk"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0.5 ${
                                log.type === "sale"
                                  ? "border-blue-500/40 text-blue-400"
                                  : log.type === "void_return"
                                  ? "border-emerald-500/40 text-emerald-400"
                                  : log.type === "in"
                                  ? "border-emerald-500/40 text-emerald-400"
                                  : "border-amber-500/40 text-amber-400"
                              }`}
                            >
                              {log.type === "sale"
                                ? "Penjualan"
                                : log.type === "void_return"
                                ? "Retur Void"
                                : log.type === "in"
                                ? "Kulakan"
                                : "Penyesuaian"}
                            </Badge>
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              isPlus ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isPlus ? `+${log.quantity}` : `-${log.quantity}`}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-medium">
                            {log.current_stock}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground truncate max-w-[180px]">
                            {log.notes || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setHistoryModalOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ALERT DIALOG: DELETE PRODUCT */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Barang</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus barang <strong>{deleteTarget?.name}</strong>? Tindakan
                ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground">
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
