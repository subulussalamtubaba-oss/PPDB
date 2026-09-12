import React from 'react';
import { Users, CheckCircle2, Clock, AlertTriangle, CreditCard, Award, MapPin } from 'lucide-react';
import { Pendaftar } from '../types';

interface DashboardStatsProps {
  applicants: Pendaftar[];
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

// Helper to extract and normalize Kecamatan from applicant address
export const extractKecamatan = (alamat: string = ''): string => {
  if (!alamat || !alamat.trim()) return 'Lainnya / Tidak Terdeteksi';
  const text = alamat.trim();
  const lower = text.toLowerCase();

  // 1. Explicit regex detection: "Kec. [Nama]" or "Kecamatan [Nama]"
  const kecMatch = text.match(/\bkec(?:amatan)?\.?\s*([a-zA-Z0-9\s]+?)(?:,|$|\.|\b(?:rt|rw|kab|kabupaten|prov|provinsi|tiyuh|desa)\b)/i);
  if (kecMatch && kecMatch[1]) {
    const candidate = kecMatch[1].trim();
    if (candidate.length >= 3 && !/^\d+$/.test(candidate)) {
      const formatted = candidate
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      return `Kec. ${formatted}`;
    }
  }

  // 2. Known subdistricts and prominent tiyuh/villages in Tubaba & surrounding areas
  if (
    lower.includes('tulang bawang tengah') ||
    lower.includes('tbt') ||
    lower.includes('panaragan') ||
    lower.includes('pulung kencana') ||
    lower.includes('tirta makmur') ||
    lower.includes('mulya asri') ||
    lower.includes('penumangan') ||
    lower.includes('bandar dewa') ||
    lower.includes('menggala mas')
  ) {
    return 'Kec. Tulang Bawang Tengah';
  }

  if (
    lower.includes('tulang bawang udik') ||
    lower.includes('tbu') ||
    lower.includes('kagungan ratu') ||
    lower.includes('karta') ||
    lower.includes('gunung katun') ||
    lower.includes('marga kencana')
  ) {
    return 'Kec. Tulang Bawang Udik';
  }

  if (
    lower.includes('tumijajar') ||
    lower.includes('daya asri') ||
    lower.includes('daya murni') ||
    lower.includes('makarti') ||
    lower.includes('murni jaya') ||
    lower.includes('sumber rejo')
  ) {
    return 'Kec. Tumijajar';
  }

  if (
    lower.includes('gunung batin') ||
    lower.includes('gn batin') ||
    lower.includes('terusan nunyai')
  ) {
    return 'Kec. Terusan Nunyai';
  }

  if (lower.includes('gunung agung') || lower.includes('gn agung')) {
    return 'Kec. Gunung Agung';
  }

  if (lower.includes('gunung terang') || lower.includes('gn terang')) {
    return 'Kec. Gunung Terang';
  }

  if (lower.includes('lambu kibang') || lower.includes('kibang')) {
    return 'Kec. Lambu Kibang';
  }

  if (lower.includes('pagar dewa')) {
    return 'Kec. Pagar Dewa';
  }

  if (lower.includes('way kenanga')) {
    return 'Kec. Way Kenanga';
  }

  if (lower.includes('batu putih')) {
    return 'Kec. Batu Putih';
  }

  if (lower.includes('banjar agung') || lower.includes('unit 2') || lower.includes('unit ii')) {
    return 'Kec. Banjar Agung';
  }

  if (lower.includes('menggala')) {
    return 'Kec. Menggala';
  }

  // 3. Fallback to Tiyuh/Desa if specified
  const tiyuhMatch = text.match(/(?:tiyuh|desa|kelurahan)\s*([a-zA-Z\s]+?)(?:,|$|\.|\b(?:rt|rw)\b)/i);
  if (tiyuhMatch && tiyuhMatch[1]) {
    const rawTiyuh = tiyuhMatch[1].trim();
    if (rawTiyuh.length > 2) {
      const formatted = rawTiyuh
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      return `Wilayah ${formatted}`;
    }
  }

  // 4. Default: first segment of address
  const firstPart = text.split(',')[0].trim();
  if (firstPart.length > 0 && firstPart.length <= 25) {
    return firstPart
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return 'Lainnya / Luar Daerah';
};

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  applicants,
  activeFilter,
  onSelectFilter,
}) => {
  const total = applicants.length;
  const verified = applicants.filter((a) => a.statusVerifikasi === 'TERVERIFIKASI').length;
  const pending = applicants.filter((a) => a.statusVerifikasi === 'MENUNGGU VERIFIKASI').length;
  const needsFix = applicants.filter((a) => a.statusVerifikasi === 'PERLU PERBAIKAN').length;
  const paid = applicants.filter((a) => a.statusPembayaran === 'Sudah').length;
  const pip = applicants.filter((a) => a.pipSebelumnya === 'Ya').length;

  const verifiedPercent = total > 0 ? Math.round((verified / total) * 100) : 0;
  const paidPercent = total > 0 ? Math.round((paid / total) * 100) : 0;

  // Calculate top origin districts / kecamatan from alamatTinggal
  const districtCounts: Record<string, number> = {};
  applicants.forEach((a) => {
    const district = extractKecamatan(a.alamatTinggal);
    districtCounts[district] = (districtCounts[district] || 0) + 1;
  });

  const topDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 6 Grid Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Pendaftar */}
        <button
          onClick={() => onSelectFilter('ALL')}
          className={`text-left p-4 rounded-xl border transition relative overflow-hidden ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Masuk</span>
            <Users className={`w-4 h-4 ${activeFilter === 'ALL' ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight">{total}</div>
          <div className="text-[11px] mt-1 text-slate-400">Pesan ter-ekstrak</div>
        </button>

        {/* Terverifikasi */}
        <button
          onClick={() => onSelectFilter('TERVERIFIKASI')}
          className={`text-left p-4 rounded-xl border transition relative overflow-hidden ${
            activeFilter === 'TERVERIFIKASI'
              ? 'bg-emerald-950 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Terverifikasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{verified}</div>
          <div className="text-[11px] mt-1 text-emerald-700 font-medium">
            {verifiedPercent}% Lolos berkas
          </div>
        </button>

        {/* Menunggu Verifikasi */}
        <button
          onClick={() => onSelectFilter('MENUNGGU VERIFIKASI')}
          className={`text-left p-4 rounded-xl border transition relative overflow-hidden ${
            activeFilter === 'MENUNGGU VERIFIKASI'
              ? 'bg-amber-950 text-white border-amber-800 shadow-md ring-2 ring-amber-500'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Menunggu</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight">{pending}</div>
          <div className="text-[11px] mt-1 text-amber-700 font-medium">Perlu review panitia</div>
        </button>

        {/* Perlu Perbaikan */}
        <button
          onClick={() => onSelectFilter('PERLU PERBAIKAN')}
          className={`text-left p-4 rounded-xl border transition relative overflow-hidden ${
            activeFilter === 'PERLU PERBAIKAN'
              ? 'bg-rose-950 text-white border-rose-800 shadow-md ring-2 ring-rose-500'
              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Perlu Perbaikan</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 tracking-tight">{needsFix}</div>
          <div className="text-[11px] mt-1 text-rose-700 font-medium">Data NISN/WA bermasalah</div>
        </button>

        {/* Sudah Bayar */}
        <button
          onClick={() => onSelectFilter('BAYAR_SUDAH')}
          className={`text-left p-4 rounded-xl border transition relative overflow-hidden ${
            activeFilter === 'BAYAR_SUDAH'
              ? 'bg-blue-950 text-white border-blue-800 shadow-md ring-2 ring-blue-500'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Biaya Lunas</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">{paid}</div>
          <div className="text-[11px] mt-1 text-blue-700 font-medium">
            {paidPercent}% Terkonfirmasi
          </div>
        </button>

        {/* Penerima PIP */}
        <button
          onClick={() => onSelectFilter('PIP_YA')}
          className={`text-left p-4 rounded-xl border transition relative overflow-hidden ${
            activeFilter === 'PIP_YA'
              ? 'bg-purple-950 text-white border-purple-800 shadow-md ring-2 ring-purple-500'
              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">Penerima PIP</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 tracking-tight">{pip}</div>
          <div className="text-[11px] mt-1 text-purple-700 font-medium">Jalur afirmasi</div>
        </button>
      </div>

      {/* Origin Region/Kecamatan Breakdown & Payment Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Origin Districts Bar */}
        <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-800">Distribusi Asal Daerah Teratas</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">{Object.keys(districtCounts).length} Kecamatan Terdata</span>
          </div>

          <div className="space-y-2.5">
            {topDistricts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada data pendaftar</p>
            ) : (
              topDistricts.map(([districtName, count]) => {
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={districtName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[280px]">{districtName}</span>
                      <span className="text-slate-500 font-semibold">{count} santri ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Summary Ratio */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Rasio Kesiapan Berkas</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Tingkat Kelolosan Verifikasi</span>
                  <span className="font-semibold text-emerald-600">{verifiedPercent}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${verifiedPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Pelunasan Administrasi</span>
                  <span className="font-semibold text-blue-600">{paidPercent}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sistem Otomasi: <strong className="text-emerald-700 font-medium">Aktif</strong></span>
            <span>Real-time Live Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};
