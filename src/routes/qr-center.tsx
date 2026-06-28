import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  QrCode, ClipboardCheck, Wallet, Boxes, BookUser, IdCard,
  Download, Printer, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings-context";
import logoRT from "@/assets/logo-rt.png";

export const Route = createFileRoute("/qr-center")({
  head: () => ({
    meta: [
      { title: "QR Center — SiRT 06 Digital" },
      { name: "description", content: "Pusat kode QR RT 06: absensi, kas, inventaris, buku tamu, dan profil warga." },
    ],
  }),
  component: QrCenterPage,
});

type QrKind = "absensi" | "kas" | "inventaris" | "tamu" | "warga";

interface QrPreset {
  kind: QrKind;
  label: string;
  desc: string;
  icon: typeof QrCode;
  needsId: boolean;
  idLabel?: string;
  buildPayload: (origin: string, id: string) => string;
}

const PRESETS: QrPreset[] = [
  { kind: "absensi", label: "QR Absensi", desc: "Tempel di lokasi kegiatan untuk check-in warga.",
    icon: ClipboardCheck, needsId: true, idLabel: "ID / Kode Kegiatan",
    buildPayload: (o, id) => `${o}/absensi?k=${encodeURIComponent(id)}` },
  { kind: "kas", label: "QR Pembayaran Kas", desc: "Scan untuk membuka form catat setoran kas.",
    icon: Wallet, needsId: true, idLabel: "Jenis Kas (mis. Kas RT)",
    buildPayload: (o, id) => `${o}/keuangan?bayar=${encodeURIComponent(id)}` },
  { kind: "inventaris", label: "QR Inventaris", desc: "Tempel pada barang RT untuk cek detail & status.",
    icon: Boxes, needsId: true, idLabel: "Kode / ID Barang",
    buildPayload: (o, id) => `${o}/inventaris?barang=${encodeURIComponent(id)}` },
  { kind: "tamu", label: "QR Buku Tamu", desc: "Pasang di pos jaga untuk pencatatan tamu otomatis.",
    icon: BookUser, needsId: false,
    buildPayload: (o) => `${o}/poskamling?tamu=1` },
  { kind: "warga", label: "QR Profil Warga", desc: "QR identitas warga (NIK / nomor KK).",
    icon: IdCard, needsId: true, idLabel: "NIK / Nomor KK",
    buildPayload: (o, id) => `${o}/warga?nik=${encodeURIComponent(id)}` },
];

function QrCenterPage() {
  const [selected, setSelected] = useState<QrPreset>(PRESETS[0]);
  const [idValue, setIdValue] = useState("");
  return (
    <div className="space-y-4">
      <header className="glass-strong rounded-3xl p-4 sm:p-5 flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
          <QrCode className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight">QR Center</h1>
          <p className="text-[11px] text-muted-foreground">Generator QR berlogo RT untuk berbagai keperluan.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          const active = selected.kind === p.kind;
          return (
            <button
              key={p.kind}
              onClick={() => { setSelected(p); setIdValue(""); }}
              className={`rounded-2xl p-3 text-left transition min-h-[88px] ${active ? "gradient-primary text-primary-foreground shadow-glow" : "glass hover:bg-accent"}`}
            >
              <Icon className="h-5 w-5" />
              <div className="text-xs font-bold mt-2 leading-tight">{p.label}</div>
            </button>
          );
        })}
      </div>

      <div className="glass-strong rounded-3xl p-4 space-y-3">
        <div>
          <div className="text-sm font-bold">{selected.label}</div>
          <div className="text-[11px] text-muted-foreground">{selected.desc}</div>
        </div>
        {selected.needsId && (
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold">{selected.idLabel}</span>
            <input
              value={idValue}
              onChange={(e) => setIdValue(e.target.value)}
              placeholder={`Masukkan ${selected.idLabel?.toLowerCase()}…`}
              className="form-input w-full"
            />
          </label>
        )}
        <QrPreview preset={selected} idValue={idValue.trim()} />
      </div>
    </div>
  );
}

function QrPreview({ preset, idValue }: { preset: QrPreset; idValue: string }) {
  const { identity } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const payload = useMemo(() => {
    if (preset.needsId && !idValue) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://sirt06.local";
    return preset.buildPayload(origin, idValue);
  }, [preset, idValue]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const canvas = canvasRef.current;
      if (!canvas || !payload) return;
      const size = 512;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      await QRCode.toCanvas(canvas, payload, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#0B1220", light: "#ffffff" },
      });
      // overlay logo center
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = logoRT;
      await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
      if (cancelled) return;
      const logoSize = Math.round(size * 0.22);
      const x = (size - logoSize) / 2;
      const pad = 8;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - pad, x - pad, logoSize + pad * 2, logoSize + pad * 2);
      try { ctx.drawImage(img, x, x, logoSize, logoSize); } catch {}
    }
    void render();
    return () => { cancelled = true; };
  }, [payload]);

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${preset.kind}${idValue ? "-" + slug(idValue) : ""}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("QR PNG diunduh");
    }, "image/png");
  }

  function downloadPdf() {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    setBusy(true);
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) { setBusy(false); toast.error("Pop-up diblokir"); return; }
    w.document.write(`<!doctype html><html><head><title>QR ${preset.label}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Inter, system-ui, sans-serif; text-align:center; color:#0B1220; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { font-size: 12px; color:#475569; margin-bottom:16px; }
        img { width: 320px; height: 320px; }
        .info { font-size: 11px; color:#334155; margin-top: 12px; word-break: break-all; }
        .foot { font-size:10px; color:#94a3b8; margin-top: 24px; }
      </style></head><body>
      <h1>${preset.label}</h1>
      <div class="sub">RT ${identity.nomorRT} / RW ${identity.nomorRW} — ${identity.namaLingkungan}</div>
      <img src="${dataUrl}" alt="QR" />
      ${idValue ? `<div class="info"><strong>${preset.idLabel}:</strong> ${escapeHtml(idValue)}</div>` : ""}
      <div class="info">${escapeHtml(payload)}</div>
      <div class="foot">Dibuat oleh SiRT 06 Digital • ${new Date().toLocaleString("id-ID")}</div>
      <script>setTimeout(()=>{window.print();},250);</script>
      </body></html>`);
    w.document.close();
    setBusy(false);
  }

  if (!payload) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        {preset.needsId ? `Masukkan ${preset.idLabel?.toLowerCase()} untuk menghasilkan QR.` : "Memuat QR…"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-4 grid place-items-center">
        <canvas ref={canvasRef} className="w-full max-w-[280px] aspect-square" />
      </div>
      <div className="text-[11px] text-muted-foreground break-all bg-muted/40 rounded-xl p-2">{payload}</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadPng} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl gradient-primary text-primary-foreground py-2.5 text-sm font-semibold shadow-glow min-h-[44px]">
          <Download className="h-4 w-4" /> Unduh PNG
        </button>
        <button onClick={downloadPdf} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl glass py-2.5 text-sm font-semibold min-h-[44px]">
          <Printer className="h-4 w-4" /> Unduh PDF
        </button>
      </div>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}