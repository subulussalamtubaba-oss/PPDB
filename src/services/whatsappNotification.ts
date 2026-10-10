import { Pendaftar, WhatsAppNotificationLog } from '../types';

/**
 * Template for Applicant/Parent sending Notification TO the PPDB Committee
 * (Pemberitahuan Pendaftaran Santri Baru dari Wali Murid ke Panitia PPDB)
 */
export const buildApplicantNoticeToCommitteeMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'Pondok Pesantren & Madrasah Subulussalam',
  tahunAjaran: string = '2026/2027'
): string => {
  return `*PEMBERITAHUAN PENDAFTARAN SANTRI BARU*
*${namaSekolah.toUpperCase()}*
Tahun Pelajaran ${tahunAjaran}

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. *Bapak/Ibu Panitia PPDB ${namaSekolah}*,

Dengan hormat, kami bermaksud mengabarkan dan mengonfirmasikan bahwa kami telah menyelesaikan pengisian formulir pendaftaran santri baru melalui layanan PPDB online.

Berikut rincian data pendaftaran ananda:

📋 *DATA PENDAFTAR:*
• *ID Pendaftaran:* \`${applicant.id}\`
• *Waktu Pendaftaran:* ${applicant.timestamp}
• *Nama Lengkap Santri:* ${applicant.namaLengkap}
• *NISN:* ${applicant.nisn || 'Belum Ada / Menyusul'}
• *Tempat, Tanggal Lahir:* ${applicant.tanggalLahir}
• *Asal Sekolah:* ${applicant.asalSekolah}
• *Nama Orang Tua / Wali:* ${applicant.namaWali}
• *Alamat Tempat Tinggal:* ${applicant.alamatTinggal || '-'}
• *No. WhatsApp Wali:* ${applicant.noWa}
• *Penerima PIP / KIP:* ${applicant.pipSebelumnya}
• *Status Biaya Pendaftaran:* *${
    applicant.statusPembayaran.toUpperCase() === 'SUDAH'
      ? 'SUDAH DIBAYAR / DITRANSFER'
      : 'BELUM DIBAYAR (MENYUSUL)'
  }*${
    applicant.statusPembayaran.toUpperCase() === 'SUDAH' && applicant.nominalTransfer
      ? `\n  - Nominal: Rp ${applicant.nominalTransfer}\n  - Saluran/Bank: ${applicant.metodeTransfer || '-'}\n  - Pengirim: ${applicant.namaPengirimTransfer || '-'}\n  - Waktu: ${applicant.waktuTransfer || '-'}`
      : ''
  }

Mohon perkenan Bapak/Ibu Panitia PPDB untuk memeriksa dan memverifikasi data di atas. Apabila terdapat berkas atau persyaratan lanjutan yang perlu kami lengkapi, mohon dapat mengabari kami melalui nomor WhatsApp ini.

Atas bantuan, bimbingan, dan perhatian Bapak/Ibu Panitia, kami haturkan terima kasih banyak. Jazakumullahu khairan katsiran.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

_Hormat kami,_
*${applicant.namaWali}*
(Wali dari calon santri: *${applicant.namaLengkap}*)`;
};

/**
 * Template for Initial Registration Confirmation from Committee TO the Parent/Applicant
 * (Surat Konfirmasi Registrasi Resmi dari Panitia kepada Wali Santri)
 */
export const buildRegistrationConfirmationMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'Pondok Pesantren & Madrasah Subulussalam',
  tahunAjaran: string = '2026/2027'
): string => {
  return `*KONFIRMASI PENDAFTARAN RESMI ${namaSekolah.toUpperCase()}*
Tahun Pelajaran ${tahunAjaran}

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu *${applicant.namaWali || applicant.namaLengkap}*
(Wali dari Calon Santri: *${applicant.namaLengkap}*)

Alhamdulillah, pendaftaran calon santri baru ananda telah berhasil kami terima dan tercatat secara resmi dalam basis data PPDB ${namaSekolah}.

📌 *BUKTI REGISTRASI RESMI:*
• *ID Pendaftaran:* \`${applicant.id}\`
• *Waktu Registrasi:* ${applicant.timestamp}
• *Nama Lengkap Santri:* ${applicant.namaLengkap}
• *NISN:* ${applicant.nisn || 'Belum Ada / Menyusul'}
• *Tempat, Tanggal Lahir:* ${applicant.tanggalLahir}
• *Asal Sekolah:* ${applicant.asalSekolah}
• *Penerima PIP / KIP:* ${applicant.pipSebelumnya}
• *Status Administrasi:* *${applicant.statusVerifikasi}*
• *Status Biaya Pendaftaran:* *${applicant.statusPembayaran.toUpperCase()}*

📋 *PETUNJUK BAGI WALI SANTRI:*
1. Simpan pesan ini dan catat *Nomor ID Pendaftaran (${applicant.id})* sebagai tanda bukti registrasi resmi.
2. Tim Panitia PPDB sedang melakukan verifikasi keabsahan data & kelengkapan berkas ananda.
3. Anda akan menerima pesan pemberitahuan kelolosan verifikasi berkas setelah proses administrasi selesai.

Apabila memerlukan informasi atau bantuan lebih lanjut, Bapak/Ibu dapat menghubungi layanan panitia PPDB.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

*Panitia Penerimaan Peserta Didik Baru (PPDB)*
_${namaSekolah}_`;
};

