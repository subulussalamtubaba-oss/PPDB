import { Pendaftar, VerificationStatus } from '../types';

export const PPDB_SHEET_HEADERS = [
  'No',
  'ID Pendaftaran',
  'Waktu Masuk',
  'Nama Lengkap',
  'Tanggal Lahir',
  'Nama Wali',
  'Alamat Tinggal',
  'Asal Sekolah',
  'No. WhatsApp',
  'NISN',
  'Penerima PIP',
  'Status Pembayaran',
  'Status Verifikasi',
  'Catatan Verifikasi',
];

export interface CreatedSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export const createPpdbSpreadsheet = async (
  accessToken: string,
  title: string = 'PPDB 2026/2027 - Data Pendaftar Masuk'
): Promise<CreatedSpreadsheetResponse> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Data Pendaftar PPDB',
            gridProperties: {
              rowCount: 1000,
              columnCount: PPDB_SHEET_HEADERS.length,
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: PPDB_SHEET_HEADERS.map((header) => ({
                    userEnteredValue: { stringValue: header },
                    userEnteredFormat: {
                      backgroundColor: { red: 0.12, green: 0.44, blue: 0.35 }, // Emerald dark header
                      textFormat: {
                        bold: true,
                        foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                        fontSize: 10,
                      },
                      horizontalAlignment: 'CENTER',
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membuat Google Sheet: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || title,
  };
};

export const parseGoogleError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    if (data?.error?.message) {
      if (response.status === 401) {
        return 'Sesi token Google telah kedaluwarsa (401 Unauthorized). Silakan klik "Hubungkan Ulang Google" pada menu Google Sheets.';
      }
      if (response.status === 403) {
        return 'Akses ke spreadsheet ditolak (403 Forbidden). Pastikan akun Google Anda memiliki izin Edit pada file spreadsheet tersebut.';
      }
      if (response.status === 404) {
        return 'Spreadsheet tidak ditemukan (404 Not Found). Pastikan ID spreadsheet sudah benar.';
      }
      return data.error.message;
    }
  } catch {
    // If JSON parsing fails, fallback to status
  }
  if (response.status === 401) {
    return 'Sesi token Google telah kedaluwarsa. Silakan masuk ulang dengan akun Google.';
  }
  return `Google Sheets API Error (${response.status})`;
};

// Helper: Determine the active/valid sheet title from the spreadsheet
export const getActiveSheetTitle = async (
  accessToken: string,
  spreadsheetId: string,
  preferredTitle?: string
): Promise<string> => {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (response.ok) {
      const data = await response.json();
      const sheetTitles: string[] = (data.sheets || []).map((s: any) => s.properties?.title || '').filter(Boolean);
      if (sheetTitles.length > 0) {
        if (preferredTitle && sheetTitles.includes(preferredTitle)) {
          return preferredTitle;
        }
        // If preferred title matches partially or defaults
        const match = sheetTitles.find((t) => t.toLowerCase().includes('ppdb') || t.toLowerCase().includes('pendaftar'));
        return match || sheetTitles[0];
      }
    }
  } catch {
    // fallback if metadata call fails
  }
  return preferredTitle || 'Data Pendaftar PPDB';
};

// Helper: Ensure the official PPDB headers exist in row 1
export const ensureSheetHeaders = async (
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> => {
  try {
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      sheetTitle
    )}'!A1:B1`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let needsHeader = true;
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const firstRow = checkData.values?.[0] || [];
      if (firstRow.length > 0 && String(firstRow[0]).trim().toLowerCase() === 'no') {
        needsHeader = false;
      }
    }

    if (needsHeader) {
      const writeHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
        sheetTitle
      )}'!A1:N1?valueInputOption=USER_ENTERED`;
      await fetch(writeHeaderUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `'${sheetTitle}'!A1:N1`,
          majorDimension: 'ROWS',
          values: [PPDB_SHEET_HEADERS],
        }),
      });
    }
  } catch {
    // Best-effort header check
  }
};

export interface SyncApplicantResult {
  success: boolean;
  rowNumber: number;
  sheetTitle: string;
}

