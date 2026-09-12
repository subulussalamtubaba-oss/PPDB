import { Pendaftar, VerificationStatus } from '../types';
import { runAutomaticVerification } from './verificationEngine';

export interface RawParsedData {
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

/**
 * Normalizes phone number into international WhatsApp format (e.g., 6281234567890)
 * Handles multiple numbers separated by slash/comma by extracting the primary valid mobile number.
 */
export const normalizeWhatsAppNumber = (phoneStr: string): string => {
  if (!phoneStr) return '';
  // Match first valid Indonesian mobile number starting with 08 or 628
  const match = phoneStr.match(/(?:08|\+?628)\d{8,12}/);
  let target = match ? match[0] : phoneStr.split(/[/,;]/)[0]?.trim() || phoneStr;

  let clean = target.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  } else if (!clean.startsWith('62') && clean.length > 8) {
    clean = '62' + clean;
  }
  return clean;
};

/**
 * Formats phone number for clean UI display (e.g., 0812-3456-7890)
 */
export const formatDisplayPhone = (phoneStr: string): string => {
  let clean = phoneStr.replace(/\D/g, '');
  if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  }
  if (clean.length >= 10) {
    return clean.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  return clean || phoneStr;
};

/**
 * Generates next unique PPDB ID, e.g. A-2026-0001 or A-2027-0001
 */
export const generateUniquePpdbId = (existingCount: number = 0, yearOverride?: string): string => {
  const year = yearOverride?.trim() || new Date().getFullYear().toString();
  const nextNum = (existingCount + 1).toString().padStart(4, '0');
  return `A-${year}-${nextNum}`;
};

/**
 * Parse a single message text into structured candidate fields.
 */
export const parseSingleWhatsAppMessage = (
  rawText: string
): {
  data: RawParsedData;
  parseMethod: 'PSB_POIN_1_9' | 'COMMA_DELIMITED' | 'KEY_VALUE' | 'HYBRID';
} => {
  const trimmed = rawText.trim();

  // Pattern 0: Official Numbered Points 1 to 9 (e.g. 1. Nama lengkap:, 2. Tanggal lahir:, ... 9.)
  const isNumberedPsb =
    /(?:^|\n)\s*1\.\s*nama/i.test(trimmed) ||
    (/(?:^|\n)\s*1\.\s*[^:\n]+:/i.test(trimmed) && /(?:^|\n)\s*2\.\s*[^:\n]+:/i.test(trimmed));

  if (isNumberedPsb) {
    return {
      data: parseNumberedPsbFormat(trimmed),
      parseMethod: 'PSB_POIN_1_9',
    };
  }

  // Pattern 1: Check if it uses Key-Value pairs with colon or equals
  const hasLabels =
    /nama\s*(lengkap)?\s*[:=]/i.test(trimmed) ||
    /tanggal\s*lahir\s*[:=]/i.test(trimmed) ||
    /nisn\s*[:=]/i.test(trimmed) ||
    /pip\s*[:=]/i.test(trimmed);

  if (hasLabels) {
    return {
      data: parseKeyValueFormat(trimmed),
      parseMethod: 'KEY_VALUE',
    };
  }

  // Pattern 2: Comma-delimited list format:
  // NAMA LENGKAP, TANGGAL LAHIR, NAMA WALI, ALAMAT TINGGAL, ASAL SEKOLAH, NO. WA, NO.NISN, MENDAPATKAN PIP SEBELUMNYA, SUDAH MELAKUKAN PEMBAYARAN PENDAFTARAN?
  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length >= 7) {
    const namaLengkap = cleanFieldValue(parts[0] || '');
    const tanggalLahir = cleanFieldValue(parts[1] || '');
    const namaWali = cleanFieldValue(parts[2] || '');
    const alamatTinggal = cleanFieldValue(parts[3] || '');
    const asalSekolah = cleanFieldValue(parts[4] || '');
    const noWa = cleanFieldValue(parts[5] || '');
    let nisn = cleanFieldValue(parts[6] || '');
    const tenDigitMatch = nisn.match(/\b(\d{10})\b/);
    if (tenDigitMatch) {
      nisn = tenDigitMatch[1];
    }
    const pipRaw = parts[7] || '';
    const bayarRaw = parts[8] || '';

    return {
      data: {
        namaLengkap,
        tanggalLahir,
        namaWali,
        alamatTinggal,
        asalSekolah,
        noWa,
        nisn,
        pipSebelumnya: parseBooleanValue(pipRaw),
        statusPembayaran: parsePaymentValue(bayarRaw),
      },
      parseMethod: 'COMMA_DELIMITED',
    };
  }

  // Fallback: try hybrid / line-by-line
  return {
    data: parseLineByLineFallback(trimmed),
    parseMethod: 'HYBRID',
  };
};