/**
 * Template for Successful Verification Notification
 */
export const buildVerificationSuccessMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'PPDB Terpadu Subulussalam'
): string => {
  return `*PEMBERITAHUAN: DATA PENDAFTARAN TERVERIFIKASI* 
${namaSekolah.toUpperCase()}

Yth. Sdr/i *${applicant.namaLengkap}*
Wali Murid: *${applicant.namaWali}*

Selamat! Panitia PPDB telah menyelesaikan pemeriksaan dan *VERIFIKASI RESMI* atas data pendaftaran Anda:

 *STATUS: TERVERIFIKASI & VALID (LOLOS BERKAS)*
• ID Pendaftaran: \`${applicant.id}\`
• NISN: ${applicant.nisn}
• Asal Sekolah: ${applicant.asalSekolah}
• Status Pembayaran: ${applicant.statusPembayaran === 'Sudah' ? 'Lunas / Diterima' : 'Menunggu Pelunasan'}

 *TAHAPAN SELANJUTNYA:*
1. Pendaftar dipersilakan mengunduh atau mencetak Bukti Lolos Berkas dengan menunjukkan ID Pendaftaran: *${applicant.id}*.
2. ${
    applicant.statusPembayaran === 'Sudah'
      ? 'Silakan menunggu jadwal orientasi dan pembagian kelas yang akan diumumkan di grup calon siswa.'
      : 'Harap segera menyelesaikan konfirmasi pembayaran pendaftaran untuk aktivasi nomor ujian masuk.'
  }

Semoga sukses dalam tahapan seleksi PPDB selanjutnya!

Salam hangat,
*Panitia Penerimaan Peserta Didik Baru (PPDB)*
_${namaSekolah}_`;
};

/**
 * Template for Document Revision Notification (If verification found issues)
 */
export const buildVerificationRevisionMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'PPDB Terpadu Subulussalam'
): string => {
  const issuesList = applicant.catatanVerifikasi.map((issue, i) => `  ${i + 1}. ${issue}`).join('\n');

  return `*PEMBERITAHUAN PERBAIKAN DATA PPDB*
${namaSekolah.toUpperCase()}

Halo *${applicant.namaLengkap}*,
ID Pendaftaran: \`${applicant.id}\`

Berdasarkan hasil verifikasi sistem dan panitia PPDB, terdapat beberapa data yang *MEMERLUKAN PERBAIKAN/KLARIFIKASI*:

${issuesList || '  • Mohon lakukan konfirmasi ulang nomor NISN dan kelengkapan berkas.'}

 Mohon segera membalas pesan ini atau mengirimkan pembetulan data sebelum batas akhir pendaftaran.

Terima kasih,
*Tim Verifikasi PPDB ${namaSekolah}*`;
};

/**
 * Template: Berkas Diterima & Lengkap (Panitia to Parent)
 */