export const appendApplicantToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  applicant: Pendaftar,
  indexNumber: number,
  preferredSheetTitle?: string
): Promise<SyncApplicantResult> => {
  // 1. Resolve true active sheet title
  const sheetTitle = await getActiveSheetTitle(accessToken, spreadsheetId, preferredSheetTitle);

  // 2. Ensure header row exists on row 1
  await ensureSheetHeaders(accessToken, spreadsheetId, sheetTitle);

  // 3. Inspect existing rows in columns A & B to find either existing ID or next empty row
  const getRowsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
    sheetTitle
  )}'!A1:B1000`;
  const getRowsRes = await fetch(getRowsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let targetRow = 2;
  let computedIndex = indexNumber;

  if (getRowsRes.ok) {
    const data = await getRowsRes.json();
    const rows: string[][] = data.values || [];

    // Check if applicant ID already exists in column B (index 1)
    let existingRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const rowId = rows[i]?.[1]?.toString().trim();
      if (rowId && rowId.toLowerCase() === applicant.id.trim().toLowerCase()) {
        existingRowIndex = i + 1; // 1-indexed row number in sheet
        break;
      }
    }

    if (existingRowIndex > 0) {
      targetRow = existingRowIndex;
      // Keep existing index number if valid
      const existingNo = parseInt(rows[existingRowIndex - 1]?.[0], 10);
      if (!isNaN(existingNo)) {
        computedIndex = existingNo;
      }
    } else {
      // Next free row (at least row 2)
      targetRow = Math.max(rows.length + 1, 2);
      computedIndex = Math.max(rows.length, 1);
    }
  }

  const rowValues = [
    computedIndex,
    applicant.id,
    applicant.timestamp,
    applicant.namaLengkap,
    applicant.tanggalLahir,
    applicant.namaWali,
    applicant.alamatTinggal,
    applicant.asalSekolah,
    applicant.noWa,
    applicant.nisn,
    applicant.pipSebelumnya,
    applicant.statusPembayaran === 'Sudah' && applicant.nominalTransfer
      ? `Sudah (Rp ${applicant.nominalTransfer} via ${applicant.metodeTransfer || '-'} a/n ${applicant.namaPengirimTransfer || '-'})`
      : applicant.statusPembayaran,
    applicant.statusVerifikasi,
    applicant.catatanVerifikasi.join('; ') || 'Data lengkap dan valid',
  ];

  // 4. Directly update the exact target row (A{targetRow}:N{targetRow})
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
    sheetTitle
  )}'!A${targetRow}:N${targetRow}?valueInputOption=USER_ENTERED`;

  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `'${sheetTitle}'!A${targetRow}:N${targetRow}`,
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  if (response.ok) {
    return { success: true, rowNumber: targetRow, sheetTitle };
  }

  // Fallback to append if direct PUT fails
  const lastErrorMessage = await parseGoogleError(response);
  throw new Error(`Gagal mencatat data ke Google Sheets: ${lastErrorMessage}`);
};

export const batchAppendApplicantsToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  applicants: Pendaftar[],
  preferredSheetTitle?: string
): Promise<{ success: boolean; count: number; sheetTitle: string }> => {
  if (applicants.length === 0) return { success: true, count: 0, sheetTitle: preferredSheetTitle || '' };

  // 1. Resolve true active sheet title
  const sheetTitle = await getActiveSheetTitle(accessToken, spreadsheetId, preferredSheetTitle);

  // 2. Ensure header row exists on row 1
  await ensureSheetHeaders(accessToken, spreadsheetId, sheetTitle);

  // 3. Inspect existing rows
  const getRowsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
    sheetTitle
  )}'!A1:B1000`;
  const getRowsRes = await fetch(getRowsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let nextFreeRow = 2;
  const existingIdToRowMap: Record<string, number> = {};

  if (getRowsRes.ok) {
    const data = await getRowsRes.json();
    const rows: string[][] = data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const rowId = rows[i]?.[1]?.toString().trim();
      if (rowId) {
        existingIdToRowMap[rowId.toLowerCase()] = i + 1;
      }
    }
    nextFreeRow = Math.max(rows.length + 1, 2);
  }

  // Separate applicants into updates vs new inserts
  const updates: { row: number; values: any[] }[] = [];
  const inserts: { row: number; values: any[] }[] = [];

  applicants.forEach((applicant) => {
    const existingRow = existingIdToRowMap[applicant.id.trim().toLowerCase()];
    if (existingRow) {
      updates.push({
        row: existingRow,
        values: [
          existingRow - 1,
          applicant.id,
          applicant.timestamp,
          applicant.namaLengkap,
          applicant.tanggalLahir,
          applicant.namaWali,
          applicant.alamatTinggal,
          applicant.asalSekolah,
          applicant.noWa,
          applicant.nisn,
          applicant.pipSebelumnya,
          applicant.statusPembayaran,
          applicant.statusVerifikasi,
          applicant.catatanVerifikasi.join('; ') || 'Data lengkap dan valid',
        ],
      });
    } else {
      const assignedRow = nextFreeRow++;
      inserts.push({
        row: assignedRow,
        values: [
          assignedRow - 1,
          applicant.id,
          applicant.timestamp,
          applicant.namaLengkap,
          applicant.tanggalLahir,
          applicant.namaWali,
          applicant.alamatTinggal,
          applicant.asalSekolah,
          applicant.noWa,
          applicant.nisn,
          applicant.pipSebelumnya,
          applicant.statusPembayaran,
          applicant.statusVerifikasi,
          applicant.catatanVerifikasi.join('; ') || 'Data lengkap dan valid',
        ],
      });
    }
  });

  // Batch update all data
  const dataPayload: { range: string; values: any[][] }[] = [];

  // If contiguous inserts exist
  if (inserts.length > 0) {
    const startRow = inserts[0].row;
    const endRow = inserts[inserts.length - 1].row;
    dataPayload.push({
      range: `'${sheetTitle}'!A${startRow}:N${endRow}`,
      values: inserts.map((item) => item.values),
    });
  }

  // Add updates individually
  updates.forEach((u) => {
    dataPayload.push({
      range: `'${sheetTitle}'!A${u.row}:N${u.row}`,
      values: [u.values],
    });
  });

  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const response = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataPayload,
    }),
  });

  if (response.ok) {
    return { success: true, count: applicants.length, sheetTitle };
  }

  const errMessage = await parseGoogleError(response);
  throw new Error(`Gagal batch sync ke Google Sheets: ${errMessage}`);
};

