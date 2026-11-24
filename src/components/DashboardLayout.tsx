import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  FileBarChart,
  Users,
  LogOut,
  Briefcase,
  Archive,
  Sparkles,
  Receipt,
  Package,
  ArrowDownRight,
  FileSpreadsheet,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProfileDialog } from "@/components/ProfileDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { useStaffRealtimeNotifications } from "@/hooks/useStaffRealtimeNotifications";
import { AppLogo } from "./AppLogo";

const adminNavItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["owner", "admin", "finance"] as const },
  { label: "Pesanan", path: "/dashboard/orders", icon: ClipboardList, roles: ["owner", "admin", "technician", "finance"] as const },
  { label: "Tiket Teknisi", path: "/dashboard/workload", icon: Briefcase, roles: ["owner", "admin", "finance"] as const },
  { label: "Laporan", path: "/dashboard/reports", icon: FileBarChart, roles: ["owner", "admin", "finance"] as const },
  { label: "Kelola Tiket Service", path: "/dashboard/closed-tickets", icon: Archive, roles: ["owner"] as const },
  { label: "Kelola Pelanggan", path: "/dashboard/customers", icon: Users, roles: ["owner", "admin", "finance"] as const },
  { label: "Kelola User", path: "/dashboard/users", icon: Users, roles: ["owner"] as const },
  { label: "Pelatihan AI", path: "/dashboard/ai-training", icon: Sparkles, roles: ["owner"] as const },
];

const financeNavItems = [
  { label: "Ringkasan Keuangan", path: "/dashboard/finance", icon: LayoutDashboard, roles: ["owner", "finance"] as const },
  { label: "Kasir & Buat Nota", path: "/dashboard/finance/pos", icon: Receipt, roles: ["owner", "finance"] as const },
  { label: "Stok Barang", path: "/dashboard/finance/inventory", icon: Package, roles: ["owner", "finance"] as const },
  { label: "Pengeluaran", path: "/dashboard/finance/expenses", icon: ArrowDownRight, roles: ["owner", "finance"] as const },
  { label: "Laporan Ringkas", path: "/dashboard/finance/reports", icon: FileSpreadsheet, roles: ["owner", "finance"] as const },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  useStaffRealtimeNotifications();
  const { profile, hasRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return false;
  });

  useEffect(() => {
    (window as any).sidebarOpen = sidebarOpen;
  }, [sidebarOpen]);

  useEffect(() => {
    const handleCloseSidebar = () => setSidebarOpen(false);
    window.addEventListener("close-sidebar", handleCloseSidebar);
    return () => window.removeEventListener("close-sidebar", handleCloseSidebar);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const canAccessFinance = hasRole("owner") || hasRole("finance");
  const isFinanceWorkspace = location.pathname.startsWith("/dashboard/finance");

  const currentNavItems = isFinanceWorkspace ? financeNavItems : adminNavItems;
  const filteredNav = currentNavItems.filter((item) =>
    item.roles.some((role) => hasRole(role))
  );

  return (
    <div className="min-h-screen flex bg-background print:min-h-0 print:bg-transparent print:block">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent">
              Zona Service
            </h1>
          </div>
          <p className="text-[10px] leading-tight text-sidebar-foreground/60 mt-0.5">Sistem Manajemen & Pelacakan Servis Real-Time</p>
        </div>

        {/* Sub-Dashboard Category Switcher for Owner & Finance */}
        {canAccessFinance && (
          <div className="p-3 pb-2 border-b border-sidebar-border/60">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-1.5 px-1 flex items-center justify-between">
              <span>Ruang Kerja</span>
              <span className="text-[9px] font-normal lowercase bg-sidebar-accent px-1.5 py-0.5 rounded text-sidebar-foreground/70">
                {isFinanceWorkspace ? "keuangan" : "operasional"}
              </span>
            </div>
            <div className="grid grid-cols-2 p-1 bg-sidebar-accent/60 rounded-lg border border-sidebar-border text-xs font-medium gap-1">
              <button
                onClick={() => {
                  navigate("/dashboard");
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={cn(
                  "py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5",
                  !isFinanceWorkspace
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => {
                  navigate("/dashboard/finance");
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={cn(
                  "py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5",
                  isFinanceWorkspace
                    ? "bg-emerald-600 text-white shadow-sm font-semibold"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                <span>Finance</span>
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive =
              item.path === "/dashboard"
                ? location.pathname === "/dashboard"
                : item.path === "/dashboard/finance"
                ? location.pathname === "/dashboard/finance"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(window.innerWidth >= 768 ? sidebarOpen : false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? isFinanceWorkspace
                      ? "bg-emerald-600/20 text-emerald-400 font-semibold"
                      : "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</p>
          </div>
          <ProfileDialog />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 print:min-h-0 print:block",
          sidebarOpen ? "md:pl-64" : "md:pl-0"
        )}
      >
        <header className="sticky top-0 z-30 flex items-center gap-3 p-3 sm:p-4 border-b border-border bg-card/95 backdrop-blur print:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2.5 hover:bg-muted/50 p-1.5 pr-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle Navigation"
          >
            <AppLogo className="h-7 w-7 sm:h-8 sm:w-8" />
            {!sidebarOpen && (
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent">
                Zona Service
              </h1>
            )}
          </button>

          {/* Quick Sub-Dashboard switcher in topbar */}
          {canAccessFinance && (
            <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/60 text-xs">
              <button
                onClick={() => navigate("/dashboard")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5",
                  !isFinanceWorkspace
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Pindah ke Sub-Dashboard Admin"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
              <button
                onClick={() => navigate("/dashboard/finance")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5",
                  isFinanceWorkspace
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Pindah ke Sub-Dashboard Keuangan"
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keuangan</span>
              </button>
            </div>
          )}

          {isFinanceWorkspace && (
            <Badge variant="outline" className="hidden lg:flex border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[11px] gap-1 px-2.5 py-0.5">
              <DollarSign className="h-3 w-3" /> Sub-Dashboard Finance
            </Badge>
          )}

          <div className="flex-1" />
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-auto px-3 py-4 sm:px-4 md:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
