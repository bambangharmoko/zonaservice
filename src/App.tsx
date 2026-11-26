import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, OwnerRoute, AdminRoute, NonTechnicianRoute, FinanceRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { AppLoading } from "@/components/AppLoading";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OpenInAppBanner } from "@/components/OpenInAppBanner";
import { BackButtonHandler } from "@/components/BackButtonHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Index = lazy(() => import("./pages/Index"));
const Track = lazy(() => import("./pages/Track"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const CreateOrder = lazy(() => import("./pages/CreateOrder"));
const Reports = lazy(() => import("./pages/Reports"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const TechnicianWorkload = lazy(() => import("./pages/TechnicianWorkload"));
const CustomerManagement = lazy(() => import("./pages/CustomerManagement"));
const ClosedTicketsManager = lazy(() => import("./pages/ClosedTicketsManager"));
const AiTraining = lazy(() => import("./pages/AiTraining"));
const FinanceOverview = lazy(() => import("./pages/finance/FinanceOverview"));
const FinancePOS = lazy(() => import("./pages/finance/FinancePOS"));
const FinanceQuotations = lazy(() => import("./pages/finance/FinanceQuotations"));
const FinanceInventory = lazy(() => import("./pages/finance/FinanceInventory"));
const FinanceExpenses = lazy(() => import("./pages/finance/FinanceExpenses"));
const FinanceReports = lazy(() => import("./pages/finance/FinanceReports"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          {/* Banner "Buka di Aplikasi" — muncul jika PWA sudah terinstall tapi user buka di browser */}
          <OpenInAppBanner />
          <BackButtonHandler />
          <ErrorBoundary>
            <Suspense fallback={<AppLoading />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/track" element={<Navigate to="/" replace />} />
                <Route path="/track/:ticketId" element={<Track />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<ProtectedRoute><NonTechnicianRoute><Dashboard /></NonTechnicianRoute></ProtectedRoute>} />
                <Route path="/dashboard/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/dashboard/orders/create" element={<ProtectedRoute><CreateOrder /></ProtectedRoute>} />
                <Route path="/dashboard/orders/:ticketId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                <Route path="/dashboard/reports" element={<ProtectedRoute><AdminRoute><Reports /></AdminRoute></ProtectedRoute>} />
                <Route path="/dashboard/workload" element={<ProtectedRoute><AdminRoute><TechnicianWorkload /></AdminRoute></ProtectedRoute>} />
                <Route path="/dashboard/customers" element={<ProtectedRoute><NonTechnicianRoute><CustomerManagement /></NonTechnicianRoute></ProtectedRoute>} />
                <Route path="/dashboard/users" element={<ProtectedRoute><OwnerRoute><UserManagement /></OwnerRoute></ProtectedRoute>} />
                <Route path="/dashboard/closed-tickets" element={<ProtectedRoute><OwnerRoute><ClosedTicketsManager /></OwnerRoute></ProtectedRoute>} />
                <Route path="/dashboard/ai-training" element={<ProtectedRoute><OwnerRoute><AiTraining /></OwnerRoute></ProtectedRoute>} />
                {/* Sub-Dashboard Finance Routes */}
                <Route path="/dashboard/finance" element={<ProtectedRoute><FinanceRoute><FinanceOverview /></FinanceRoute></ProtectedRoute>} />
                <Route path="/dashboard/finance/pos" element={<ProtectedRoute><FinanceRoute><FinancePOS /></FinanceRoute></ProtectedRoute>} />
                <Route path="/dashboard/finance/quotations" element={<ProtectedRoute><FinanceRoute><FinanceQuotations /></FinanceRoute></ProtectedRoute>} />
                <Route path="/dashboard/finance/inventory" element={<ProtectedRoute><FinanceRoute><FinanceInventory /></FinanceRoute></ProtectedRoute>} />
                <Route path="/dashboard/finance/expenses" element={<ProtectedRoute><FinanceRoute><FinanceExpenses /></FinanceRoute></ProtectedRoute>} />
                <Route path="/dashboard/finance/reports" element={<ProtectedRoute><FinanceRoute><FinanceReports /></FinanceRoute></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
      {/* PWA install prompt — muncul di semua halaman jika PWA belum terinstall */}
      <PWAInstallPrompt />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
