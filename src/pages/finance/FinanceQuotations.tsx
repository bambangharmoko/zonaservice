import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  financeService,
  FinanceQuotation,
  FinanceQuotationItem,
  TicketSparepart,
} from "@/services/financeService";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Trash2,
  Printer,
  FileText,
  CheckCircle2,
  XCircle,
  MessageCircle,
  RefreshCw,
  Building,
  User,
  Phone,
  Laptop,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowRight,
  Send,
  Eye,
  Info,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ─────────────────────────────────────────────────────────────
// Syarat & Ketentuan Resmi (Sama dengan Tanda Terima Awal)
// ─────────────────────────────────────────────────────────────
const OFFICIAL_TERMS = [
  {
    title: "Risiko Kehilangan Data",
    desc: "Kami tidak bertanggung jawab atas kehilangan, kerusakan, atau kebocoran data selama proses pengecekan maupun perbaikan. Pelanggan sangat disarankan untuk melakukan backup data pribadi secara mandiri sebelum menyerahkan unit.",
  },
  {
    title: "Batas Waktu Pengambilan Unit",
    desc: "Unit yang telah selesai diperbaiki atau dibatalkan, namun tidak diambil dalam kurun waktu 3 (tiga) bulan sejak pelanggan dihubungi, maka segala bentuk kerusakan, kehilangan, atau penyusutan nilai barang sudah berada di luar tanggung jawab kami. Pihak toko berhak mengelola unit tersebut untuk menutupi biaya administrasi dan penyimpanan.",
  },
  {
    title: "Risiko Unit Mati Total",
    desc: "Untuk unit yang diserahkan dalam Kondisi apa pun, apabila sebelumnya pelanggan telah diinformasikan oleh teknisi bahwa terdapat risiko unit menjadi Mati Total selama proses pembongkaran, pengecekan, atau perbaikan, maka kami tidak bertanggung jawab jika hal tersebut benar-benar terjadi. Tindakan perbaikan komponen elektronik memiliki risiko teknis bawaan yang terkadang di luar kendali.",
  },
  {
    title: "Pengecekan Gratis (Free Diagnostic)",
    desc: "Kami tidak memungut biaya pengecekan atau diagnosa. Apabila setelah dilakukan pengecekan pelanggan memutuskan untuk membatalkan perbaikan (misalnya karena estimasi biaya tidak disetujui), unit akan dirakit kembali dan dikembalikan tanpa dikenakan biaya apa pun.",
  },
  {
    title: "Garansi Perbaikan",
    desc: "Garansi servis berlaku selama 30 Hari terhitung sejak unit selesai diperbaiki atau diambil. Garansi ini hanya berlaku untuk jenis keluhan dan pergantian suku cadang yang sama.",
  },
  {
    title: "Klaim & Batalnya Garansi (Void)",
    desc: "Garansi otomatis hangus atau tidak berlaku apabila unit kembali dengan keluhan/kerusakan pada komponen yang berbeda dari riwayat perbaikan sebelumnya. Garansi juga batal jika ditemukan indikasi kelalaian pemakaian (human error), seperti cacat fisik (jatuh, terbentur, pecah), atau indikasi unit terkena cairan setelah perbaikan selesai.",
  },
  {
    title: "Keamanan Unit & Kejadian Tak Terduga",
    desc: "Kami berkomitmen penuh untuk menjaga keamanan unit Anda selama berada di bengkel kami. Namun, apabila terjadi kejadian luar biasa di luar kendali kami (force majeure) seperti bencana alam, kebakaran, atau musibah tak terduga lainnya, maka segala bentuk penyelesaian akan dibicarakan secara musyawarah dan kekeluargaan demi menemukan solusi terbaik bagi kedua belah pihak.",
  },
];

// Helper formatting rupiah
function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num || 0);
}

