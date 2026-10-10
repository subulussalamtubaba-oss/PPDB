export type VerificationStatus = 'TERVERIFIKASI' | 'MENUNGGU VERIFIKASI' | 'PERLU PERBAIKAN' | 'DITOLAK';

export interface Pendaftar {
  id: string; // e.g. A-2026-0001
  timestamp: string; // ISO format or displayable string
  rawMessage: string;
  namaLengkap: string;
  tanggalLahir: string;
  namaWali: string;
  alamatTinggal: string;
  asalSekolah: string;
  noWa: string;
  normalizedWa: string; // international format for wa.me, e.g. 62812...
  nisn: string;
  pipSebelumnya: 'Ya' | 'Tidak';
  statusPembayaran: 'Sudah' | 'Belum';
  waktuTransfer?: string;
  metodeTransfer?: string; // e.g. "Bank BRI", "DANA", "BCA", dll
  namaPengirimTransfer?: string;
  nominalTransfer?: string;
  statusVerifikasi: VerificationStatus;
  catatanVerifikasi: string[];
  verificationScore: number; // 0 to 100
  syncedToSheets: boolean;
  sheetsRowIndex?: number;
  notifPendaftaranTerkirim: boolean;
  notifVerifikasiTerkirim: boolean;
  lastNotifSentAt?: string;
}

export interface ExtractionResult {
  success: boolean;
  data?: Partial<Pendaftar>;
  issues: string[];
  warningMessage?: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetName: string;
  autoSync: boolean;
}

export interface WhatsAppNotificationLog {
  id: string;
  pendaftarId: string;
  namaLengkap: string;
  noWa: string;
  type:
    | 'KONFIRMASI_PENDAFTARAN'
    | 'VERIFIKASI_BERHASIL'
    | 'PERBAIKAN_BERKAS'
    | 'BERKAS_DITERIMA'
    | 'KURANG_PERSYARATAN'
    | 'JADWAL_TES'
    | 'PENGINGAT_BIAYA'
    | 'CUSTOM';
  timestamp: string;
  messageText: string;
  status: 'TERKIRIM' | 'MENUNGGU' | 'GAGAL';
}

export interface AcademicYearConfig {
  tahunPelajaran: string; // e.g. "2026/2027", "2027/2028"
  angkatan: string; // e.g. "7", "8"
  biayaPendaftaran: string; // e.g. "150.000"
  rekeningPembayaran: string; // e.g. "7702 0102 2580 530 a/n ponpes Subulussalam (Bank BRI)"
  kontakAdminWa: string; // e.g. "085832297239"
  kodeTahunId: string; // e.g. "2026"
  namaSekolah: string; // e.g. "Pondok Pesantren & Madrasah Subulussalam"
  logoUrl?: string; // URL gambar atau Data URL logo resmi pondok pesantren
  // Fitur Iklan Promo Potongan Biaya Pendaftaran
  promoDiskonAktif?: boolean;
  persenDiskon?: number; // e.g. 50 (50%)
  kuotaPendaftarDiskon?: number; // e.g. 15 (15 pendaftar pertama)
  pesanIklanPromo?: string; // e.g. "PROMO SPESIAL: Potongan 50% Biaya Pendaftaran untuk 15 Pendaftar Pertama!"
}

export const DEFAULT_ACADEMIC_YEAR_CONFIG: AcademicYearConfig = {
  tahunPelajaran: '2026/2027',
  angkatan: '7',
  biayaPendaftaran: '150.000',
  rekeningPembayaran: '7702 0102 2580 530 a/n ponpes Subulussalam (Bank BRI)',
  kontakAdminWa: '085832297239',
  kodeTahunId: '2026',
  namaSekolah: 'Pondok Pesantren & Madrasah Subulussalam',
  logoUrl: '',
  promoDiskonAktif: true,
  persenDiskon: 50,
  kuotaPendaftarDiskon: 15,
  pesanIklanPromo: 'PROMO KHUSUS: Potongan Biaya Pendaftaran 50% untuk 15 Pendaftar Pertama!',
};