/**
 * Specifically parses numbered PSB form format (Points 1 to 9):
 * 1. Nama lengkap: MAULANA MALIK
 * 2. Tanggal lahir: GN sugih 21 jaunari 2014
 * 3. Nama wali : zainal aripin
 * 4. Tempat Tinggal: gn batin udik
 * 5. Asal sekolah: SD N 26 TBT
 * 6. No. WhatsApp: 085832297239/085768219893
 * 7. No. NISN : 5815/0143956150
 * 8. Apakah calon santri mendapatkan bantuan PIP ketika dijenjang SD? (YA/TIDAK): YA
 * 9. Apakah calon santri sudah membayar biaya pendaftaran sebesar Rp 150.000? (Sudah/belum): jika sudah silahkan kirim bukti transfer ke nomor admin! 🙏🏻belum bayar
 * 
 * Lines after point 9 (like "7702 0102 2580 530 a/n ponpes Subulussalam") or before point 1 are strictly ignored.
 */
export const parseNumberedPsbFormat = (text: string): RawParsedData => {
  const extractPoint = (num: number, nextNum?: number): string => {
    let pattern: RegExp;
    if (nextNum) {
      pattern = new RegExp(
        `(?:^|\\n)\\s*${num}\\.\\s*[^:\\n]+:\\s*([\\s\\S]*?)(?=(?:\\n\\s*${nextNum}\\.\\s*[^:\\n]+:)|$)`,
        'i'
      );
    } else {
      // For point 9: only capture the line containing point 9 up to newline
      // This strictly excludes bank account lines or extra footer notes
      pattern = new RegExp(`(?:^|\\n)\\s*${num}\\.\\s*[^:\\n]+:\\s*([^\\n\\r]*)`, 'i');
    }

    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }

    const simple = new RegExp(`(?:^|\\n)\\s*${num}\\.\\s*[^:\\n]+:\\s*([^\\n\\r]*)`, 'i');
    const sm = text.match(simple);
    return sm && sm[1] ? sm[1].trim() : '';
  };

  const rawNama = extractPoint(1, 2);
  const rawTgl = extractPoint(2, 3);
  const rawWali = extractPoint(3, 4);
  const rawAlamat = extractPoint(4, 5);
  const rawSekolah = extractPoint(5, 6);
  const rawWa = extractPoint(6, 7);
  const rawNisn = extractPoint(7, 8);
  const rawPip = extractPoint(8, 9);
  const rawBayar = extractPoint(9); // Strictly line 9, ignores line 10+

  const namaLengkap = cleanFieldValue(rawNama);
  const tanggalLahir = cleanFieldValue(rawTgl);
  const namaWali = cleanFieldValue(rawWali);
  const alamatTinggal = cleanFieldValue(rawAlamat);
  const asalSekolah = cleanFieldValue(rawSekolah);
  const noWa = cleanFieldValue(rawWa);

  // If NISN contains 10-digit number like "5815/0143956150", extract "0143956150"
  let nisn = cleanFieldValue(rawNisn);
  const tenDigitNisn = nisn.match(/\b(\d{10})\b/);
  if (tenDigitNisn) {
    nisn = tenDigitNisn[1];
  }

  return {
    namaLengkap,
    tanggalLahir,
    namaWali,
    alamatTinggal,
    asalSekolah,
    noWa,
    nisn,
    pipSebelumnya: parseBooleanValue(rawPip),
    statusPembayaran: parsePaymentValue(rawBayar),
  };
};

