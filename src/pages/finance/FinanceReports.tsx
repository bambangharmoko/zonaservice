import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  financeService,
  FinanceInvoice,
  FinanceExpense,
  FinanceProduct,
} from "@/services/financeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ShoppingBag,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";

type ReportPeriod = "this_month" | "last_month" | "this_year" | "all";

export default function FinanceReports() {
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [products, setProducts] = useState<FinanceProduct[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>("this_month");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invData, expData, prodData] = await Promise.all([
        financeService.getInvoices(),
        financeService.getExpenses(),
        financeService.getProducts(),
      ]);
      setInvoices(invData);
      setExpenses(expData);
      setProducts(prodData);
    } catch (err) {
      console.error("Failed to load reports data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter by period
  const { filteredInvoices, filteredExpenses, periodTitle } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    let title = "";

    if (period === "this_month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
      title = `Bulan ${format(now, "MMMM yyyy", { locale: idLocale })}`;
    } else if (period === "last_month") {
      const prev = subMonths(now, 1);
      start = startOfMonth(prev);
      end = endOfMonth(prev);
      title = `Bulan ${format(prev, "MMMM yyyy", { locale: idLocale })}`;
    } else if (period === "this_year") {
      start = startOfYear(now);
      end = endOfYear(now);
      title = `Tahun ${format(now, "yyyy")}`;
    } else {
      start = new Date(2020, 0, 1);
      title = "Seluruh Periode";
    }

    const inv = invoices.filter((i) => {
      if (i.status === "void") return false;
      const d = parseISO(i.date || i.created_at);
      return isWithinInterval(d, { start, end });
    });

    const exp = expenses.filter((e) => {
      const d = parseISO(e.date || e.created_at);
      return isWithinInterval(d, { start, end });
    });

    return { filteredInvoices: inv, filteredExpenses: exp, periodTitle: title };
  }, [invoices, expenses, period]);

  // Aggregate Metrics
  const totalOmzet = useMemo(
    () => filteredInvoices.reduce((sum, i) => sum + (i.grand_total || 0), 0),
    [filteredInvoices]
  );

  const totalHpp = useMemo(
    () => filteredInvoices.reduce((sum, i) => sum + (i.total_hpp || 0), 0),
    [filteredInvoices]
  );

  const labaKotor = totalOmzet - totalHpp;

  const totalPengeluaran = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [filteredExpenses]
  );

  const labaBersih = labaKotor - totalPengeluaran;

  // Top Selling Items in this period
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        if (!map[item.product_name]) {
          map[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        map[item.product_name].quantity += item.quantity;
        map[item.product_name].revenue += item.subtotal;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredInvoices]);

  // Combined Cashflow logs (Invoices + Expenses) sorted chronologically
  const cashflowRows = useMemo(() => {
    const list: Array<{
      date: string;
      type: "in" | "out";
      ref: string;
      description: string;
      category: string;
      amount: number;
    }> = [];

    filteredInvoices.forEach((inv) => {
      list.push({
        date: inv.date || inv.created_at,
        type: "in",
        ref: inv.invoice_number,
        description: `Penjualan Kasir (${inv.customer_name})`,
        category: "Penjualan Barang / Nota",
        amount: inv.grand_total,
      });
    });

    filteredExpenses.forEach((exp) => {
      list.push({
        date: exp.date || exp.created_at,
        type: "out",
        ref: "-",
        description: exp.title,
        category: exp.category,
        amount: exp.amount,
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredInvoices, filteredExpenses]);

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (cashflowRows.length === 0) {
      toast.error("Tidak ada data transaksi untuk diekspor");
      return;
    }

    const headers = ["Tanggal", "Tipe", "Nomor Referensi", "Deskripsi", "Kategori", "Arus Kas (IDR)"];
    const rows = cashflowRows.map((r) => [
      format(parseISO(r.date), "yyyy-MM-dd HH:mm"),
      r.type === "in" ? "Pemasukan (In)" : "Pengeluaran (Out)",
      `"${r.ref}"`,
      `"${r.description.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      r.type === "in" ? r.amount : -r.amount,
    ]);

    // Summary lines
    rows.push([]);
    rows.push(["RINGKASAN REKAPITULASI"]);
    rows.push(["Total Omzet Penjualan", "", "", "", "", totalOmzet]);
    rows.push(["Total Modal HPP", "", "", "", "", totalHpp]);
    rows.push(["Laba Kotor", "", "", "", "", labaKotor]);
    rows.push(["Total Biaya Operasional", "", "", "", "", totalPengeluaran]);
    rows.push(["Laba Bersih", "", "", "", "", labaBersih]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Laporan_Keuangan_Zona_Service_${period}_${format(new Date(), "yyyyMMdd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan berhasil diunduh (format CSV / Excel)!");
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto print:p-4">
        {/* Header & Export Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Laporan Ringkas Keuangan</h1>
              <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
                {periodTitle}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Rekapitulasi arus kas masuk, arus kas keluar, laba rugi, dan ekspor data
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-muted rounded-lg border border-border text-xs font-medium">
              <button
                onClick={() => setPeriod("this_month")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "this_month"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setPeriod("last_month")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "last_month"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bulan Lalu
              </button>
              <button
                onClick={() => setPeriod("this_year")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "this_year"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tahun Ini
              </button>
              <button
                onClick={() => setPeriod("all")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "all"
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="gap-1.5 text-xs h-8"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Ekspor CSV / Excel</span>
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-8 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Laporan / PDF</span>
            </Button>
          </div>
        </div>

        {/* Printable Letterhead (Shows only in print or top of report) */}
        <div className="hidden print:block text-center pb-4 border-b border-border space-y-1">
          <h2 className="text-xl font-bold tracking-tight">ZONA SERVICE</h2>
          <p className="text-sm">LAPORAN KEUANGAN & REKAP ARUS KAS</p>
          <p className="text-xs text-muted-foreground">Periode: {periodTitle} | Dicetak pada: {format(new Date(), "dd MMMM yyyy HH:mm", { locale: idLocale })}</p>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Pemasukan (Omzet)</p>
              <p className="text-xl font-bold mt-1 text-emerald-400">{formatRupiah(totalOmzet)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{filteredInvoices.length} nota transaksi</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Modal (HPP)</p>
              <p className="text-xl font-bold mt-1 text-blue-400">{formatRupiah(totalHpp)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Biaya kulakan barang terjual</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Biaya Operasional</p>
              <p className="text-xl font-bold mt-1 text-rose-400">{formatRupiah(totalPengeluaran)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{filteredExpenses.length} catatan pengeluaran</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-gradient-to-br from-emerald-500/5 to-card">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-400 uppercase font-bold">Laba Bersih Akhir</p>
              <p className={`text-xl font-extrabold mt-1 ${labaBersih >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatRupiah(labaBersih)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Setelah dikurangi HPP & Biaya</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Selling Products */}
        {topSellingProducts.length > 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
                Produk Paling Laris Periode Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {topSellingProducts.map((p, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-muted/40 border text-xs space-y-1">
                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>{p.quantity} terjual</span>
                      <span className="font-bold text-emerald-400">{formatRupiah(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rekapitulasi Arus Kas & Transaksi */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold">
              Rekapitulasi Arus Kas Transaksi ({cashflowRows.length} Catatan)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Tanggal & Waktu</th>
                    <th className="py-2.5 px-4">Tipe</th>
                    <th className="py-2.5 px-4">Referensi</th>
                    <th className="py-2.5 px-4">Deskripsi</th>
                    <th className="py-2.5 px-4">Kategori</th>
                    <th className="py-2.5 px-4 text-right">Nominal Arus Kas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {cashflowRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada arus kas transaksi pada periode ini
                      </td>
                    </tr>
                  ) : (
                    cashflowRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                          {format(parseISO(row.date), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            className={`text-[9px] px-1.5 py-0.5 ${
                              row.type === "in"
                                ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {row.type === "in" ? "Masuk" : "Keluar"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium">{row.ref}</td>
                        <td className="py-2.5 px-4 font-medium text-foreground">{row.description}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{row.category}</td>
                        <td
                          className={`py-2.5 px-4 text-right font-mono font-bold ${
                            row.type === "in" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {row.type === "in" ? `+${formatRupiah(row.amount)}` : `-${formatRupiah(row.amount)}`}
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
    </DashboardLayout>
  );
}