export const verifySpreadsheetAccess = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: string[] }> => {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Tidak dapat mengakses spreadsheet dengan ID tersebut (HTTP ${response.status})`);
  }

  const data = await response.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || '');
  return {
    title: data.properties?.title || 'Spreadsheet PPDB',
    sheets,
  };
};

export interface DeleteFromSheetResult {
  success: boolean;
  deletedCount: number;
  sheetTitle: string;
  message?: string;
}

export const deleteApplicantFromSheet = async (
  accessToken: string,
  spreadsheetId: string,
  applicantId: string,
  preferredSheetTitle?: string
): Promise<DeleteFromSheetResult> => {
  return deleteApplicantsFromSheet(accessToken, spreadsheetId, [applicantId], preferredSheetTitle);
};

export const deleteApplicantsFromSheet = async (
  accessToken: string,
  spreadsheetId: string,
  applicantIds: string[],
  preferredSheetTitle?: string
): Promise<DeleteFromSheetResult> => {
  if (applicantIds.length === 0) {
    return { success: true, deletedCount: 0, sheetTitle: preferredSheetTitle || '' };
  }

  // 1. Get spreadsheet metadata with sheetId & titles
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const errMsg = await parseGoogleError(metaRes);
    throw new Error(`Gagal membaca metadata spreadsheet: ${errMsg}`);
  }

  const metaData = await metaRes.json();
  const sheets: Array<{ properties: { sheetId: number; title: string } }> = metaData.sheets || [];

  // Find matching sheet or fallback to first sheet
  let targetSheet = sheets.find(
    (s) => preferredSheetTitle && s.properties?.title?.toLowerCase() === preferredSheetTitle.toLowerCase()
  );
  if (!targetSheet) {
    targetSheet =
      sheets.find((s) => {
        const t = s.properties?.title?.toLowerCase() || '';
        return t.includes('ppdb') || t.includes('pendaftar');
      }) || sheets[0];
  }

  if (!targetSheet || targetSheet.properties.sheetId === undefined) {
    throw new Error('Lembar kerja spreadsheet tidak ditemukan.');
  }

  const sheetId = targetSheet.properties.sheetId;
  const sheetTitle = targetSheet.properties.title;

  // 2. Fetch Column B (where applicant ID is stored)
  const rowsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      sheetTitle
    )}'!B1:B2000`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!rowsRes.ok) {
    const errMsg = await parseGoogleError(rowsRes);
    throw new Error(`Gagal membaca kolom ID di spreadsheet: ${errMsg}`);
  }

  const rowsData = await rowsRes.json();
  const values: string[][] = rowsData.values || [];

  const targetIdsSet = new Set(applicantIds.map((id) => id.trim().toLowerCase()));

  // Collect 0-indexed row numbers that match
  const matchedRowIndices: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const rowId = values[i]?.[0]?.toString().trim().toLowerCase();
    if (rowId && targetIdsSet.has(rowId)) {
      matchedRowIndices.push(i);
    }
  }

  if (matchedRowIndices.length === 0) {
    return {
      success: true,
      deletedCount: 0,
      sheetTitle,
      message: 'ID pendaftar tidak ditemukan di Google Sheets (mungkin belum disinkronkan).',
    };
  }

  // Sort matched row indices in DESCENDING order so deletion of lower indices doesn't offset subsequent rows
  matchedRowIndices.sort((a, b) => b - a);

  // 3. Build deleteDimension requests
  const requests = matchedRowIndices.map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      },
    },
  }));

  const batchUpdateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!batchUpdateRes.ok) {
    const errMsg = await parseGoogleError(batchUpdateRes);
    throw new Error(`Gagal menghapus baris di Google Sheets: ${errMsg}`);
  }

  return {
    success: true,
    deletedCount: matchedRowIndices.length,
    sheetTitle,
  };
};