const cleanFieldValue = (val: string): string => {
  return val
    .replace(/^["']|["']$/g, '')
    .replace(/^[\d]+\.\s*/, '') // remove numbered prefix like '1. '
    .trim();
};

const parseBooleanValue = (val: string): 'Ya' | 'Tidak' => {
  const lower = val.toLowerCase();
  if (
    lower.includes('ya') ||
    lower.includes('pernah') ||
    lower.includes('dapat') ||
    lower.includes('ada') ||
    lower.includes('yes') ||
    lower === 'y'
  ) {
    return 'Ya';
  }
  return 'Tidak';
};

const parsePaymentValue = (val: string): 'Sudah' | 'Belum' => {
  let lower = val.toLowerCase();

  // Strip boilerplate instructional prompt text from the form template
  // e.g. "jika sudah silahkan kirim bukti transfer ke nomor admin! 🙏🏻"
  lower = lower
    .replace(/jika\s+sudah\s+silahkan\s+kirim\s+bukti[^\n]*/gi, '')
    .replace(/jika\s+sudah[^\n]*/gi, '')
    .replace(/silahkan\s+kirim\s+bukti[^\n]*/gi, '');

  // 1. Check explicit "Belum" indicators first
  if (
    lower.includes('belum') ||
    lower.includes('blm') ||
    lower.includes('tidak') ||
    lower.includes('tdk') ||
    lower.includes('nanti') ||
    lower.includes('pending')
  ) {
    return 'Belum';
  }

  // 2. Check "Sudah" indicators
  if (
    lower.includes('sudah') ||
    lower.includes('lunas') ||
    lower.includes('transfer') ||
    lower.includes('sdh') ||
    lower.includes('dibayar') ||
    lower === 'ya'
  ) {
    return 'Sudah';
  }

  return 'Belum';
};

const parseKeyValueFormat = (text: string): RawParsedData => {
  const lines = text.split(/\r?\n/);
  const map: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim().toUpperCase();
      const value = line.slice(colonIndex + 1).trim();
      map[key] = value;
    }
  }

  // Helper to search map keys
  const findValue = (keywords: string[]): string => {
    for (const [k, v] of Object.entries(map)) {
      if (keywords.some((kw) => k.includes(kw))) {
        return v;
      }
    }
    return '';
  };

  const namaLengkap = findValue(['NAMA LENGKAP', 'NAMA']);
  const tanggalLahir = findValue(['TANGGAL LAHIR', 'TGL LAHIR', 'LAHIR']);
  const namaWali = findValue(['NAMA WALI', 'WALI', 'ORANG TUA', 'ORTU']);
  const alamatTinggal = findValue(['ALAMAT TINGGAL', 'TEMPAT TINGGAL', 'ALAMAT', 'DOMISILI', 'TEMPAT']);
  const asalSekolah = findValue(['ASAL SEKOLAH', 'SEKOLAH ASAL', 'SEKOLAH', 'ASAL SD', 'ASAL MI']);
  const noWa = findValue(['NO. WA', 'NO WA', 'WHATSAPP', 'TELEPON', 'HP', 'NO HP']);
  let nisn = findValue(['NO. NISN', 'NO.NISN', 'NISN', 'NO NISN']);
  const tenDigitMatch = nisn.match(/\b(\d{10})\b/);
  if (tenDigitMatch) {
    nisn = tenDigitMatch[1];
  }
  const pipRaw = findValue(['MENDAPATKAN PIP', 'PIP SEBELUMNYA', 'PIP']);
  const bayarRaw = findValue(['PEMBAYARAN', 'BAYAR', 'SUDAH MELAKUKAN PEMBAYARAN']);

  return {
    namaLengkap,
    tanggalLahir,
    namaWali,
    alamatTinggal,
    asalSekolah,
    noWa,
    nisn,
    pipSebelumnya: parseBooleanValue(pipRaw),
    statusPembayaran: parsePaymentValue(bayarRaw),
  };
};