export const buildBerkasDiterimaMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'Pondok Pesantren & Madrasah Subulussalam',
  tahunAjaran: string = '2026/2027'
): string => {
  return `*PEMBERITAHUAN: BERKAS PENDAFTARAN DITERIMA & LENGKAP*
*${namaSekolah.toUpperCase()}*
Tahun Pelajaran ${tahunAjaran}

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu *${applicant.namaWali || applicant.namaLengkap}*,
(Wali dari Calon Santri: *${applicant.namaLengkap}*)

Alhamdulillah, berkas pendaftaran ananda telah diperiksa oleh Tim Panitia PPDB dan dinyatakan *LENGKAP DAN DITERIMA* secara resmi.

📋 *RINGKASAN DATA SANTRI:*
• *ID Pendaftaran:* \`${applicant.id}\`
• *Nama Lengkap:* ${applicant.namaLengkap}
• *Asal Sekolah:* ${applicant.asalSekolah}
• *NISN:* ${applicant.nisn || 'Tercatat'}
• *Status Berkas:* *LENGKAP & VALID ✅*
• *Status Administrasi:* ${applicant.statusPembayaran === 'Sudah' ? 'LUNAS ✅' : 'Menunggu Konfirmasi Biaya ⏳'}

Berkas ananda telah kami arsipkan untuk proses seleksi penerimaan santri baru. Informasi tahap berikutnya akan kami kabarkan lebih lanjut melalui nomor ini.

Jazakumullahu khairan katsiran.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

*Panitia PPDB ${namaSekolah}*`;
};

/**
 * Template: Kurang Persyaratan / Perbaikan Berkas (Panitia to Parent)
 */
export const buildKurangPersyaratanMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'Pondok Pesantren & Madrasah Subulussalam',
  customCatatan?: string
): string => {
  const issues = customCatatan || (applicant.catatanVerifikasi && applicant.catatanVerifikasi.length > 0
    ? applicant.catatanVerifikasi.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '1. Fotokopi/Scan Ijazah atau Surat Keterangan Lulus (SKL)\n2. Fotokopi Kartu Keluarga (KK) & Akta Kelahiran\n3. Nomor NISN aktif 10 digit');

  return `*PEMBERITAHUAN: KEKURANGAN PERSYARATAN BERKAS PPDB*
*${namaSekolah.toUpperCase()}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu *${applicant.namaWali || applicant.namaLengkap}*,
(Wali dari Calon Santri: *${applicant.namaLengkap}*)
ID Pendaftaran: \`${applicant.id}\`

Berdasarkan hasil verifikasi berkas oleh Tim Panitia PPDB, kami menginformasikan bahwa berkas pendaftaran ananda masih memiliki *KEKURANGAN PERSYARATAN* sebagai berikut:

⚠️ *CATATAN PERSYARATAN YANG PERLU DILENGKAPI:*
${issues}

📌 *TINDAKAN SELANJUTNYA:*
Mohon Bapak/Ibu dapat mengirimkan foto/scan berkas yang kurang atau membalas pesan WhatsApp ini sesegera mungkin agar proses verifikasi kelulusan berkas dapat dilanjutkan.

Bantuan dan konfirmasi panitia dapat dilakukan melalui nomor ini. Terima kasih atas kerja sama dan perhatiannya.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

*Tim Verifikasi PPDB ${namaSekolah}*`;
};

/**
 * Template: Jadwal Tes & Observasi Calon Santri (Panitia to Parent)
 */
export const buildJadwalTesMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'Pondok Pesantren & Madrasah Subulussalam',
  jadwalDetail?: { tanggal?: string; waktu?: string; tempat?: string; materi?: string }
): string => {
  const tgl = jadwalDetail?.tanggal || 'Hari Ahad (Sesuai Gelombang Pendaftaran)';
  const wkt = jadwalDetail?.waktu || '08.00 - 12.00 WIB';
  const tmp = jadwalDetail?.tempat || 'Kampus Pondok Pesantren Subulussalam';
  const mtr = jadwalDetail?.materi || 'Tes Baca Al-Qur\'an, Wawancara Santri & Wali Murid, dan Tes Potensi Akademik Dasar';

  return `*UNDANGAN RESMI: JADWAL TES SELEKSI & OBSERVASI SANTRI BARU*
*${namaSekolah.toUpperCase()}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu *${applicant.namaWali || applicant.namaLengkap}*,
(Wali dari Calon Santri: *${applicant.namaLengkap}*)

Alhamdulillah, ananda telah terdaftar resmi dengan:
• *ID Pendaftaran:* \`${applicant.id}\`
• *Nama Santri:* *${applicant.namaLengkap}*

Bersama ini kami mengundang Bapak/Ibu dan ananda calon santri untuk mengikuti *Tes Seleksi Masuk & Observasi*:

🗓️ *JADWAL PELAKSANAAN:*
• *Hari / Tanggal:* ${tgl}
• *Waktu:* ${wkt}
• *Tempat:* ${tmp}
• *Materi Seleksi:* ${mtr}

📝 *PERLENGKAPAN YANG WAJIB DIBAWA:*
1. Membawa bukti pendaftaran/Nomor ID (\`${applicant.id}\`)
2. Memakai pakaian muslim/muslimah rapi dan sopan
3. Alat tulis (pensil, pulpen)
4. Didampingi oleh orang tua/wali santri

Mohon konfirmasi kehadiran Bapak/Ibu dengan membalas pesan ini (ketik: *HADIR* beserta nama santri).

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

*Panitia Seleksi PPDB ${namaSekolah}*`;
};

