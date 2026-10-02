import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
  FileSpreadsheet,
  Download,
  Eye,
  Send,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  ChevronDown,
  Sparkles,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Pendaftar, VerificationStatus } from '../types';
import { sendApplicantWhatsAppNotification } from '../services/whatsappNotification';

interface MonitoringTableProps {
  applicants: Pendaftar[];
  onSelectApplicant: (applicant: Pendaftar) => void;
  onUpdateStatus: (id: string, newStatus: VerificationStatus) => void;
  onDeleteApplicant: (id: string) => void;
  onBulkDeleteApplicants?: (ids: string[]) => void;
  onSyncSingleToSheets: (applicant: Pendaftar) => Promise<void>;
  onExportExcel: (customList?: Pendaftar[]) => void;
  onSendNotification: (
    applicant: Pendaftar,
    type: 'KONFIRMASI_PENDAFTARAN' | 'VERIFIKASI_BERHASIL' | 'PERBAIKAN_BERKAS'
  ) => void;
  isSheetsConnected: boolean;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onFetchFromSheets?: () => Promise<void>;
  isFetchingFromSheets?: boolean;
  onOpenSheetsModal?: () => void;
}

export const MonitoringTable: React.FC<MonitoringTableProps> = ({
  applicants,
  onSelectApplicant,
  onUpdateStatus,
  onDeleteApplicant,
  onBulkDeleteApplicants,
  onSyncSingleToSheets,
  onExportExcel,
  onSendNotification,
  isSheetsConnected,
  activeFilter,
  onFilterChange,
  onFetchFromSheets,
  isFetchingFromSheets = false,
  onOpenSheetsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [applicantToDelete, setApplicantToDelete] = useState<Pendaftar | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Filter and search
  const filteredApplicants = useMemo(() => {
    return applicants.filter((item) => {
      // 1. Category Filter
      if (activeFilter === 'TERVERIFIKASI' && item.statusVerifikasi !== 'TERVERIFIKASI') return false;
      if (activeFilter === 'MENUNGGU VERIFIKASI' && item.statusVerifikasi !== 'MENUNGGU VERIFIKASI') return false;
      if (activeFilter === 'PERLU PERBAIKAN' && item.statusVerifikasi !== 'PERLU PERBAIKAN') return false;
      if (activeFilter === 'BAYAR_SUDAH' && item.statusPembayaran !== 'Sudah') return false;
      if (activeFilter === 'BAYAR_BELUM' && item.statusPembayaran !== 'Belum') return false;
      if (activeFilter === 'PIP_YA' && item.pipSebelumnya !== 'Ya') return false;

      // 2. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.namaLengkap.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.nisn.toLowerCase().includes(q) ||
        item.noWa.toLowerCase().includes(q) ||
        item.asalSekolah.toLowerCase().includes(q) ||
        item.namaWali.toLowerCase().includes(q)
      );
    });
  }, [applicants, activeFilter, searchQuery]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredApplicants.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getStatusBadge = (status: VerificationStatus, score: number) => {
    switch (status) {
      case 'TERVERIFIKASI':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terverifikasi</span>
            <span className="text-[10px] opacity-75">({score}%)</span>
          </span>
        );
      case 'MENUNGGU VERIFIKASI':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu</span>
            <span className="text-[10px] opacity-75">({score}%)</span>
          </span>
        );
      case 'PERLU PERBAIKAN':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Perlu Perbaikan</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            <XCircle className="w-3.5 h-3.5" />
            <span>Ditolak</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Search & Filter Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NISN, WhatsApp, atau sekolah..."
              className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>

          {/* Right Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Count summary */}
            <span className="text-xs text-slate-500">
              Menampilkan <strong>{filteredApplicants.length}</strong> dari <strong>{applicants.length}</strong> pendaftar
            </span>

            {/* Fetch/Sync from Sheets button */}
            {onFetchFromSheets && (
              <button
                onClick={onFetchFromSheets}
                disabled={isFetchingFromSheets}
                className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-300/80 text-xs font-semibold px-3 py-2 rounded-lg transition disabled:opacity-50"
                title={
                  isSheetsConnected
                    ? 'Tarik dan sinkronkan data pendaftar dari Google Sheets'
                    : 'Hubungkan Google Sheets untuk menarik data'
                }
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-700 ${isFetchingFromSheets ? 'animate-spin' : ''}`}
                />
                <span>{isFetchingFromSheets ? 'Menarik...' : 'Tarik dari Sheets'}</span>
              </button>
            )}

            {/* Quick Export Excel */}
            <button
              onClick={() =>
                onExportExcel(
                  selectedIds.length > 0
                    ? applicants.filter((a) => selectedIds.includes(a.id))
                    : filteredApplicants
                )
              }
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>
                {selectedIds.length > 0
                  ? `Ekspor (${selectedIds.length})`
                  : 'Ekspor Excel'}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'TERVERIFIKASI', label: 'Terverifikasi' },
            { id: 'MENUNGGU VERIFIKASI', label: 'Menunggu Verifikasi' },
            { id: 'PERLU PERBAIKAN', label: 'Perlu Perbaikan' },
            { id: 'BAYAR_SUDAH', label: 'Sudah Bayar' },
            { id: 'BAYAR_BELUM', label: 'Belum Bayar' },
            { id: 'PIP_YA', label: 'Penerima PIP' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Action Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>{selectedIds.length}</strong> siswa dipilih
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                selectedIds.forEach((id) => onUpdateStatus(id, 'TERVERIFIKASI'));
                setSelectedIds([]);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition"
            >
              Tandai Terverifikasi
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium transition flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-slate-600 hover:text-slate-800"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredApplicants.length > 0 &&
                    selectedIds.length === filteredApplicants.length
                  }
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th className="py-3 px-3">ID Pendaftaran</th>
              <th className="py-3 px-3">Calon Siswa & NISN</th>
              <th className="py-3 px-3">Asal Sekolah</th>
              <th className="py-3 px-3">WhatsApp Pendaftar</th>
              <th className="py-3 px-3">Administrasi</th>
              <th className="py-3 px-3">Status Verifikasi</th>
              <th className="py-3 px-3">Google Sheets</th>
              <th className="py-3 px-3 text-right">Aksi & Notifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredApplicants.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="max-w-md mx-auto space-y-2.5 px-4">
                    {applicants.length === 0 ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-2xs border border-emerald-100">
                          <Users className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="font-bold text-slate-800 text-base">Belum Ada Pendaftar Masuk</p>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                          Dasbor siap menerima pendaftar baru. Data santri yang dikirimkan calon wali melalui Chatbot Layanan Pendaftaran akan langsung tercatat di sini secara otomatis.
                        </p>
                        {onFetchFromSheets && (
                          <div className="pt-3">
                            <button
                              onClick={onFetchFromSheets}
                              disabled={isFetchingFromSheets}
                              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isFetchingFromSheets ? 'animate-spin' : ''}`}
                              />
                              <span>
                                {isFetchingFromSheets
                                  ? 'Sedang Menarik Data...'
                                  : 'Tarik Data dari Google Sheets'}
                              </span>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-700 text-sm">Tidak ada pendaftar yang cocok</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Coba sesuaikan kata kunci pencarian atau pilih filter status lain di tab atas.
                        </p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredApplicants.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectApplicant(item)}
                  className="hover:bg-slate-50/80 transition cursor-pointer group"
                >
                  {/* Checkbox */}
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>

                  {/* ID Pendaftaran */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.id}
                      </span>
                      <button
                        onClick={(e) => handleCopyId(item.id, e)}
                        className="text-slate-400 hover:text-emerald-600 p-0.5 rounded"
                        title="Salin ID Pendaftaran"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {item.timestamp}
                    </span>
                  </td>

                  {/* Calon Siswa & NISN */}
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 leading-tight">
                      {item.namaLengkap}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                      <span>NISN: <strong className="font-mono text-slate-700">{item.nisn}</strong></span>
                      <span>•</span>
                      <span>{item.tanggalLahir}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                      Wali: {item.namaWali}
                    </div>
                  </td>

                  {/* Asal Sekolah */}
                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-700 block">
                      {item.asalSekolah}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block max-w-[180px]">
                      {item.alamatTinggal}
                    </span>
                  </td>

                  {/* No WhatsApp */}
                  <td
                    className="py-3 px-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`https://wa.me/${item.normalizedWa}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      <span>{item.noWa}</span>
                    </a>
                  </td>

                  {/* Administrasi (PIP & Bayar) */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="space-y-1">
                      <div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            item.statusPembayaran === 'Sudah'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Bayar: {item.statusPembayaran}
                        </span>
                        {item.statusPembayaran === 'Sudah' && item.metodeTransfer && (
                          <span className="block text-[9px] text-slate-500 font-medium truncate max-w-[120px]" title={`${item.metodeTransfer} - Rp ${item.nominalTransfer || ''} (${item.namaPengirimTransfer || ''})`}>
                            {item.metodeTransfer} • {item.nominalTransfer ? `Rp ${item.nominalTransfer}` : ''}
                          </span>
                        )}
                      </div>
                      <div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            item.pipSebelumnya === 'Ya'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          PIP: {item.pipSebelumnya}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Status Verifikasi */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getStatusBadge(item.statusVerifikasi, item.verificationScore)}
                  </td>

                  {/* Google Sheets Sync status */}
                  <td
                    className="py-3 px-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.syncedToSheets ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Tersimpan</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onSyncSingleToSheets(item)}
                        className={`inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded border transition ${
                          isSheetsConnected
                            ? 'text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border-slate-200'
                            : 'text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300 font-medium'
                        }`}
                        title={isSheetsConnected ? 'Sinkronkan ke Google Sheets' : 'Klik untuk hubungkan Google Sheets'}
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>{isSheetsConnected ? 'Sinkronkan' : 'Sambungkan'}</span>
                      </button>
                    )}
                  </td>

                  {/* Actions & WhatsApp Notifications */}
                  <td
                    className="py-3 px-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      {/* Kirim Konfirmasi ID */}
                      <button
                        onClick={() => onSendNotification(item, 'KONFIRMASI_PENDAFTARAN')}
                        className={`p-1.5 rounded-lg border transition ${
                          item.notifPendaftaranTerkirim
                            ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                        }`}
                        title="Kirim Notifikasi Konfirmasi WA (dengan No ID Unik)"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      {/* Kirim Verifikasi Lolos */}
                      <button
                        onClick={() => onSendNotification(item, 'VERIFIKASI_BERHASIL')}
                        className={`p-1.5 rounded-lg border transition ${
                          item.notifVerifikasiTerkirim
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                        }`}
                        title="Kirim Notifikasi Lolos Verifikasi Berkas via WhatsApp"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Detail Modal */}
                      <button
                        onClick={() => onSelectApplicant(item)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        title="Lihat Detail & Edit Berkas"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setApplicantToDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus Data"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Konfirmasi Hapus Data Tunggal */}
      {applicantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Hapus Data Pendaftar?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tindakan ini akan menghapus data pendaftaran berikut dari sistem pemantauan:
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Santri:</span>
                  <span className="font-bold text-slate-800">{applicantToDelete.namaLengkap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor ID:</span>
                  <span className="font-mono font-semibold text-emerald-700">{applicantToDelete.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Asal Sekolah:</span>
                  <span className="text-slate-700">{applicantToDelete.asalSekolah}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. WhatsApp:</span>
                  <span className="text-slate-700">{applicantToDelete.noWa}</span>
                </div>
              </div>

              {isSheetsConnected && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  Data santri ini juga akan otomatis dihapus langsung dari baris Google Sheets Anda.
                </p>
              )}

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setApplicantToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteApplicant(applicantToDelete.id);
                    setApplicantToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Massal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Hapus {selectedIds.length} Data Santri Terpilih?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Apakah Anda yakin ingin menghapus seluruh <strong>{selectedIds.length}</strong> data santri yang telah Anda centang?
                  </p>
                </div>
              </div>

              {isSheetsConnected && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  Seluruh baris pendaftar terpilih ini juga akan otomatis dihapus langsung dari Google Sheets.
                </p>
              )}

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onBulkDeleteApplicants) {
                      onBulkDeleteApplicants(selectedIds);
                    } else {
                      selectedIds.forEach((id) => onDeleteApplicant(id));
                    }
                    setSelectedIds([]);
                    setIsBulkDeleteModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Semua Terpilih</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
