import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { financeService, FinanceExpense } from "@/services/financeService";
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
  ArrowDownRight,
  Calendar,
  Tag,
  Trash2,
  Edit,
  DollarSign,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const EXPENSE_CATEGORIES = [
  "Utilitas & Listrik",
  "Internet & Telp",
  "Gaji & Uang Makan Staf",
  "Sewa Ruko / Tempat",
  "ATK & Perlengkapan Toko",
  "Kebersihan & Konsumsi",
  "Transport & Ekspedisi",
  "Maintenance & Servis Alat",
  "Lain-lain",
];

export default function FinanceExpenses() {
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceExpense | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await financeService.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchCat = selectedCategory === "Semua" || exp.category === selectedCategory;
      const matchSearch =
        exp.title.toLowerCase().includes(search.toLowerCase()) ||
        (exp.notes && exp.notes.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [expenses, selectedCategory, search]);

  // Summaries
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    return expenses
      .filter((e) => {
        const d = parseISO(e.date || e.created_at);
        return isWithinInterval(d, { start, end });
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const todayExpenses = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return expenses
      .filter((e) => (e.date || e.created_at).slice(0, 10) === todayStr)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormTitle("");
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormAmount(0);
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditModal = (exp: FinanceExpense) => {
    setEditingExpense(exp);
    setFormDate(exp.date ? exp.date.slice(0, 10) : format(new Date(), "yyyy-MM-dd"));
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(exp.amount);
    setFormNotes(exp.notes || "");
    setModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Nama pengeluaran wajib diisi!");
      return;
    }
    if (formAmount <= 0) {
      toast.error("Nominal pengeluaran harus lebih dari 0!");
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        await financeService.updateExpense(editingExpense.id, {
          date: formDate,
          title: formTitle.trim(),
          category: formCategory,
          amount: Number(formAmount),
          notes: formNotes.trim() || null,
        });
        toast.success("Catatan pengeluaran berhasil diperbarui");
      } else {
        await financeService.createExpense({
          date: formDate,
          title: formTitle.trim(),
          category: formCategory,
          amount: Number(formAmount),
          notes: formNotes.trim() || null,
        });
        toast.success("Catatan pengeluaran berhasil ditambahkan");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengeluaran");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await financeService.deleteExpense(deleteTarget.id);
      toast.success("Pengeluaran berhasil dihapus");
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pengeluaran");
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pengeluaran Operasional</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Catat seluruh biaya operasional toko/kantor di luar kulakan agar laba bersih akurat
            </p>
          </div>

          <Button
            size="sm"
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-sm self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Pengeluaran Baru</span>
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Pengeluaran Hari Ini</p>
                <p className="text-xl font-bold mt-1 text-amber-400">{formatRupiah(todayExpenses)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Pengeluaran Bulan Ini</p>
                <p className="text-xl font-bold mt-1 text-rose-400">{formatRupiah(thisMonthExpenses)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Total Catatan</p>
                <p className="text-xl font-bold mt-1">{expenses.length} Transaksi</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <ReceiptText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama pengeluaran atau catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["Semua", ...EXPENSE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
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

        {/* Expenses Table */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Nama Pengeluaran</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada catatan pengeluaran
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {format(parseISO(exp.date || exp.created_at), "dd MMMM yyyy", {
                            locale: idLocale,
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">{exp.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                            {exp.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                          {exp.notes || "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-400 font-mono text-sm">
                          -{formatRupiah(exp.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(exp)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(exp)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

        {/* DIALOG: TAMBAH / EDIT PENGELUARAN */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Edit Pengeluaran" : "Catat Pengeluaran Operasional Baru"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 py-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Tanggal</label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-8 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama / Deskripsi Biaya *</label>
                <Input
                  placeholder="Contoh: Tagihan Listrik PLN Bulan November"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nominal Biaya (Rp) *</label>
                <Input
                  type="number"
                  min={1}
                  value={formAmount || ""}
                  onChange={(e) => setFormAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 text-xs text-right font-bold font-mono text-rose-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Catatan Tambahan (Opsional)</label>
                <Input
                  placeholder="Contoh: No. resi / bukti transfer / nama penerima"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ALERT DIALOG: DELETE EXPENSE */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Pengeluaran</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus catatan pengeluaran{" "}
                <strong>{deleteTarget?.title}</strong> senilai{" "}
                <strong>{formatRupiah(deleteTarget?.amount || 0)}</strong>? Tindakan ini tidak dapat
                dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