/**
 * Template: Pengingat Pembayaran Administrasi Pendaftaran
 */
export const buildPengingatPembayaranMessage = (
  applicant: Pendaftar,
  namaSekolah: string = 'Pondok Pesantren & Madrasah Subulussalam',
  biaya: string = '150.000',
  rekening: string = '7702 0102 2580 530 a/n ponpes Subulussalam (Bank BRI)'
): string => {
  return `*PENGINGAT RESMI: BIAYA ADMINISTRASI PENDAFTARAN*
*${namaSekolah.toUpperCase()}*

Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu *${applicant.namaWali || applicant.namaLengkap}*,
(Wali dari Calon Santri: *${applicant.namaLengkap}*)
ID Pendaftaran: \`${applicant.id}\`

Kami menginformasikan bahwa pendaftaran ananda *${applicant.namaLengkap}* telah tercatat di sistem kami. Untuk mengaktifkan status pendaftaran penuh dan penjadwalan nomor ujian masuk, silakan menyelesaikan administrasi pendaftaran:

💳 *RINCIAN BIAYA & REKENING RESMI:*
• *Biaya Pendaftaran:* Rp ${biaya}
• *Rekening Tujuan:* 
  ${rekening}

Setelah melakukan transfer, mohon kirimkan foto bukti transfer/struk melalui nomor WhatsApp ini atau masukkan di chatbot portal dengan menyebutkan ID: \`${applicant.id}\`.

Apabila sudah transfer sebelumnya, mohon abaikan pesan pengingat ini. Terima kasih banyak.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

*Panitia PPDB ${namaSekolah}*`;
};

/**
 * Generates direct wa.me link for WhatsApp Web / Mobile
 */
export const getWhatsAppWebLink = (phoneInternational: string, message: string): string => {
  const cleanPhone = phoneInternational.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};

/**
 * Dispatches notification and creates log record
 */
export const sendApplicantWhatsAppNotification = (
  applicant: Pendaftar,
  type:
    | 'KONFIRMASI_PENDAFTARAN'
    | 'VERIFIKASI_BERHASIL'
    | 'PERBAIKAN_BERKAS'
    | 'BERKAS_DITERIMA'
    | 'KURANG_PERSYARATAN'
    | 'JADWAL_TES'
    | 'PENGINGAT_BIAYA'
    | 'CUSTOM',
  namaSekolah: string = 'PPDB Terpadu Subulussalam',
  autoOpenWindow: boolean = true,
  customMessage?: string
): { log: WhatsAppNotificationLog; waUrl: string } => {
  let messageText = '';
  if (customMessage) {
    messageText = customMessage;
  } else if (type === 'KONFIRMASI_PENDAFTARAN') {
    messageText = buildRegistrationConfirmationMessage(applicant, namaSekolah);
  } else if (type === 'VERIFIKASI_BERHASIL') {
    messageText = buildVerificationSuccessMessage(applicant, namaSekolah);
  } else if (type === 'PERBAIKAN_BERKAS' || type === 'KURANG_PERSYARATAN') {
    messageText = buildKurangPersyaratanMessage(applicant, namaSekolah);
  } else if (type === 'BERKAS_DITERIMA') {
    messageText = buildBerkasDiterimaMessage(applicant, namaSekolah);
  } else if (type === 'JADWAL_TES') {
    messageText = buildJadwalTesMessage(applicant, namaSekolah);
  } else if (type === 'PENGINGAT_BIAYA') {
    messageText = buildPengingatPembayaranMessage(applicant, namaSekolah);
  } else {
    messageText = buildRegistrationConfirmationMessage(applicant, namaSekolah);
  }

  const waUrl = getWhatsAppWebLink(applicant.normalizedWa, messageText);

  if (autoOpenWindow) {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  const log: WhatsAppNotificationLog = {
    id: 'NOTIF-' + Date.now().toString().slice(-6),
    pendaftarId: applicant.id,
    namaLengkap: applicant.namaLengkap,
    noWa: applicant.noWa,
    type,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    messageText,
    status: 'TERKIRIM',
  };

  return { log, waUrl };
};
