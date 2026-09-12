import * as XLSX from 'xlsx';
import { Pendaftar } from '../types';

export const exportPendaftarToExcel = (
  pendaftarList: Pendaftar[],
  filenamePrefix: string = 'Data_PPDB_Subulussalam'
) => {
  // 1. Map data rows for main sheet
  const mainData = pendaftarList.map((item, index) => ({
    'No': index + 1,
    'ID Pendaftaran': item.id,
    'Waktu Masuk': item.timestamp,
    'Nama Lengkap Siswa': item.namaLengkap,
    'Tanggal Lahir': item.tanggalLahir,
    'Nama Wali / Orang Tua': item.namaWali,
    'Alamat Tempat Tinggal': item.alamatTinggal,
    'Asal Sekolah (SMP/MTs)': item.asalSekolah,
    'No. WhatsApp Pendaftar': item.noWa,
    'Nomor NISN': item.nisn,
    'Penerima PIP Sebelumnya': item.pipSebelumnya,
    'Status Pembayaran Pendaftaran': item.statusPembayaran,
    'Status Verifikasi Berkas': item.statusVerifikasi,
    'Skor Validitas Data': `${item.verificationScore}%`,
    'Tersinkron Google Sheets': item.syncedToSheets ? 'Sudah' : 'Belum',
    'Notif Konfirmasi WA': item.notifPendaftaranTerkirim ? 'Terkirim' : 'Belum',
    'Notif Verifikasi WA': item.notifVerifikasiTerkirim ? 'Terkirim' : 'Belum',
    'Catatan Pemeriksaan': item.catatanVerifikasi.join('; ') || 'Valid / Lengkap',
  }));

  // 2. Generate statistics summary sheet
  const total = pendaftarList.length;
  const verified = pendaftarList.filter((p) => p.statusVerifikasi === 'TERVERIFIKASI').length;
  const pending = pendaftarList.filter((p) => p.statusVerifikasi === 'MENUNGGU VERIFIKASI').length;
  const needsFix = pendaftarList.filter((p) => p.statusVerifikasi === 'PERLU PERBAIKAN').length;
  const rejected = pendaftarList.filter((p) => p.statusVerifikasi === 'DITOLAK').length;
  const paid = pendaftarList.filter((p) => p.statusPembayaran === 'Sudah').length;
  const unpaid = pendaftarList.filter((p) => p.statusPembayaran === 'Belum').length;
  const pipCount = pendaftarList.filter((p) => p.pipSebelumnya === 'Ya').length;

  // School breakdown
  const schoolCountMap: Record<string, number> = {};
  pendaftarList.forEach((p) => {
    const school = p.asalSekolah.trim() || 'Lainnya';
    schoolCountMap[school] = (schoolCountMap[school] || 0) + 1;
  });

  const summaryData = [
    { 'Parameter Evaluasi': 'Total Pendaftar Terdaftar', 'Jumlah Siswa': total, 'Keterangan': '100%' },
    { 'Parameter Evaluasi': 'Berkas Terverifikasi & Valid', 'Jumlah Siswa': verified, 'Keterangan': total ? `${Math.round((verified / total) * 100)}%` : '0%' },
    { 'Parameter Evaluasi': 'Menunggu Verifikasi Administrasi', 'Jumlah Siswa': pending, 'Keterangan': total ? `${Math.round((pending / total) * 100)}%` : '0%' },
    { 'Parameter Evaluasi': 'Perlu Perbaikan / Klarifikasi Berkas', 'Jumlah Siswa': needsFix, 'Keterangan': total ? `${Math.round((needsFix / total) * 100)}%` : '0%' },
    { 'Parameter Evaluasi': 'Ditolak', 'Jumlah Siswa': rejected, 'Keterangan': total ? `${Math.round((rejected / total) * 100)}%` : '0%' },
    { 'Parameter Evaluasi': '---', 'Jumlah Siswa': '---', 'Keterangan': '---' },
    { 'Parameter Evaluasi': 'Pembayaran Pendaftaran Dikonfirmasi (Lunas)', 'Jumlah Siswa': paid, 'Keterangan': total ? `${Math.round((paid / total) * 100)}%` : '0%' },
    { 'Parameter Evaluasi': 'Belum Melakukan Pembayaran', 'Jumlah Siswa': unpaid, 'Keterangan': total ? `${Math.round((unpaid / total) * 100)}%` : '0%' },
    { 'Parameter Evaluasi': 'Penerima Bantuan PIP Sebelumnya', 'Jumlah Siswa': pipCount, 'Keterangan': total ? `${Math.round((pipCount / total) * 100)}%` : '0%' },
  ];

  const schoolSummaryData = Object.entries(schoolCountMap)
    .sort((a, b) => b[1] - a[1])
    .map(([school, count]) => ({
      'Nama Asal Sekolah': school,
      'Jumlah Pendaftar': count,
      'Persentase': total ? `${((count / total) * 100).toFixed(1)}%` : '0%',
    }));

  // Create workbook and worksheets
  const wb = XLSX.utils.book_new();

  // Sheet 1: Main data
  const wsMain = XLSX.utils.json_to_sheet(mainData);
  // Configure column widths
  wsMain['!cols'] = [
    { wch: 5 },  // No
    { wch: 18 }, // ID Pendaftaran
    { wch: 20 }, // Waktu Masuk
    { wch: 26 }, // Nama Lengkap
    { wch: 15 }, // Tanggal Lahir
    { wch: 22 }, // Nama Wali
    { wch: 35 }, // Alamat
    { wch: 26 }, // Asal Sekolah
    { wch: 18 }, // No WA
    { wch: 14 }, // NISN
    { wch: 12 }, // PIP
    { wch: 18 }, // Pembayaran
    { wch: 22 }, // Status Verifikasi
    { wch: 14 }, // Skor
    { wch: 14 }, // Sheets
    { wch: 14 }, // Notif Konfirmasi
    { wch: 14 }, // Notif Verif
    { wch: 40 }, // Catatan
  ];
  XLSX.utils.book_append_sheet(wb, wsMain, 'Data Pendaftar PPDB');

  // Sheet 2: Summary
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Statistik PPDB');

  // Sheet 3: School breakdown
  const wsSchool = XLSX.utils.json_to_sheet(schoolSummaryData);
  wsSchool['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSchool, 'Rekap Asal Sekolah');

  // Generate file name with date stamp
  const today = new Date().toISOString().split('T')[0];
  const fullFilename = `${filenamePrefix}_${today}.xlsx`;

  // Trigger download
  XLSX.writeFile(wb, fullFilename);
};
