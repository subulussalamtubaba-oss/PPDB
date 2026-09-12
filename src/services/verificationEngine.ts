import { Pendaftar, VerificationStatus } from '../types';

export interface VerificationInput {
  namaLengkap: string;
  tanggalLahir: string;
  namaWali: string;
  alamatTinggal: string;
  asalSekolah: string;
  noWa: string;
  nisn: string;
  pipSebelumnya: 'Ya' | 'Tidak';
  statusPembayaran: 'Sudah' | 'Belum';
}

export interface VerificationResult {
  isValid: boolean;
  score: number; // 0 to 100
  recommendedStatus: VerificationStatus;
  issues: string[];
  fieldValidity: {
    namaLengkap: boolean;
    tanggalLahir: boolean;
    namaWali: boolean;
    alamatTinggal: boolean;
    asalSekolah: boolean;
    noWa: boolean;
    nisn: boolean;
    pembayaran: boolean;
  };
}

export const runAutomaticVerification = (
  data: VerificationInput,
  existingList: Pendaftar[] = [],
  currentId?: string
): VerificationResult => {
  const issues: string[] = [];
  let score = 100;

  const fieldValidity = {
    namaLengkap: true,
    tanggalLahir: true,
    namaWali: true,
    alamatTinggal: true,
    asalSekolah: true,
    noWa: true,
    nisn: true,
    pembayaran: true,
  };

  // 1. Validasi Nama Lengkap
  const cleanNama = data.namaLengkap.trim();
  if (!cleanNama || cleanNama.length < 3) {
    issues.push('Nama lengkap terlalu pendek atau kosong (min. 3 karakter)');
    fieldValidity.namaLengkap = false;
    score -= 15;
  } else if (/\d{3,}/.test(cleanNama)) {
    issues.push('Nama lengkap terdeteksi mengandung angka');
    fieldValidity.namaLengkap = false;
    score -= 10;
  }

  // 2. Validasi Tanggal Lahir & Perkiraan Usia
  const cleanTgl = data.tanggalLahir.trim();
  if (!cleanTgl) {
    issues.push('Tanggal lahir kosong');
    fieldValidity.tanggalLahir = false;
    score -= 15;
  } else {
    const age = estimateAgeFromBirthdate(cleanTgl);
    if (age === null) {
      issues.push('Format tanggal lahir tidak dikenali (gunakan contoh: 14-05-2010 atau 2010-05-14)');
      fieldValidity.tanggalLahir = false;
      score -= 10;
    } else if (age < 10 || age > 21) {
      issues.push(`Perkiraan usia pendaftar (${age} tahun) di luar rentang wajar PPDB (11-20 tahun)`);
      score -= 10;
    }
  }

  // 3. Validasi Nama Wali
  const cleanWali = data.namaWali.trim();
  if (!cleanWali || cleanWali.length < 3) {
    issues.push('Nama wali / orang tua belum diisi dengan lengkap');
    fieldValidity.namaWali = false;
    score -= 10;
  }

  // 4. Validasi Alamat Tinggal
  const cleanAlamat = data.alamatTinggal.trim();
  if (!cleanAlamat || cleanAlamat.length < 5) {
    issues.push('Alamat tinggal terlalu singkat atau belum lengkap');
    fieldValidity.alamatTinggal = false;
    score -= 10;
  }

  // 5. Validasi Asal Sekolah
  const cleanSekolah = data.asalSekolah.trim();
  if (!cleanSekolah || cleanSekolah.length < 3) {
    issues.push('Asal sekolah belum diisi dengan jelas');
    fieldValidity.asalSekolah = false;
    score -= 10;
  }

  // 6. Validasi NISN (10 Digit Angka)
  // If string contains a 10-digit sequence (e.g. 5815/0143956150), extract the 10-digit NISN
  const tenDigitNisnMatch = data.nisn.match(/\b\d{10}\b/);
  const cleanNisn = tenDigitNisnMatch ? tenDigitNisnMatch[0] : data.nisn.replace(/\D/g, '').trim();

  if (!cleanNisn) {
    issues.push('Nomor NISN wajib diisi');
    fieldValidity.nisn = false;
    score -= 20;
  } else if (cleanNisn.length !== 10) {
    issues.push(`NISN tidak valid: harus 10 digit angka (terdeteksi ${cleanNisn.length} digit: ${cleanNisn})`);
    fieldValidity.nisn = false;
    score -= 15;
  }

  // Cek duplikasi NISN di database pendaftar
  const isDuplicateNisn = existingList.some(
    (item) => item.id !== currentId && (item.nisn.match(/\b\d{10}\b/)?.[0] || item.nisn.replace(/\D/g, '')) === cleanNisn && cleanNisn.length === 10
  );
  if (isDuplicateNisn) {
    issues.push(`DUPLIKAT NISN: Nomor ${cleanNisn} sudah pernah terdaftar sebelumnya!`);
    fieldValidity.nisn = false;
    score -= 25;
  }

  // 7. Validasi Nomor WhatsApp
  // Support multiple numbers like 085832297239/085768219893 by validating the primary mobile number
  const primaryWa = (data.noWa.split(/[/,;]/)[0] || '').trim();
  const cleanWa = primaryWa.replace(/\D/g, '').trim();
  if (!cleanWa) {
    issues.push('Nomor WhatsApp wajib diisi');
    fieldValidity.noWa = false;
    score -= 20;
  } else if (!cleanWa.startsWith('08') && !cleanWa.startsWith('628') && !cleanWa.startsWith('8')) {
    issues.push('Nomor WhatsApp harus nomor seluler Indonesia yang valid (diawali 08 / 628)');
    fieldValidity.noWa = false;
    score -= 15;
  } else if (cleanWa.length < 10 || cleanWa.length > 15) {
    issues.push(`Panjang nomor WhatsApp tidak valid (${cleanWa.length} digit)`);
    fieldValidity.noWa = false;
    score -= 15;
  }

  // 8. Cek Status Pembayaran
  if (data.statusPembayaran === 'Belum') {
    issues.push('Catatan: Pembayaran pendaftaran belum dikonfirmasi');
    fieldValidity.pembayaran = false;
    // score deduction is small since it's an administrative stage
    score -= 5;
  }

  // Normalisasi Skor
  score = Math.max(0, Math.min(100, score));

  // Tentukan rekomendasi status
  let recommendedStatus: VerificationStatus = 'MENUNGGU VERIFIKASI';
  const hasFatalIssues = !fieldValidity.nisn || !fieldValidity.noWa || !fieldValidity.namaLengkap;

  if (hasFatalIssues || score < 60) {
    recommendedStatus = 'PERLU PERBAIKAN';
  } else if (score >= 90 && data.statusPembayaran === 'Sudah') {
    recommendedStatus = 'TERVERIFIKASI';
  } else {
    recommendedStatus = 'MENUNGGU VERIFIKASI';
  }

  return {
    isValid: score >= 80 && !hasFatalIssues,
    score,
    recommendedStatus,
    issues,
    fieldValidity,
  };
};

