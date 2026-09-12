import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  MessageSquare,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  ShieldCheck,
  Save,
} from 'lucide-react';
import { Pendaftar, VerificationStatus } from '../types';
import {
  buildRegistrationConfirmationMessage,
  buildVerificationSuccessMessage,
  buildVerificationRevisionMessage,
  buildApplicantNoticeToCommitteeMessage,
  getWhatsAppWebLink,
  sendApplicantWhatsAppNotification,
} from '../services/whatsappNotification';
import { runAutomaticVerification } from '../services/verificationEngine';

interface ApplicantDetailModalProps {
  applicant: Pendaftar | null;
  onClose: () => void;
  onUpdateApplicant: (updated: Pendaftar) => void;
  onSyncToSheets: (applicant: Pendaftar) => Promise<void>;
  isSheetsConnected: boolean;
  allApplicants: Pendaftar[];
}

export const ApplicantDetailModal: React.FC<ApplicantDetailModalProps> = ({
  applicant,
  onClose,
  onUpdateApplicant,
  onSyncToSheets,
  isSheetsConnected,
  allApplicants,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'NOTIFIKASI_WA' | 'EDIT_DATA' | 'RAW_MESSAGE'>('OVERVIEW');
  const [notifTemplate, setNotifTemplate] = useState<
    'KONFIRMASI_PENDAFTARAN' | 'VERIFIKASI_BERHASIL' | 'PERBAIKAN_BERKAS' | 'PEMBERITAHUAN_PANITIA'
  >(applicant?.statusVerifikasi === 'TERVERIFIKASI' ? 'VERIFIKASI_BERHASIL' : 'KONFIRMASI_PENDAFTARAN');

  // Editable fields state
  const [editForm, setEditForm] = useState({
    namaLengkap: applicant?.namaLengkap || '',
    tanggalLahir: applicant?.tanggalLahir || '',
    namaWali: applicant?.namaWali || '',
    alamatTinggal: applicant?.alamatTinggal || '',
    asalSekolah: applicant?.asalSekolah || '',
    noWa: applicant?.noWa || '',
    nisn: applicant?.nisn || '',
    pipSebelumnya: applicant?.pipSebelumnya || 'Tidak',
    statusPembayaran: applicant?.statusPembayaran || 'Belum',
    statusVerifikasi: applicant?.statusVerifikasi || ('MENUNGGU VERIFIKASI' as VerificationStatus),
  });

  // Custom notification message text
  const [customMessage, setCustomMessage] = useState<string>(() => {
    if (!applicant) return '';
    return applicant.statusVerifikasi === 'TERVERIFIKASI'
      ? buildVerificationSuccessMessage(applicant)
      : buildRegistrationConfirmationMessage(applicant);
  });

  const [copiedId, setCopiedId] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!applicant) return null;

  const handleTemplateChange = (
    tmpl: 'KONFIRMASI_PENDAFTARAN' | 'VERIFIKASI_BERHASIL' | 'PERBAIKAN_BERKAS' | 'PEMBERITAHUAN_PANITIA'
  ) => {
    setNotifTemplate(tmpl);
    if (tmpl === 'KONFIRMASI_PENDAFTARAN') {
      setCustomMessage(buildRegistrationConfirmationMessage(applicant));
    } else if (tmpl === 'VERIFIKASI_BERHASIL') {
      setCustomMessage(buildVerificationSuccessMessage(applicant));
    } else if (tmpl === 'PERBAIKAN_BERKAS') {
      setCustomMessage(buildVerificationRevisionMessage(applicant));
    } else {
      setCustomMessage(buildApplicantNoticeToCommitteeMessage(applicant));
    }
  };

  const handleSendWhatsApp = () => {
    const waUrl = getWhatsAppWebLink(applicant.normalizedWa, customMessage);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Update applicant state
    const updated: Pendaftar = {
      ...applicant,
      notifPendaftaranTerkirim:
        notifTemplate === 'KONFIRMASI_PENDAFTARAN' ? true : applicant.notifPendaftaranTerkirim,
      notifVerifikasiTerkirim:
        notifTemplate === 'VERIFIKASI_BERHASIL' ? true : applicant.notifVerifikasiTerkirim,
      lastNotifSentAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    onUpdateApplicant(updated);
  };

  const handleSaveEdit = () => {
    // Re-verify with new data
    const verification = runAutomaticVerification(
      {
        namaLengkap: editForm.namaLengkap,
        tanggalLahir: editForm.tanggalLahir,
        namaWali: editForm.namaWali,
        alamatTinggal: editForm.alamatTinggal,
        asalSekolah: editForm.asalSekolah,
        noWa: editForm.noWa,
        nisn: editForm.nisn,
        pipSebelumnya: editForm.pipSebelumnya,
        statusPembayaran: editForm.statusPembayaran,
      },
      allApplicants,
      applicant.id
    );

    const updated: Pendaftar = {
      ...applicant,
      ...editForm,
      verificationScore: verification.score,
      catatanVerifikasi: verification.issues,
      statusVerifikasi: editForm.statusVerifikasi,
    };

    onUpdateApplicant(updated);
    setActiveTab('OVERVIEW');
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncToSheets(applicant);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="font-mono font-bold text-sm bg-emerald-700/80 text-white px-2.5 py-1 rounded-lg border border-emerald-500/40">
              {applicant.id}
            </span>
            <div>
              <h2 className="text-base font-bold leading-tight">{applicant.namaLengkap}</h2>
              <p className="text-xs text-slate-400">
                NISN: {applicant.nisn} • Asal: {applicant.asalSekolah}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 text-xs font-semibold text-slate-600 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Ringkasan & Verifikasi
          </button>
          <button
            onClick={() => setActiveTab('NOTIFIKASI_WA')}
            className={`py-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'NOTIFIKASI_WA'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Kirim WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveTab('EDIT_DATA')}
            className={`py-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'EDIT_DATA'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Koreksi Data</span>
          </button>
          <button
            onClick={() => setActiveTab('RAW_MESSAGE')}
            className={`py-3 border-b-2 transition whitespace-nowrap ${
              activeTab === 'RAW_MESSAGE'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Pesan Asli WA
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* Status and Score Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Status Verifikasi Berkas
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <select
                      value={applicant.statusVerifikasi}
                      onChange={(e) => {
                        const newStatus = e.target.value as VerificationStatus;
                        onUpdateApplicant({ ...applicant, statusVerifikasi: newStatus });
                      }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="TERVERIFIKASI">TERVERIFIKASI (LOLOS BERKAS)</option>
                      <option value="MENUNGGU VERIFIKASI">MENUNGGU VERIFIKASI</option>
                      <option value="PERLU PERBAIKAN">PERLU PERBAIKAN</option>
                      <option value="DITOLAK">DITOLAK</option>
                    </select>
                  </div>
                </div>

                {/* Score badge */}
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Skor Validitas Data
                  </span>
                  <span className="text-xl font-bold text-emerald-700">
                    {applicant.verificationScore}%
                  </span>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Nama Lengkap Siswa</span>
                  <span className="font-bold text-slate-800 text-sm">{applicant.namaLengkap}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Tanggal Lahir</span>
                  <span className="font-semibold text-slate-800">{applicant.tanggalLahir}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Nama Wali / Orang Tua</span>
                  <span className="font-semibold text-slate-800">{applicant.namaWali}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Asal Sekolah (SMP/MTs)</span>
                  <span className="font-semibold text-slate-800">{applicant.asalSekolah}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Alamat Domisili</span>
                  <span className="font-semibold text-slate-800">{applicant.alamatTinggal}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Nomor WhatsApp</span>
                  <a
                    href={`https://wa.me/${applicant.normalizedWa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-700 hover:underline flex items-center space-x-1"
                  >
                    <span>{applicant.noWa}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Nomor NISN</span>
                  <span className="font-mono font-bold text-slate-800">{applicant.nisn}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Penerima PIP / Biaya</span>
                  <span className="font-semibold text-slate-800">
                    PIP: {applicant.pipSebelumnya} • Bayar: {applicant.statusPembayaran}
                  </span>
                </div>
              </div>

              {/* Verification Assessment Notes */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Hasil Pemeriksaan Sistem Otomatis:</span>
                </div>
                {applicant.catatanVerifikasi.length === 0 ? (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-medium">
                    ✓ Data pendaftaran lengkap, format nomor WhatsApp valid, dan nomor NISN 10 digit terkonfirmasi.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {applicant.catatanVerifikasi.map((catatan, idx) => (
                      <li
                        key={idx}
                        className="flex items-start space-x-2 text-amber-800 bg-amber-50 p-2 rounded border border-amber-200"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <span>{catatan}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {activeTab === 'NOTIFIKASI_WA' && (
            <div className="space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-2">
                  Pilih Template Notifikasi WhatsApp Resmi:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleTemplateChange('KONFIRMASI_PENDAFTARAN')}
                    className={`p-3 rounded-xl border text-left transition ${
                      notifTemplate === 'KONFIRMASI_PENDAFTARAN'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 block">1. Konfirmasi ID</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Ke Wali</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Surat tanda terima pendaftaran & ID resmi
                    </span>
                  </button>

                  <button
                    onClick={() => handleTemplateChange('VERIFIKASI_BERHASIL')}
                    className={`p-3 rounded-xl border text-left transition ${
                      notifTemplate === 'VERIFIKASI_BERHASIL'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 block">2. Lolos Berkas</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Ke Wali</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Pemberitahuan verifikasi lolos & tahapan lanjut
                    </span>
                  </button>

                  <button
                    onClick={() => handleTemplateChange('PERBAIKAN_BERKAS')}
                    className={`p-3 rounded-xl border text-left transition ${
                      notifTemplate === 'PERBAIKAN_BERKAS'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 block">3. Revisi Berkas</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Ke Wali</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Permintaan revisi NISN/data kurang lengkap
                    </span>
                  </button>

                  <button
                    onClick={() => handleTemplateChange('PEMBERITAHUAN_PANITIA')}
                    className={`p-3 rounded-xl border text-left transition ${
                      notifTemplate === 'PEMBERITAHUAN_PANITIA'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 block">4. Format Panitia</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">Ke Panitia</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Surat pemberitahuan pendaftaran santri baru
                    </span>
                  </button>
                </div>
              </div>

              {/* Message text editor */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">Teks Pesan WhatsApp (Dapat Diedit):</span>
                  <span className="text-[11px] text-slate-500">
                    {notifTemplate === 'PEMBERITAHUAN_PANITIA' ? (
                      <span className="text-amber-700 font-medium">Format Pemberitahuan Masuk ke Panitia PPDB</span>
                    ) : (
                      <span>Tujuan: <strong>{applicant.noWa}</strong> (Wali Santri)</span>
                    )}
                  </span>
                </div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={9}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                <div className="text-[11px] text-slate-500">
                  Status Notifikasi: {applicant.notifPendaftaranTerkirim ? '✓ Konfirmasi Terkirim' : 'Belum Dikirim'}
                  {applicant.notifVerifikasiTerkirim && ' • ✓ Verifikasi Terkirim'}
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(customMessage);
                      setCopiedMessage(true);
                      setTimeout(() => setCopiedMessage(false), 2500);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition text-xs"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSendWhatsApp}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition shadow-sm text-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>{notifTemplate === 'PEMBERITAHUAN_PANITIA' ? 'Buka di WhatsApp' : 'Kirim ke Wali Santri'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'EDIT_DATA' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-500">
                Perbaiki kesalahan ketik pada data pendaftar. Sistem akan secara otomatis menguji ulang keabsahan NISN dan tanggal lahir setelah disimpan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={editForm.namaLengkap}
                    onChange={(e) => setEditForm({ ...editForm, namaLengkap: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Lahir</label>
                  <input
                    type="text"
                    value={editForm.tanggalLahir}
                    onChange={(e) => setEditForm({ ...editForm, tanggalLahir: e.target.value })}
                    placeholder="Contoh: 14-05-2010"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Wali / Orang Tua</label>
                  <input
                    type="text"
                    value={editForm.namaWali}
                    onChange={(e) => setEditForm({ ...editForm, namaWali: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor NISN (10 Digit)</label>
                  <input
                    type="text"
                    value={editForm.nisn}
                    onChange={(e) => setEditForm({ ...editForm, nisn: e.target.value })}
                    className="w-full p-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor WhatsApp Pendaftar</label>
                  <input
                    type="text"
                    value={editForm.noWa}
                    onChange={(e) => setEditForm({ ...editForm, noWa: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Asal Sekolah</label>
                  <input
                    type="text"
                    value={editForm.asalSekolah}
                    onChange={(e) => setEditForm({ ...editForm, asalSekolah: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Alamat Tempat Tinggal</label>
                  <input
                    type="text"
                    value={editForm.alamatTinggal}
                    onChange={(e) => setEditForm({ ...editForm, alamatTinggal: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mendapatkan PIP Sebelumnya?</label>
                  <select
                    value={editForm.pipSebelumnya}
                    onChange={(e) =>
                      setEditForm({ ...editForm, pipSebelumnya: e.target.value as 'Ya' | 'Tidak' })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Ya">Ya (Penerima PIP)</option>
                    <option value="Tidak">Tidak</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Pembayaran</label>
                  <select
                    value={editForm.statusPembayaran}
                    onChange={(e) =>
                      setEditForm({ ...editForm, statusPembayaran: e.target.value as 'Sudah' | 'Belum' })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Sudah">Sudah Membayar</option>
                    <option value="Belum">Belum Membayar</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-2 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan & Verifikasi Ulang</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'RAW_MESSAGE' && (
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-700 block">
                Pesan WhatsApp Asli yang Diterima Sistem:
              </span>
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono rounded-xl overflow-x-auto text-[11px] whitespace-pre-wrap">
                {applicant.rawMessage}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {applicant.syncedToSheets ? (
              <span className="text-emerald-700 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tersimpan di Google Sheets</span>
              </span>
            ) : (
              <button
                onClick={handleTriggerSync}
                disabled={!isSheetsConnected || isSyncing}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-200 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg font-medium transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Simpan ke Google Sheets'}</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
