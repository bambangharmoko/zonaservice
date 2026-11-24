import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { financeService, FinanceInvoice, FinanceExpense, FinanceProduct } from "@/services/financeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Calendar,
  PlusCircle,
  ShoppingBag,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type PeriodFilter = "today" | "7days" | "this_month" | "all";

export default function FinanceOverview() {
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [products, setProducts] = useState<FinanceProduct[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("this_month");
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
      console.error("Failed to load finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter by selected period
  const { filteredInvoices, filteredExpenses, dateLabel } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    let label = "";

    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      label = "Hari Ini";
    } else if (period === "7days") {
      start = subDays(now, 7);
      label = "7 Hari Terakhir";
    } else if (period === "this_month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
      label = format(now, "MMMM yyyy", { locale: idLocale });
    } else {
      start = new Date(2020, 0, 1);
      label = "Semua Waktu";
    }

    const validInvoices = invoices.filter((inv) => {
      if (inv.status === "void") return false;
      const d = parseISO(inv.date || inv.created_at);
      return isWithinInterval(d, { start, end });
    });

    const validExpenses = expenses.filter((exp) => {
      const d = parseISO(exp.date || exp.created_at);
      return isWithinInterval(d, { start, end });
    });

    return { filteredInvoices: validInvoices, filteredExpenses: validExpenses, dateLabel: label };
  }, [invoices, expenses, period]);

  // Compute 5 Primary Metrics according to PRD
  // 1. Omzet (Pendapatan Kotor) = Total grand_total nota Lunas
  const omzet = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0),
    [filteredInvoices]
  );

  // 2. Total Modal (HPP) = Total harga beli barang terjual
  const totalModalHpp = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + (inv.total_hpp || 0), 0),
    [filteredInvoices]
  );

  // 3. Laba Kotor = Omzet - Total Modal (HPP)
  const labaKotor = omzet - totalModalHpp;

  // 4. Pengeluaran Operasional = Total biaya operasional periode ini
  const pengeluaranOperasional = useMemo(
    () => filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    [filteredExpenses]
  );

  // 5. Laba Bersih = Laba Kotor - Pengeluaran Operasional
  const labaBersih = labaKotor - pengeluaranOperasional;

  // Low stock products warning
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= p.min_stock),
    [products]
  );

  // Chart Data: Group daily trend of Omzet vs Laba Bersih
  const chartData = useMemo(() => {
    const daysMap: Record<string, { date: string; omzet: number; hpp: number; expense: number }> = {};

    filteredInvoices.forEach((inv) => {
      const day = format(parseISO(inv.date || inv.created_at), "dd MMM");
      if (!daysMap[day]) daysMap[day] = { date: day, omzet: 0, hpp: 0, expense: 0 };
      daysMap[day].omzet += inv.grand_total || 0;
      daysMap[day].hpp += inv.total_hpp || 0;
    });

    filteredExpenses.forEach((exp) => {
      const day = format(parseISO(exp.date || exp.created_at), "dd MMM");
      if (!daysMap[day]) daysMap[day] = { date: day, omzet: 0, hpp: 0, expense: 0 };
      daysMap[day].expense += exp.amount || 0;
    });

    return Object.values(daysMap).map((d) => ({
      date: d.date,
      omzet: d.omzet,
      labaBersih: Math.max(0, d.omzet - d.hpp - d.expense),
    }));
  }, [filteredInvoices, filteredExpenses]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Period Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Ringkasan Keuangan</h1>
              <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
                Sub-Dashboard Finance
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pantau omzet, laba kotor, biaya operasional, dan laba bersih ({dateLabel})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 bg-muted rounded-lg border border-border text-xs font-medium">
              <button
                onClick={() => setPeriod("today")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "today" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setPeriod("7days")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "7days" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setPeriod("this_month")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "this_month" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setPeriod("all")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === "all" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua
              </button>
            </div>

            <Link to="/dashboard/finance/pos">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
                <Receipt className="h-4 w-4" />
                <span>Buka Kasir</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 5 Kartu Metrik Utama Sesuai PRD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Omzet */}
          <Card className="border-border/60 shadow-sm hover:border-emerald-500/40 transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Omzet (Kotor)
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold tracking-tight text-foreground truncate">
                {formatRupiah(omzet)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span>{filteredInvoices.length} nota transaksi lunas</span>
              </p>
            </CardContent>
          </Card>

          {/* 2. Total Modal (HPP) */}
          <Card className="border-border/60 shadow-sm hover:border-blue-500/40 transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Modal (HPP)
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold tracking-tight text-foreground truncate">
                {formatRupiah(totalModalHpp)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Harga modal barang terjual
              </p>
            </CardContent>
          </Card>

          {/* 3. Laba Kotor */}
          <Card className="border-border/60 shadow-sm hover:border-cyan-500/40 transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. Laba Kotor
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold tracking-tight text-cyan-500 truncate">
                {formatRupiah(labaKotor)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Omzet dikurangi HPP barang
              </p>
            </CardContent>
          </Card>

          {/* 4. Pengeluaran Operasional */}
          <Card className="border-border/60 shadow-sm hover:border-amber-500/40 transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                4. Biaya Operasional
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold tracking-tight text-amber-500 truncate">
                {formatRupiah(pengeluaranOperasional)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span>{filteredExpenses.length} catatan pengeluaran</span>
              </p>
            </CardContent>
          </Card>

          {/* 5. Laba Bersih */}
          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-emerald-500/5 via-card to-card hover:border-emerald-500/50 transition-all">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-bold">
                5. Laba Bersih
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className={`text-xl font-extrabold tracking-tight truncate ${labaBersih >= 0 ? "text-emerald-400" : "text-rose-500"}`}>
                {formatRupiah(labaBersih)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Laba Kotor - Operasional
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Warning Banner if any */}
        {lowStockProducts.length > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-semibold text-amber-400">Peringatan Stok Menipis: </span>
                <span className="text-muted-foreground">
                  Ada {lowStockProducts.length} produk dengan stok kritis (di bawah batas minimum).
                </span>
              </div>
            </div>
            <Link to="/dashboard/finance/inventory">
              <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/20 text-xs h-8">
                Cek & Tambah Stok
              </Button>
            </Link>
          </div>
        )}

        {/* Chart: Omzet vs Laba Bersih */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">Tren Omzet vs Laba Bersih</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Grafik perbandingan pendapatan kotor dan laba bersih</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4">
            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p>Belum ada data transaksi pada periode ini</p>
                <Link to="/dashboard/finance/pos" className="mt-3">
                  <Button size="sm" variant="outline" className="text-xs">
                    Buat Nota Pertama
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="rgba(255,255,255,0.4)"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `Rp${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: number) => formatRupiah(val)}
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="omzet"
                      name="Omzet (Rp)"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOmzet)"
                    />
                    <Area
                      type="monotone"
                      dataKey="labaBersih"
                      name="Laba Bersih (Rp)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLaba)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Link to="/dashboard/finance/pos" className="group">
            <Card className="h-full border-border/60 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                    Kasir & Buat Nota
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Transaksi penjualan cepat & cetak struk kasir
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/finance/inventory" className="group">
            <Card className="h-full border-border/60 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-blue-400 transition-colors">
                    Manajemen Stok Barang
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kelola harga modal, harga jual, dan kulakan stok
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/finance/expenses" className="group">
            <Card className="h-full border-border/60 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm group-hover:text-amber-400 transition-colors">
                    Pengeluaran Operasional
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Catat biaya listrik, gaji, internet, dan ATK
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