function QuotationDocumentView({ quote }: { quote: FinanceQuotation }) {
  return (
    <div className="font-sans text-xs leading-relaxed text-black">
      {/* Kop Surat Resmi Toko (Otomatis & Terkunci) */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4 gap-4">
        <div className="w-16 h-16 flex items-center justify-center shrink-0">
          <QRCodeSVG
            value="https://wa.me/6285183267911"
            size={60}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
          />
        </div>

        <div className="text-center flex-1">
          <h1 className="text-lg font-black tracking-wider uppercase text-black">ZONA SERVICE BALIKPAPAN</h1>
          <p className="text-[11px] font-semibold text-neutral-800">
            Spesialis Service Laptop, Komputer, Maintenance & Pengadaan Komponen
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            Jalan Karya Mukti II No 28 RT 26, Balikpapan • HP/WA: 0851-8326-7911 • Email: zonaservicebalikpapan@gmail.com
          </p>
        </div>

        <div className="w-16 h-16 flex items-center justify-center shrink-0">
          <QRCodeSVG
            value={`${window.location.origin}/track/${quote.ticket_number}`}
            size={60}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
          />
        </div>
      </div>

      {/* Judul Surat & Identitas Dokumen */}
      <div className="text-center mb-5">
        <h2 className="text-sm font-bold uppercase tracking-wide border-b border-black inline-block pb-0.5">
          SURAT PENAWARAN BIAYA PERBAIKAN
        </h2>
        <p className="text-[10px] font-mono mt-1 font-semibold">
          Nomor: {quote.quotation_number}
        </p>
      </div>

      {/* Header Meta Surat (Tanggal & Tujuan) */}
      <div className="flex justify-between items-start mb-4 text-[11px]">
        <div>
          <table className="text-left">
            <tbody>
              <tr>
                <td className="w-20 font-semibold align-top text-neutral-700">Kepada Yth.</td>
                <td className="font-bold text-black">
                  : {quote.customer_name}
                  {quote.customer_company && (
                    <span className="block font-semibold text-neutral-800">
                      {quote.customer_company}
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-semibold text-neutral-700">Telepon / WA</td>
                <td>: {quote.customer_phone || "-"}</td>
              </tr>
              {quote.customer_email && (
                <tr>
                  <td className="font-semibold text-neutral-700">Email</td>
                  <td>: {quote.customer_email}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-right">
          <table className="text-right">
            <tbody>
              <tr>
                <td className="font-semibold text-neutral-700">Tanggal Surat:</td>
                <td className="font-bold pl-2">
                  {format(parseISO(quote.date || quote.created_at), "dd MMMM yyyy", {
                    locale: idLocale,
                  })}
                </td>
              </tr>
              <tr>
                <td className="font-semibold text-neutral-700">Berlaku s/d:</td>
                <td className="font-bold text-neutral-800 pl-2">
                  {format(parseISO(quote.valid_until), "dd MMMM yyyy", { locale: idLocale })}
                </td>
              </tr>
              <tr>
                <td className="font-semibold text-neutral-700">ID Tiket Servis:</td>
                <td className="font-mono font-bold text-black pl-2">#{quote.ticket_number}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Paragraf Pembuka Resmi */}
      <div className="mb-4 text-[11px] leading-relaxed text-justify">
        <p>
          Dengan hormat,
          <br />
          Sehubungan dengan pengecekan unit perangkat milik Bapak/Ibu/Instansi yang telah kami lakukan, bersama
          surat ini kami dari <strong>Zona Service Balikpapan</strong> mengajukan rincian estimasi biaya
          perbaikan dan pemakaian komponen/sparepart dengan rincian sebagai berikut:
        </p>
      </div>

      {/* Identitas Unit & Hasil Diagnosa */}
      <div className="mb-4">
        <h3 className="font-bold text-[11px] uppercase bg-neutral-100 p-1 border border-black mb-1">
          A. IDENTITAS PERANGKAT & HASIL DIAGNOSA AWAL
        </h3>
        <table className="w-full text-[10.5px] border-collapse border border-black">
          <tbody>
            <tr>
              <td className="border border-black p-1.5 font-semibold bg-neutral-50 w-1/4">Perangkat & Tipe</td>
              <td className="border border-black p-1.5 font-medium">{quote.device_info}</td>
              <td className="border border-black p-1.5 font-semibold bg-neutral-50 w-1/5">No. Seri / SN</td>
              <td className="border border-black p-1.5 font-mono">{quote.serial_number || "-"}</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-semibold bg-neutral-50">Keluhan / Kerusakan</td>
              <td className="border border-black p-1.5" colSpan={3}>
                {quote.damage_description || "-"}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-semibold bg-neutral-50">Hasil Diagnosa Teknisi</td>
              <td className="border border-black p-1.5" colSpan={3}>
                {quote.technician_diagnosis || "Pemeriksaan teknis selesai."}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabel Rincian Biaya (Itemized Table) */}
      <div className="mb-4">
        <h3 className="font-bold text-[11px] uppercase bg-neutral-100 p-1 border border-black mb-1">
          B. RINCIAN ESTIMASI BIAYA & KOMPONEN
        </h3>
        <table className="w-full text-[10.5px] border-collapse border border-black">
          <thead>
            <tr className="bg-neutral-100 text-center font-bold">
              <th className="border border-black p-1.5 w-8">No</th>
              <th className="border border-black p-1.5 text-left">Deskripsi Jasa / Komponen Sparepart</th>
              <th className="border border-black p-1.5 w-14">Qty</th>
              <th className="border border-black p-1.5 w-28 text-right">Harga Satuan (Rp)</th>
              <th className="border border-black p-1.5 w-28 text-right">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, idx) => (
              <tr key={idx}>
                <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                <td className="border border-black p-1.5">
                  <span className="font-medium">{it.description}</span>
                  {it.is_sparepart && (
                    <span className="text-[9px] text-neutral-500 block italic">Komponen / Suku Cadang</span>
                  )}
                </td>
                <td className="border border-black p-1.5 text-center font-mono">{it.quantity}</td>
                <td className="border border-black p-1.5 text-right font-mono">
                  {formatRupiah(it.unit_price)}
                </td>
                <td className="border border-black p-1.5 text-right font-mono font-semibold">
                  {formatRupiah(it.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border border-black p-1.5 text-right font-semibold bg-neutral-50">
                Subtotal Biaya:
              </td>
              <td className="border border-black p-1.5 text-right font-mono font-semibold bg-neutral-50">
                {formatRupiah(quote.subtotal)}
              </td>
            </tr>
            {quote.total_discount > 0 && (
              <tr>
                <td colSpan={4} className="border border-black p-1.5 text-right font-semibold bg-neutral-50">
                  Diskon:
                </td>
                <td className="border border-black p-1.5 text-right font-mono font-semibold text-neutral-800 bg-neutral-50">
                  -{formatRupiah(quote.total_discount)}
                </td>
              </tr>
            )}
            <tr className="bg-neutral-100 font-bold text-xs">
              <td colSpan={4} className="border border-black p-2 text-right uppercase">
                TOTAL ESTIMASI PENAWARAN:
              </td>
              <td className="border border-black p-2 text-right font-mono text-sm">
                {formatRupiah(quote.grand_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Klausul Masa Berlaku */}
      <div className="mb-3 p-2 bg-neutral-50 border border-black text-[10px] space-y-0.5">
        <p className="font-bold">⏳ KETENTUAN MASA BERLAKU PENAWARAN:</p>
        <p>
          Penawaran ini berlaku selama <strong>14 (empat belas) hari kalender</strong> sejak tanggal surat ini
          diterbitkan (sampai dengan tanggal{" "}
          <strong>
            {format(parseISO(quote.valid_until), "dd MMMM yyyy", { locale: idLocale })}
          </strong>
          ). Apabila konfirmasi persetujuan belum kami terima melampaui batas waktu tersebut, maka ketersediaan
          suku cadang dan estimasi biaya perbaikan dapat mengalami penyesuaian ulang.
        </p>
      </div>

      {/* Syarat dan Ketentuan Layanan (7 Butir Resmi) */}
      <div className="mb-4 text-[9px] leading-tight">
        <h3 className="font-bold text-[10px] uppercase border-b border-black pb-0.5 mb-1">
          C. SYARAT DAN KETENTUAN LAYANAN SERVIS
        </h3>
        <ol className="list-decimal pl-3.5 space-y-0.5 text-neutral-800">
          {OFFICIAL_TERMS.map((term, tIdx) => (
            <li key={tIdx}>
              <strong>{term.title}:</strong> {term.desc}
            </li>
          ))}
        </ol>
      </div>

      {/* Area Tanda Tangan & Persetujuan (Approval Block) */}
      <div className="mt-6 pt-2 border-t border-black">
        <table className="w-full text-center text-[10.5px]">
          <tbody>
            <tr>
              <td className="w-1/2 pb-14 align-top">
                <p className="font-bold">Disetujui Oleh,</p>
                <p className="text-neutral-700">Pelanggan / Perwakilan Instansi</p>
                <p className="text-[9px] text-neutral-500 italic mt-0.5">
                  (Tanda Tangan & Stempel Perusahaan/Instansi)
                </p>
              </td>
              <td className="w-1/2 pb-14 align-top">
                <p className="font-bold">Hormat Kami,</p>
                <p className="text-neutral-700">Zona Service Balikpapan</p>
                <p className="text-[9px] text-neutral-500 italic mt-0.5">(Penanggung Jawab / Bagian Finance)</p>
              </td>
            </tr>
            <tr>
              <td>
                <p className="font-bold underline">
                  ( {quote.customer_name || "................................................."} )
                </p>
                {quote.customer_company && (
                  <p className="text-[9.5px] text-neutral-600">{quote.customer_company}</p>
                )}
              </td>
              <td>
                <p className="font-bold underline">( Zona Service Balikpapan )</p>
                <p className="text-[9.5px] text-neutral-600">Bagian Administrasi & Keuangan</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinanceQuotations() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTicketId = searchParams.get("ticketId");

  const [quotations, setQuotations] = useState<FinanceQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "approved" | "rejected">("all");

  // Create form modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [ticketSelectorOpen, setTicketSelectorOpen] = useState(false);
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ticketSearch, setTicketSearch] = useState("");

  // Selected ticket for creating quotation
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [accessories, setAccessories] = useState("");
  const [damageDesc, setDamageDesc] = useState("");
  const [techDiagnosis, setTechDiagnosis] = useState("");
  const [quotationItems, setQuotationItems] = useState<{
    description: string;
    quantity: number;
    unit_price: number;
    is_sparepart?: boolean;
  }[]>([]);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [savingQuotation, setSavingQuotation] = useState(false);

  // Preview / Print Modal State
  const [previewQuotation, setPreviewQuotation] = useState<FinanceQuotation | null>(null);

  // Approval confirmation state
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<FinanceQuotation | null>(null);
  const [approving, setApproving] = useState(false);

  // Reject confirmation state
  const [rejectConfirmTarget, setRejectConfirmTarget] = useState<FinanceQuotation | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // Load Quotations
  const loadQuotations = async () => {
    setLoading(true);
    try {
      const data = await financeService.getQuotations();
      setQuotations(data);
    } catch (err) {
      console.error("Failed to load quotations:", err);
      toast.error("Gagal memuat daftar penawaran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  // If URL has ticketId query param, auto-open create modal for that ticket
  useEffect(() => {
    if (queryTicketId) {
      openCreateForTicketId(queryTicketId);
    }
  }, [queryTicketId]);

  const openCreateForTicketId = async (tId: string) => {
    try {
      const orders = await financeService.getServiceOrdersForQuotation();
      const match = orders.find((o) => o.id === tId || o.ticket_number === tId);
      if (match) {
        handleSelectTicket(match);
        setCreateModalOpen(true);
      } else {
        toast.error("Tiket servis tidak ditemukan");
      }
    } catch (err) {
      console.error("Error finding ticket:", err);
    }
  };

  // Open ticket selector modal
  const handleOpenTicketSelector = async () => {
    setTicketSelectorOpen(true);
    setLoadingOrders(true);
    try {
      const orders = await financeService.getServiceOrdersForQuotation();
      setServiceOrders(orders);
    } catch (err) {
      console.error("Failed to load service orders:", err);
      toast.error("Gagal mengambil data tiket servis");
    } finally {
      setLoadingOrders(false);
    }
  };

  // When a ticket is chosen from selector
  const handleSelectTicket = (order: any) => {
    setSelectedTicket(order);
    setTicketSelectorOpen(false);

    // Auto-fill Customer Info
    setCustomerName(order.customer_name || "");
    setCustomerPhone(order.customer_phone || "");
    setCustomerEmail(order.customer_email || "");
    setCustomerCompany("");

    // Auto-fill Device Info
    const dev = [order.device_type, order.device_brand, order.device_model]
      .filter(Boolean)
      .join(" ");
    setDeviceInfo(dev || order.device_type || "Perangkat Elektronik");
    setSerialNumber(order.serial_number || "");
    setAccessories(order.unit_accessories || "");
    setDamageDesc(order.damage_description || order.problem_explanation || "-");

    // Auto-fill Diagnosis & Costs
    const checks = (order.unit_checks || {}) as Record<string, any>;
    const actionNote = checks._technician_action_note || "";
    setTechDiagnosis(actionNote || "Pengecekan komponen & kelistrikan modul selesai.");

    const parts = (checks._used_spareparts || []) as TicketSparepart[];
    const laborCost = Number(checks._service_labor_cost ?? order.estimated_cost ?? 0);

    const initialItems: {
      description: string;
      quantity: number;
      unit_price: number;
      is_sparepart?: boolean;
    }[] = [];

    // Spareparts
    parts.forEach((p) => {
      initialItems.push({
        description: `Penggantian ${p.product_name}`,
        quantity: p.quantity,
        unit_price: p.selling_price,
        is_sparepart: true,
      });
    });

    // Service Labor
    const laborTitle = actionNote
      ? `Jasa Perbaikan: ${actionNote}`
      : `Biaya Jasa Servis & Analisis Teknis`;
    initialItems.push({
      description: laborTitle,
      quantity: 1,
      unit_price: laborCost > 0 ? laborCost : 150000,
      is_sparepart: false,
    });

    setQuotationItems(initialItems);
    setDiscountType("fixed");
    setDiscountValue(0);
    setNotes("");
  };

  // Item management in create form
  const handleAddItem = () => {
    setQuotationItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0, is_sparepart: false },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setQuotationItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setQuotationItems((prev) => {
      const next = [...prev];
      (next[index] as any)[field] = value;
      return next;
    });
  };

  // Form Subtotal and Grand Total calculation
  const formSubtotal = useMemo(() => {
    return quotationItems.reduce((acc, it) => acc + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);
  }, [quotationItems]);

  const formDiscount = useMemo(() => {
    if (discountType === "percent") {
      return Math.round((formSubtotal * (Number(discountValue) || 0)) / 100);
    }
    return Math.min(formSubtotal, Number(discountValue) || 0);
  }, [formSubtotal, discountType, discountValue]);

  const formGrandTotal = Math.max(0, formSubtotal - formDiscount);

  // Submit creation
  const handleSaveQuotation = async () => {
    if (!selectedTicket) {
      toast.error("Pilih tiket servis terlebih dahulu!");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Nama pelanggan / PIC instansi wajib diisi!");
      return;
    }
    if (quotationItems.length === 0) {
      toast.error("Minimal harus ada 1 baris rincian biaya!");
      return;
    }

    const hasEmptyItem = quotationItems.some((it) => !it.description.trim());
    if (hasEmptyItem) {
      toast.error("Deskripsi item rincian biaya tidak boleh kosong!");
      return;
    }

    setSavingQuotation(true);
    try {
      const created = await financeService.createQuotation({
        ticket_id: selectedTicket.id,
        ticket_number: selectedTicket.ticket_number,
        customer_name: customerName.trim(),
        customer_company: customerCompany.trim() || null,
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        device_info: deviceInfo.trim(),
        serial_number: serialNumber.trim() || null,
        accessories: accessories.trim() || null,
        damage_description: damageDesc.trim() || null,
        technician_diagnosis: techDiagnosis.trim() || null,
        items: quotationItems.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          is_sparepart: Boolean(it.is_sparepart),
        })),
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        notes: notes.trim() || null,
        created_by: user?.id,
        author_name: profile?.full_name || "Finance",
      });

      toast.success(`Surat Penawaran ${created.quotation_number} berhasil diterbitkan!`);
      setCreateModalOpen(false);
      setSelectedTicket(null);
      loadQuotations();

      // Open preview right away
      setPreviewQuotation(created);
    } catch (err: any) {
      console.error("Failed to create quotation:", err);
      toast.error(err?.message || "Gagal menerbitkan surat penawaran");
    } finally {
      setSavingQuotation(false);
    }
  };

  // Approve quotation (Customer accepts)
  const handleApproveQuotation = async () => {
    if (!approveConfirmTarget) return;
    setApproving(true);
    try {
      await financeService.updateQuotationStatus(approveConfirmTarget.id, "approved", {
        authorName: profile?.full_name || "Finance",
        userId: user?.id,
        nextTicketStatus: "Perbaikan",
      });

      toast.success(`Penawaran ${approveConfirmTarget.quotation_number} disetujui! Status tiket dilanjutkan ke Perbaikan.`);
      setApproveConfirmTarget(null);
      if (previewQuotation?.id === approveConfirmTarget.id) {
        setPreviewQuotation((prev) => (prev ? { ...prev, status: "approved" } : null));
      }
      loadQuotations();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyetujui penawaran");
    } finally {
      setApproving(false);
    }
  };

  // Reject quotation
  const handleRejectQuotation = async () => {
    if (!rejectConfirmTarget) return;
    setRejecting(true);
    try {
      await financeService.updateQuotationStatus(rejectConfirmTarget.id, "rejected", {
        authorName: profile?.full_name || "Finance",
        userId: user?.id,
      });

      toast.info(`Penawaran ${rejectConfirmTarget.quotation_number} ditandai ditolak.`);
      setRejectConfirmTarget(null);
      if (previewQuotation?.id === rejectConfirmTarget.id) {
        setPreviewQuotation((prev) => (prev ? { ...prev, status: "rejected" } : null));
      }
      loadQuotations();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah status penawaran");
    } finally {
      setRejecting(false);
    }
  };

  // WhatsApp share
  const sendQuotationWhatsApp = (quote: FinanceQuotation) => {
    if (!quote.customer_phone) {
      toast.error("Nomor WhatsApp pelanggan tidak tersedia");
      return;
    }
    const cleanPhone = quote.customer_phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const trackUrl = `${window.location.origin}/track/${quote.ticket_number}`;

    const msg = encodeURIComponent(
      `Yth. Bapak/Ibu/Instansi *${quote.customer_company ? `${quote.customer_name} (${quote.customer_company})` : quote.customer_name}*,\n\n` +
      `Sehubungan dengan pengecekan unit *${quote.device_info}* dengan No. Tiket *#${quote.ticket_number}*, kami dari *Zona Service Balikpapan* telah menerbitkan *Surat Penawaran Resmi*:\n\n` +
      `📄 *Nomor Penawaran:* ${quote.quotation_number}\n` +
      `📅 *Tanggal:* ${quote.date}\n` +
      `⏳ *Masa Berlaku:* 14 Hari Kalender (s/d ${quote.valid_until})\n` +
      `💰 *Total Estimasi Biaya:* ${formatRupiah(quote.grand_total)}\n\n` +
      `🔍 Rincian estimasi biaya, ketersediaan sparepart, dan progres servis dapat dipantau langsung melalui link resmi kami:\n` +
      `👉 ${trackUrl}\n\n` +
      `Mohon informasikan kepada kami apabila penawaran ini telah disetujui agar teknisi kami dapat segera melanjutkan proses pengerjaan unit. Terima kasih atas kepercayaan Anda! 🙏\n\n` +
      `*Zona Service Balikpapan*\n` +
      `Jalan Karya Mukti II No 28 RT 26\n` +
      `WhatsApp: 0851-8326-7911 | Email: zonaservicebalikpapan@gmail.com`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
  };

  // Print PDF
  const handlePrintQuotation = () => {
    window.print();
  };

  // Filtered quotations list
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchSearch =
        q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.customer_company && q.customer_company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        q.device_info.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = quotations.length;
    const sent = quotations.filter((q) => q.status === "sent").length;
    const approved = quotations.filter((q) => q.status === "approved").length;
    const rejected = quotations.filter((q) => q.status === "rejected").length;
    const totalNominal = quotations
      .filter((q) => q.status !== "rejected")
      .reduce((sum, q) => sum + (q.grand_total || 0), 0);
    return { total, sent, approved, rejected, totalNominal };
  }, [quotations]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:m-0">
        {/* Printable Document (Only visible when printing) */}
        {previewQuotation && (
          <div className="hidden print:block text-black bg-white w-full p-4">
            <QuotationDocumentView quote={previewQuotation} />
          </div>
        )}

        {/* Header - Screen only */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Penawaran Resmi (Quotation)</h1>
                <p className="text-sm text-muted-foreground">
                  Modul pembuatan surat penawaran A4 resmi untuk persetujuan estimasi biaya instansi / corporate.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadQuotations} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              size="sm"
              className="gradient-primary gap-1.5 shadow-sm"
              onClick={() => {
                setSelectedTicket(null);
                setQuotationItems([]);
                setCreateModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Buat Penawaran Baru
            </Button>
          </div>
        </div>

        {/* Stats Summary Row - Screen only */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Penawaran</p>
                <p className="text-2xl font-bold mt-0.5">{stats.total}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Surat resmi diterbitkan</p>
              </div>
              <div className="p-3 bg-muted rounded-xl text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Menunggu Respon</p>
                <p className="text-2xl font-bold mt-0.5 text-amber-500">{stats.sent}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Masa berlaku 14 hari</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Disetujui Pelanggan</p>
                <p className="text-2xl font-bold mt-0.5 text-success">{stats.approved}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Lanjut proses perbaikan</p>
              </div>
              <div className="p-3 bg-success/10 rounded-xl text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Nilai Penawaran</p>
                <p className="text-lg font-bold mt-0.5 truncate text-foreground">
                  {formatRupiah(stats.totalNominal)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Akumulasi estimasi aktif</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Building className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar - Screen only */}
        <Card className="print:hidden">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari no penawaran, tiket, nama instansi..."
                  className="pl-9 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={statusFilter === "all" ? "default" : "outline"}
                  className="h-8 text-xs shrink-0"
                  onClick={() => setStatusFilter("all")}
                >
                  Semua ({quotations.length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "sent" ? "default" : "outline"}
                  className="h-8 text-xs shrink-0"
                  onClick={() => setStatusFilter("sent")}
                >
                  Terkirim ({stats.sent})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "approved" ? "default" : "outline"}
                  className="h-8 text-xs shrink-0"
                  onClick={() => setStatusFilter("approved")}
                >
                  Disetujui ({stats.approved})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "rejected" ? "default" : "outline"}
                  className="h-8 text-xs shrink-0"
                  onClick={() => setStatusFilter("rejected")}
                >
                  Ditolak ({stats.rejected})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotations List Table - Screen only */}
        <Card className="print:hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Daftar Riwayat Penawaran Resmi ({filteredQuotations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Memuat data penawaran...</div>
            ) : filteredQuotations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">Belum ada penawaran resmi yang diterbitkan</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Pilih tiket servis berstatus "Menunggu Persetujuan Pelanggan" untuk membuat surat penawaran format A4 resmi.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTicket(null);
                    setCreateModalOpen(true);
                  }}
                  className="gradient-primary text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Buat Penawaran Pertama
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredQuotations.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-4 hover:bg-muted/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-primary tracking-wide">{quote.quotation_number}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Tiket #{quote.ticket_number}
                        </Badge>
                        {quote.status === "sent" && (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 text-[10px] border-amber-500/20">
                            Terkirim (Menunggu Respon)
                          </Badge>
                        )}
                        {quote.status === "approved" && (
                          <Badge variant="secondary" className="bg-success/10 text-success text-[10px] border-success/20">
                            Disetujui Pelanggan
                          </Badge>
                        )}
                        {quote.status === "rejected" && (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px] border-destructive/20">
                            Ditolak
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="font-semibold text-foreground">
                          {quote.customer_company ? `${quote.customer_name} (${quote.customer_company})` : quote.customer_name}
                        </span>
                        <span>•</span>
                        <span>{quote.device_info}</span>
                        <span>•</span>
                        <span>Tanggal: {format(parseISO(quote.date || quote.created_at), "dd/MM/yyyy")}</span>
                        <span>•</span>
                        <span className="text-amber-500">Berlaku s/d: {format(parseISO(quote.valid_until), "dd/MM/yyyy")}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-border/60">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Penawaran</p>
                        <p className="text-base font-bold text-foreground font-mono">
                          {formatRupiah(quote.grand_total)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => setPreviewQuotation(quote)}
                          title="Lihat & Cetak Format A4"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview A4</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                          onClick={() => sendQuotationWhatsApp(quote)}
                          title="Kirim ke WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>

                        {quote.status === "sent" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-success border-success/30 hover:bg-success/10 gap-1"
                              onClick={() => setApproveConfirmTarget(quote)}
                              title="Tandai Disetujui & Lanjutkan Tiket"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="hidden lg:inline">Setujui</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => setRejectConfirmTarget(quote)}
                              title="Tandai Ditolak"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─────────────────────────────────────────────────────────────
            MODAL 1: FORM BUAT PENAWARAN BARU
           ───────────────────────────────────────────────────────────── */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <FileText className="h-5 w-5 text-primary" />
                Terbitkan Surat Penawaran Resmi (Quotation)
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Header Toko (Terkunci & Otomatis) */}
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Zona Service Balikpapan (Kop Surat Resmi)</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    Otomatis & Terkunci
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Jalan Karya Mukti II No 28 RT 26 • HP/WhatsApp: 0851-8326-7911 • Email: zonaservicebalikpapan@gmail.com
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Nomor Surat Penawaran: <span className="font-mono font-semibold text-foreground">Format Otomatis (ZS + DDMMYYYY + No Urut)</span> • Masa Berlaku: 14 Hari Kalender
                </p>
              </div>

              {/* Step 1: Pilih Tiket Servis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <span>1. Tiket Servis Acuan</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleOpenTicketSelector}
                  >
                    <Search className="h-3 w-3" />
                    {selectedTicket ? "Ganti Tiket" : "Pilih Tiket Servis"}
                  </Button>
                </div>

                {selectedTicket ? (
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary font-mono text-sm">#{selectedTicket.ticket_number}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedTicket.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(selectedTicket.created_at).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-muted-foreground">Pelanggan:</span>{" "}
                        <span className="font-medium text-foreground">{selectedTicket.customer_name}</span> (
                        {selectedTicket.customer_phone})
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unit:</span>{" "}
                        <span className="font-medium text-foreground">
                          {selectedTicket.device_brand} {selectedTicket.device_model} ({selectedTicket.device_type})
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={handleOpenTicketSelector}
                    className="p-4 rounded-lg border border-dashed text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all text-muted-foreground"
                  >
                    <Search className="h-5 w-5 mx-auto mb-1 text-primary opacity-70" />
                    <p className="font-medium">Klik di sini untuk memilih Tiket Servis</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Hanya tiket berstatus <strong>"Menunggu Persetujuan Pelanggan"</strong> yang dapat dipilih.
                    </p>
                  </div>
                )}
              </div>

              {/* Step 2: Informasi Pelanggan & Instansi */}
              {selectedTicket && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="font-semibold text-foreground">2. Data Tujuan Surat (Pelanggan / Instansi)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Nama Pelanggan / PIC <span className="text-destructive">*</span></label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Bpk. Bambang / PIC IT"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Nama Perusahaan / Instansi (Opsional)</label>
                      <Input
                        value={customerCompany}
                        onChange={(e) => setCustomerCompany(e.target.value)}
                        placeholder="Contoh: PT Nusantara Jaya / Kantor Camat"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Nomor Telepon / WhatsApp</label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="08..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Email Kontak (Opsional)</label>
                      <Input
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="nama@instansi.com"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Informasi Perangkat & Diagnosa */}
              {selectedTicket && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="font-semibold text-foreground">3. Identitas Unit & Temuan Diagnosa</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Tipe & Model Perangkat</label>
                      <Input
                        value={deviceInfo}
                        onChange={(e) => setDeviceInfo(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Nomor Seri (SN) / IMEI</label>
                      <Input
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="Tidak ada / SN..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] text-muted-foreground">Keluhan & Masalah Unit</label>
                      <Input
                        value={damageDesc}
                        onChange={(e) => setDamageDesc(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] text-muted-foreground">Hasil Pemeriksaan / Diagnosa Teknisi</label>
                      <Textarea
                        value={techDiagnosis}
                        onChange={(e) => setTechDiagnosis(e.target.value)}
                        placeholder="Hasil analisa teknisi terkait komponen yang rusak/perlu diganti..."
                        className="min-h-[50px] text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Rincian Biaya (Itemized Breakdown) */}
              {selectedTicket && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground">4. Rincian Estimasi Biaya (Itemized Table)</div>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddItem}>
                      <Plus className="h-3 w-3 mr-1" /> Tambah Baris Biaya
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {quotationItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="Deskripsi jasa atau sparepart..."
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="w-16">
                          <Input
                            type="number"
                            min={1}
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value) || 1)}
                            className="h-7 text-xs text-center"
                          />
                        </div>
                        <div className="w-28">
                          <Input
                            type="number"
                            min={0}
                            placeholder="Harga (Rp)"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(idx, "unit_price", Number(e.target.value) || 0)}
                            className="h-7 text-xs text-right font-mono"
                          />
                        </div>
                        <div className="w-24 text-right font-mono text-xs font-semibold">
                          {formatRupiah((Number(item.unit_price) || 0) * (Number(item.quantity) || 1))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={quotationItems.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Totals & Diskon */}
                  <div className="p-3 rounded-lg bg-muted/40 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Subtotal Biaya:</span>
                      <span className="font-mono font-medium">{formatRupiah(formSubtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Diskon:</span>
                        <select
                          className="h-7 text-xs border rounded px-1.5 bg-background"
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value as any)}
                        >
                          <option value="fixed">Nominal (Rp)</option>
                          <option value="percent">Persen (%)</option>
                        </select>
                        <Input
                          type="number"
                          min={0}
                          value={discountValue || ""}
                          onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-7 w-24 text-xs font-mono"
                        />
                      </div>
                      {formDiscount > 0 && (
                        <span className="font-mono text-destructive">-{formatRupiah(formDiscount)}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-sm">
                      <span>Total Biaya Penawaran:</span>
                      <span className="font-mono text-primary text-base">{formatRupiah(formGrandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Catatan Tambahan (Opsional) */}
              {selectedTicket && (
                <div className="space-y-1 pt-2 border-t">
                  <label className="text-[11px] font-semibold text-foreground">Catatan Khusus Penawaran (Opsional)</label>
                  <Input
                    placeholder="Contoh: Estimasi pengerjaan 2 hari kerja setelah sparepart tiba..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="button"
                className="gradient-primary"
                onClick={handleSaveQuotation}
                disabled={!selectedTicket || savingQuotation}
              >
                {savingQuotation ? "Menerbitkan..." : "Terbitkan & Buka Preview A4"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─────────────────────────────────────────────────────────────
            MODAL 2: PILIH TIKET SERVIS (FILTER LOGIC STRICT)
            - Selectable: Status === "Menunggu Persetujuan Pelanggan"
            - Disabled: Status lainnya (tampil redup / tidak bisa dipilih)
           ───────────────────────────────────────────────────────────── */}
        <Dialog open={ticketSelectorOpen} onOpenChange={setTicketSelectorOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Pilih Tiket Servis untuk Surat Penawaran
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-1 flex-1 overflow-hidden flex flex-col">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Info className="h-4 w-4 shrink-0" /> Ketentuan Pemilihan Tiket Servis:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Sesuai SOP resmi, Surat Penawaran hanya dapat diterbitkan untuk tiket dengan status{" "}
                  <strong>"Menunggu Persetujuan Pelanggan"</strong>. Tiket berstatus lain tetap ditampilkan di bawah untuk
                  transparansi namun berstatus <em>non-aktif (disabled)</em>.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ketik nomor tiket, nama pelanggan, atau tipe unit..."
                  className="pl-9 h-9 text-xs"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingOrders ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Memuat data tiket servis...</div>
                ) : serviceOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada tiket servis ditemukan.</div>
                ) : (
                  serviceOrders
                    .filter((o) => {
                      const q = ticketSearch.toLowerCase();
                      return (
                        o.ticket_number?.toLowerCase().includes(q) ||
                        o.customer_name?.toLowerCase().includes(q) ||
                        o.customer_phone?.toLowerCase().includes(q) ||
                        o.device_brand?.toLowerCase().includes(q) ||
                        o.device_model?.toLowerCase().includes(q)
                      );
                    })
                    .map((order) => {
                      const isSelectable = order.status === "Menunggu Persetujuan Pelanggan";

                      return (
                        <div
                          key={order.id}
                          className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                            isSelectable
                              ? "border-primary/40 bg-card hover:bg-primary/5 cursor-pointer shadow-sm"
                              : "border-border/40 bg-muted/30 opacity-60 cursor-not-allowed"
                          }`}
                          onClick={() => {
                            if (isSelectable) {
                              handleSelectTicket(order);
                            } else {
                              toast.warning(
                                `Tiket #${order.ticket_number} berstatus "${order.status}". Hanya tiket "Menunggu Persetujuan Pelanggan" yang dapat dibuatkan penawaran.`
                              );
                            }
                          }}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  isSelectable ? "text-primary" : "text-muted-foreground"
                                }`}
                              >
                                #{order.ticket_number}
                              </span>
                              <Badge
                                variant={isSelectable ? "default" : "secondary"}
                                className={`text-[10px] ${
                                  isSelectable
                                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {order.status}
                              </Badge>
                              {isSelectable && (
                                <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5 font-semibold">
                                  ✓ Siap Dibuat Penawaran
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs font-medium text-foreground truncate">
                              {order.customer_name} ({order.customer_phone})
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {order.device_brand} {order.device_model} ({order.device_type})
                              {order.damage_description && ` • ${order.damage_description}`}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {isSelectable ? (
                              <Button size="sm" className="gradient-primary h-8 text-xs gap-1">
                                Pilih Tiket <ArrowRight className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled className="h-8 text-xs opacity-50">
                                Tidak Tersedia
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTicketSelectorOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─────────────────────────────────────────────────────────────
            MODAL 3: PREVIEW DOKUMEN RESMI FORMAT A4 & PRINT VIEW
           ───────────────────────────────────────────────────────────── */}
        <Dialog open={!!previewQuotation} onOpenChange={(open) => !open && setPreviewQuotation(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-background print:hidden">
            <DialogHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Pratinjau Surat Penawaran Resmi (Format A4)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nomor: <span className="font-mono font-semibold">{previewQuotation?.quotation_number}</span> • Masa Berlaku: 14 Hari Kalender
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10"
                  onClick={() => previewQuotation && sendQuotationWhatsApp(previewQuotation)}
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
                <Button
                  size="sm"
                  className="gradient-primary h-8 text-xs gap-1 shadow-sm"
                  onClick={handlePrintQuotation}
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak / Unduh PDF (A4)
                </Button>
              </div>
            </DialogHeader>

            {/* A4 Paper Canvas Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/30 flex justify-center">
              {previewQuotation && (
                <div
                  id="printable-quotation"
                  className="bg-white text-black w-full max-w-[800px] shadow-lg rounded-sm border border-neutral-300 p-8 sm:p-12 font-sans text-xs leading-relaxed"
                  style={{ minHeight: "1120px" }}
                >
                  <QuotationDocumentView quote={previewQuotation} />
                </div>
              )}
            </div>

            <DialogFooter className="p-3 border-t bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                {previewQuotation?.status === "sent" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-success border-success/30 hover:bg-success/10 gap-1"
                      onClick={() => previewQuotation && setApproveConfirmTarget(previewQuotation)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pelanggan Menyetujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                      onClick={() => previewQuotation && setRejectConfirmTarget(previewQuotation)}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Pelanggan Menolak
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewQuotation(null)}>
                  Tutup
                </Button>
                <Button size="sm" className="gradient-primary" onClick={handlePrintQuotation}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Cetak / Simpan PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─────────────────────────────────────────────────────────────
            ALERT DIALOG: KONFIRMASI PERSETUJUAN PENAWARAN
           ───────────────────────────────────────────────────────────── */}
        <AlertDialog open={!!approveConfirmTarget} onOpenChange={(open) => !open && setApproveConfirmTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Konfirmasi Persetujuan Penawaran
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-xs">
                <p>
                  Apakah pelanggan/instansi <strong>{approveConfirmTarget?.customer_name}</strong> telah menyetujui Surat
                  Penawaran <strong>#{approveConfirmTarget?.quotation_number}</strong> sebesar{" "}
                  <strong>{formatRupiah(approveConfirmTarget?.grand_total || 0)}</strong>?
                </p>
                <p className="p-2.5 rounded bg-muted text-foreground">
                  ⚙️ <strong>Tindakan Otomatis Sistem:</strong> Status tiket servis{" "}
                  <strong>#{approveConfirmTarget?.ticket_number}</strong> akan otomatis dilanjutkan ke tahap{" "}
                  <strong>"Perbaikan"</strong>, dan riwayat persetujuan akan dicatat pada timeline servis.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={approving}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApproveQuotation}
                disabled={approving}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                {approving ? "Memproses..." : "Ya, Pelanggan Menyetujui"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─────────────────────────────────────────────────────────────
            ALERT DIALOG: KONFIRMASI PENOLAKAN PENAWARAN
           ───────────────────────────────────────────────────────────── */}
        <AlertDialog open={!!rejectConfirmTarget} onOpenChange={(open) => !open && setRejectConfirmTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Tandai Penawaran Ditolak
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Apakah Anda yakin ingin menandai Surat Penawaran{" "}
                <strong>#{rejectConfirmTarget?.quotation_number}</strong> sebagai ditolak oleh pelanggan?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={rejecting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRejectQuotation}
                disabled={rejecting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {rejecting ? "Menyimpan..." : "Tandai Ditolak"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