/**
 * Parses date string in various Indonesian and standard formats and calculates age
 */
function estimateAgeFromBirthdate(dateStr: string): number | null {
  try {
    const clean = dateStr.trim();
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const bDate = new Date(clean);
      return calculateYearsDiff(bDate);
    }

    // Try DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const bDate = new Date(year, month, day);
      return calculateYearsDiff(bDate);
    }

    // Try text with month names, including city prefix like "GN sugih 21 jaunari 2014" or "Tulang Bawang, 14 Mei 2010"
    const monthNames: Record<string, number> = {
      januari: 0, jaunari: 0, janari: 0, jan: 0,
      februari: 1, pebruari: 1, feb: 1, peb: 1,
      maret: 2, mar: 2,
      april: 3, apr: 3,
      mei: 4, may: 4,
      juni: 5, jun: 5,
      juli: 6, jul: 6,
      agustus: 7, ags: 7, agu: 7, agust: 7,
      september: 8, sep: 8, sept: 8,
      oktober: 9, okt: 9,
      november: 10, nopember: 10, nov: 10, nop: 10,
      desember: 11, desembar: 11, des: 11,
    };

    const textMatch = clean.toLowerCase().match(/(?:^|.*?[\s,])(\d{1,2})\s+([a-z]+)\s+(\d{4})(?:$|\s.*)/);
    if (textMatch && monthNames[textMatch[2]] !== undefined) {
      const day = parseInt(textMatch[1], 10);
      const month = monthNames[textMatch[2]];
      const year = parseInt(textMatch[3], 10);
      const bDate = new Date(year, month, day);
      return calculateYearsDiff(bDate);
    }

    // Fallback: If 4-digit year exists (e.g. 2014)
    const yearMatch = clean.match(/\b(19\d{2}|200\d|201\d|202\d)\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      const todayYear = new Date().getFullYear();
      return todayYear - year;
    }

    // Attempt direct Date parse
    const fallbackDate = new Date(clean);
    if (!isNaN(fallbackDate.getTime())) {
      return calculateYearsDiff(fallbackDate);
    }

    return null;
  } catch {
    return null;
  }
}

function calculateYearsDiff(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
