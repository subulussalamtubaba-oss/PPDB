import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Layers,
  CreditCard,
  Phone,
  School,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Tag,
  Percent,
  Flame,
} from 'lucide-react';
import { AcademicYearConfig, DEFAULT_ACADEMIC_YEAR_CONFIG } from '../types';

interface AcademicYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AcademicYearConfig;
  onSaveConfig: (config: AcademicYearConfig) => void;
}

export const AcademicYearModal: React.FC<AcademicYearModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [form, setForm] = useState<AcademicYearConfig>(config);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setForm(config);
    setIsSaved(false);
  }, [config, isOpen]);

  if (!isOpen) return null;

  // When tahunPelajaran changes (e.g. "2027/2028"), automatically suggest kodeTahunId (e.g. "2027")
  const handleTahunPelajaranChange = (value: string) => {
    const firstYear = value.split('/')[0]?.replace(/\D/g, '');
    setForm((prev) => ({
      ...prev,
      tahunPelajaran: value,
      kodeTahunId: firstYear && firstYear.length === 4 ? firstYear : prev.kodeTahunId,
    }));
  };

  const handleQuickTapel = (tapel: string, angkatan: string) => {
    const firstYear = tapel.split('/')[0];
    setForm((prev) => ({
      ...prev,
      tahunPelajaran: tapel,
      angkatan,
      kodeTahunId: firstYear,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(form);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleResetDefault = () => {
    if (confirm('Kembalikan pengaturan Tahun Pelajaran ke nilai bawaan (2026/2027 Angkatan 7)?')) {
      setForm(DEFAULT_ACADEMIC_YEAR_CONFIG);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Pengaturan Tahun Pelajaran & Pendaftaran
              </h2>
              <p className="text-xs text-slate-300">
                Sesuaikan angkatan, tahun ajaran, dan rekening untuk operasional tahunan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-5 flex-1">
          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan tahun pelajaran berhasil disimpan dan langsung diterapkan ke seluruh sistem!</span>
            </div>
          )}

          {/* Quick Year Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilihan Cepat Tahun Ajaran Mendatang:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { tapel: '2026/2027', angkatan: '7' },
                { tapel: '2027/2028', angkatan: '8' },
                { tapel: '2028/2029', angkatan: '9' },
                { tapel: '2029/2030', angkatan: '10' },
              ].map((preset) => (
                <button
                  key={preset.tapel}
                  type="button"
                  onClick={() => handleQuickTapel(preset.tapel, preset.angkatan)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    form.tahunPelajaran === preset.tapel
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-bold">{preset.tapel}</p>
                  <p className="text-[10px] opacity-80">Angkatan {preset.angkatan}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tahun Pelajaran Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tahun Pelajaran (Format: YYYY/YYYY)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.tahunPelajaran}
                  onChange={(e) => handleTahunPelajaranChange(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Contoh: 2026/2027, 2027/2028</p>
            </div>

            {/* Angkatan Santri */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Angkatan Santri Baru
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.angkatan}
                  onChange={(e) => setForm({ ...form, angkatan: e.target.value })}
                  placeholder="7"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Contoh: 7 (untuk Angkatan ke-7)</p>
            </div>

            {/* Kode Awalan ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kode Tahun ID Santri
              </label>
              <input
                type="text"
                required
                value={form.kodeTahunId}
                onChange={(e) => setForm({ ...form, kodeTahunId: e.target.value })}
                placeholder="2026"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Format ID yang dihasilkan: <span className="font-mono text-emerald-700 font-bold">A-{form.kodeTahunId || '2026'}-0001</span>
              </p>
            </div>

            {/* Biaya Pendaftaran */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Biaya Pendaftaran Santri (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  required
                  value={form.biayaPendaftaran}
                  onChange={(e) => setForm({ ...form, biayaPendaftaran: e.target.value })}
                  placeholder="150.000"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Contoh: 150.000 atau 200.000</p>
            </div>
          </div>

          {/* Rekening Tujuan Pembayaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Instruksi Rekening Pembayaran Resmi
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={form.rekeningPembayaran}
                onChange={(e) => setForm({ ...form, rekeningPembayaran: e.target.value })}
                placeholder="7702 0102 2580 530 a/n ponpes Subulussalam (Bank BRI)"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Nomor rekening ini akan disampaikan oleh chatbot kepada wali santri saat proses pendaftaran.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* No WhatsApp Panitia */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                No. WhatsApp Admin / Panitia
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.kontakAdminWa}
                  onChange={(e) => setForm({ ...form, kontakAdminWa: e.target.value })}
                  placeholder="085832297239"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Nama Lembaga / Sekolah */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lembaga / Pondok
              </label>
              <div className="relative">
                <School className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.namaSekolah}
                  onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })}
                  placeholder="Pondok Pesantren & Madrasah Subulussalam"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Pengaturan Promo Iklan Potongan Biaya Pendaftaran */}
          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                    <span>Program Iklan Promo Potongan Biaya Pendaftaran</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded-full">
                      Otomatis
                    </span>
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Otomatis memotong biaya pendaftaran bagi sejumlah pendaftar pertama
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.promoDiskonAktif ?? true}
                  onChange={(e) => setForm({ ...form, promoDiskonAktif: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {form.promoDiskonAktif && (
              <div className="space-y-3 pt-1 border-t border-amber-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-950 mb-1">
                      Besar Potongan Biaya (%)
                    </label>
                    <div className="relative">
                      <Percent className="w-4 h-4 absolute left-3 top-2.5 text-amber-600" />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={form.persenDiskon ?? 50}
                        onChange={(e) =>
                          setForm({ ...form, persenDiskon: Number(e.target.value) || 0 })
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-950"
                      />
                    </div>
                    <p className="text-[10px] text-amber-700 mt-1">
                      Contoh: 50 untuk diskon 50%
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-950 mb-1">
                      Kuota Maksimal Pendaftar Pertama
                    </label>
                    <div className="relative">
                      <Tag className="w-4 h-4 absolute left-3 top-2.5 text-amber-600" />
                      <input
                        type="number"
                        min="1"
                        value={form.kuotaPendaftarDiskon ?? 15}
                        onChange={(e) =>
                          setForm({ ...form, kuotaPendaftarDiskon: Number(e.target.value) || 1 })
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-950"
                      />
                    </div>
                    <p className="text-[10px] text-amber-700 mt-1">
                      Contoh: 15 untuk 15 pendaftar pertama
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    Teks Iklan / Pengumuman Promo pada Chat
                  </label>
                  <input
                    type="text"
                    value={
                      form.pesanIklanPromo ??
                      `PROMO SPESIAL: Potongan Biaya Pendaftaran ${form.persenDiskon || 50}% untuk ${form.kuotaPendaftarDiskon || 15} Pendaftar Pertama!`
                    }
                    onChange={(e) => setForm({ ...form, pesanIklanPromo: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pratinjau Pesan Sambutan Chatbot untuk Wali Santri:</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed font-sans shadow-2xs">
              <p>
                &ldquo;Selamat datang di Layanan Penerimaan Santri Baru (PSB){' '}
                <strong>{form.namaSekolah}</strong> Tahun Pelajaran{' '}
                <strong className="text-emerald-700">{form.tahunPelajaran}</strong> (Angkatan{' '}
                <strong className="text-emerald-700">{form.angkatan}</strong>).
                Biaya pendaftaran sebesar <strong>Rp {form.biayaPendaftaran}</strong> ke rekening{' '}
                <strong>{form.rekeningPembayaran}</strong>.&rdquo;
              </p>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