/**
 * Fetch all registered applicants directly from the connected Google Spreadsheet.
 * Converts spreadsheet rows into application Pendaftar objects.
 */
export const fetchApplicantsFromSheet = async (
  accessToken: string,
  spreadsheetId: string,
  preferredSheetTitle?: string
): Promise<Pendaftar[]> => {
  // 1. Resolve true active sheet title
  const sheetTitle = await getActiveSheetTitle(accessToken, spreadsheetId, preferredSheetTitle);

  // 2. Fetch all values in columns A through N
  const fetchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
    sheetTitle
  )}'!A:N`;

  const response = await fetch(fetchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorMsg = await parseGoogleError(response);
    throw new Error(`Gagal membaca data dari Google Sheets: ${errorMsg}`);
  }

  const data = await response.json();
  const rows: (string | undefined)[][] = data.values || [];

  if (rows.length <= 1) {
    // Only header or empty
    return [];
  }

  const applicants: Pendaftar[] = [];

  // Loop through rows (skip row 0 which is the header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawId = (row[1] || '').trim();
    const rawNama = (row[3] || '').trim();

    // Skip blank or completely empty placeholder rows
    if (!rawId && !rawNama) continue;

    const timestamp = (row[2] || '').trim() || new Date().toLocaleString('id-ID');
    const tanggalLahir = (row[4] || '').trim();
    const namaWali = (row[5] || '').trim();
    const alamatTinggal = (row[6] || '').trim();
    const asalSekolah = (row[7] || '').trim();
    const noWa = (row[8] || '').trim();
    const nisn = (row[9] || '').trim();
    const rawPip = (row[10] || '').trim().toLowerCase();
    const rawBayar = (row[11] || '').trim().toLowerCase();
    const rawStatus = (row[12] || '').trim().toUpperCase();
    const rawCatatan = (row[13] || '').trim();

    // Normalize verification status
    let statusVerifikasi: VerificationStatus = 'MENUNGGU VERIFIKASI';
    if (rawStatus.includes('TERVERIFIKASI') || rawStatus.includes('LOLOS') || rawStatus.includes('DITERIMA')) {
      statusVerifikasi = 'TERVERIFIKASI';
    } else if (rawStatus.includes('PERBAIKAN') || rawStatus.includes('KURANG') || rawStatus.includes('REVISI')) {
      statusVerifikasi = 'PERLU PERBAIKAN';
    } else if (rawStatus.includes('TOLAK') || rawStatus.includes('BATAL') || rawStatus.includes('DITOLAK')) {
      statusVerifikasi = 'DITOLAK';
    }

    const pipSebelumnya: 'Ya' | 'Tidak' =
      rawPip === 'ya' || rawPip === 'true' || rawPip === '1' || rawPip === 'ada' ? 'Ya' : 'Tidak';

    const statusPembayaran: 'Sudah' | 'Belum' =
      rawBayar.includes('sudah') || rawBayar.includes('lunas') || rawBayar === 'ya' || rawBayar === '1'
        ? 'Sudah'
        : 'Belum';

    // Normalize WA
    const digitsOnly = noWa.replace(/\D/g, '');
    let normalizedWa = digitsOnly;
    if (digitsOnly.startsWith('0')) {
      normalizedWa = '62' + digitsOnly.substring(1);
    } else if (digitsOnly.startsWith('8')) {
      normalizedWa = '62' + digitsOnly;
    }

    const catatanVerifikasi = rawCatatan
      ? rawCatatan
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean)
      : ['Data tersinkron dari Google Sheets'];

    const id = rawId || `A-${new Date().getFullYear()}-${String(i).padStart(4, '0')}`;

    applicants.push({
      id,
      timestamp,
      rawMessage: `Sinkronisasi dari Google Sheets: ${rawNama} (${id})`,
      namaLengkap: rawNama || 'Tanpa Nama',
      tanggalLahir,
      namaWali,
      alamatTinggal,
      asalSekolah,
      noWa,
      normalizedWa,
      nisn,
      pipSebelumnya,
      statusPembayaran,
      statusVerifikasi,
      catatanVerifikasi,
      verificationScore: statusVerifikasi === 'TERVERIFIKASI' ? 100 : statusVerifikasi === 'PERLU PERBAIKAN' ? 65 : 90,
      syncedToSheets: true,
      sheetsRowIndex: i + 1,
      notifPendaftaranTerkirim: true,
      notifVerifikasiTerkirim: statusVerifikasi === 'TERVERIFIKASI',
    });
  }

  return applicants;
};