const parseLineByLineFallback = (text: string): RawParsedData => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    namaLengkap: cleanFieldValue(lines[0] || ''),
    tanggalLahir: cleanFieldValue(lines[1] || ''),
    namaWali: cleanFieldValue(lines[2] || ''),
    alamatTinggal: cleanFieldValue(lines[3] || ''),
    asalSekolah: cleanFieldValue(lines[4] || ''),
    noWa: cleanFieldValue(lines[5] || ''),
    nisn: cleanFieldValue(lines[6] || ''),
    pipSebelumnya: parseBooleanValue(lines[7] || ''),
    statusPembayaran: parsePaymentValue(lines[8] || ''),
  };
};

/**
 * Extracts and fully builds a Pendaftar record including verification score
 */
export const extractAndBuildPendaftar = (
  rawMessage: string,
  existingList: Pendaftar[] = []
): Pendaftar => {
  const { data } = parseSingleWhatsAppMessage(rawMessage);
  const id = generateUniquePpdbId(existingList.length);
  const normalizedWa = normalizeWhatsAppNumber(data.noWa);

  // Run automated verification engine
  const verification = runAutomaticVerification(
    {
      namaLengkap: data.namaLengkap,
      tanggalLahir: data.tanggalLahir,
      namaWali: data.namaWali,
      alamatTinggal: data.alamatTinggal,
      asalSekolah: data.asalSekolah,
      noWa: data.noWa,
      nisn: data.nisn,
      pipSebelumnya: data.pipSebelumnya,
      statusPembayaran: data.statusPembayaran,
    },
    existingList
  );

  const now = new Date();
  const timestamp = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id,
    timestamp,
    rawMessage,
    namaLengkap: data.namaLengkap,
    tanggalLahir: data.tanggalLahir,
    namaWali: data.namaWali,
    alamatTinggal: data.alamatTinggal,
    asalSekolah: data.asalSekolah,
    noWa: data.noWa,
    normalizedWa,
    nisn: data.nisn,
    pipSebelumnya: data.pipSebelumnya,
    statusPembayaran: data.statusPembayaran,
    statusVerifikasi: verification.recommendedStatus,
    catatanVerifikasi: verification.issues,
    verificationScore: verification.score,
    syncedToSheets: false,
    notifPendaftaranTerkirim: false,
    notifVerifikasiTerkirim: false,
  };
};

/**
 * Splits batch pasted text containing multiple applicants
 */
export const splitBatchWhatsAppMessages = (batchRawText: string): string[] => {
  const trimmed = batchRawText.trim();
  if (!trimmed) return [];

  // Check for explicit separator like "---" or "===" or empty double line breaks
  if (trimmed.includes('---')) {
    return trimmed
      .split(/\n\s*---\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  // Check if multiple numbered PSB forms are pasted together
  // (e.g. repeated "Formulir pendaftaran" headers or multiple "1. Nama lengkap" blocks)
  const numberedForms = trimmed
    .split(/(?=(?:^|\n)\s*(?:Formulir\s+pendaftaran|1\.\s*Nama\s+lengkap))/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && /1\.\s*Nama/i.test(s));

  if (numberedForms.length > 1) {
    return numberedForms;
  }

  // Check for double line breaks separating multiple key-value blocks
  const doubleBreakBlocks = trimmed
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (doubleBreakBlocks.length > 1) {
    return doubleBreakBlocks;
  }

  // If multiple lines each formatted as comma-separated
  const lines = trimmed.split(/\r?\n/).filter((l) => l.includes(','));
  if (lines.length > 1) {
    return lines;
  }

  return [trimmed];
};
