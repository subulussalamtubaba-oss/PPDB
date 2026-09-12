import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  PlusCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Link2,
  KeyRound,
  LogOut,
  Maximize2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SheetConfig, Pendaftar } from '../types';
import { createPpdbSpreadsheet, verifySpreadsheetAccess } from '../services/googleSheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLoginGoogle: () => void;
  onLogoutGoogle?: () => void;
  accessToken: string | null;
  onSetAccessToken?: (token: string | null) => void;
  sheetConfig: SheetConfig | null;
  onSaveSheetConfig: (config: SheetConfig) => void;
  applicants: Pendaftar[];
  onSyncAll: () => Promise<void>;
  isSyncing: boolean;
  onFetchFromSheets?: () => Promise<void>;
  isFetchingFromSheets?: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  user,
  onLoginGoogle,
  onLogoutGoogle,
  accessToken,
  onSetAccessToken,
  sheetConfig,
  onSaveSheetConfig,
  applicants,
  onSyncAll,
  isSyncing,
  onFetchFromSheets,
  isFetchingFromSheets = false,
}) => {
  const [existingInput, setExistingInput] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customTitle, setCustomTitle] = useState('Data PPDB 2026/2027 - Subulussalam');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);
  const [manualToken, setManualToken] = useState('');

  if (!isOpen) return null;

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setErrorMessage('Izin token Google Sheets belum tersedia. Silakan hubungkan akun Google di atas.');
      return;
    }

    setIsCreatingNew(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await createPpdbSpreadsheet(accessToken, customTitle);
      const newConfig: SheetConfig = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: result.title,
        spreadsheetUrl: result.spreadsheetUrl,
        sheetName: 'Data Pendaftar PPDB',
        autoSync: true,
      };

      onSaveSheetConfig(newConfig);
      setSuccessMessage(`Berhasil membuat spreadsheet baru: "${result.title}"`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat Google Sheet');
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleConnectExistingSheet = async () => {
    if (!accessToken) {
      setErrorMessage('Izin token Google Sheets belum tersedia. Silakan hubungkan akun Google di atas.');
      return;
    }

    if (!existingInput.trim()) {
      setErrorMessage('Masukkan ID atau tautan (URL) spreadsheet');
      return;
    }

    // Extract ID if full URL pasted
    let extractedId = existingInput.trim();
    const match = extractedId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      extractedId = match[1];
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const info = await verifySpreadsheetAccess(accessToken, extractedId);
      const newConfig: SheetConfig = {
        spreadsheetId: extractedId,
        spreadsheetTitle: info.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
        sheetName: info.sheets[0] || 'Sheet1',
        autoSync: true,
      };

      onSaveSheetConfig(newConfig);
      setSuccessMessage(`Berhasil terhubung ke spreadsheet: "${info.title}"`);
      setExistingInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengakses spreadsheet');
    }
  };

  const handleApplyManualToken = () => {
    if (!manualToken.trim()) {
      setErrorMessage('Silakan tempel token akses Google yang valid.');
      return;
    }
    if (onSetAccessToken) {
      onSetAccessToken(manualToken.trim());
      setSuccessMessage('Token akses Google manual berhasil disimpan!');
      setErrorMessage(null);
      setManualToken('');
      setShowManualToken(false);
    }
  };

  const unSyncedCount = applicants.filter((a) => !a.syncedToSheets).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Integrasi Google Sheets API</h2>
              <p className="text-xs text-slate-400">Penyimpanan & Sinkronisasi Data Pendaftar PPDB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto">
          {/* Auth State Banner */}
          {!user ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950 space-y-3">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Akun Google Belum Terhubung</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Untuk menyinkronkan data pendaftar langsung ke Google Sheets secara resmi, silakan hubungkan akun Google Anda.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={onLoginGoogle}
                  className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-lg border border-slate-300 flex items-center justify-center space-x-2 shadow-xs transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Masuk dengan Google</span>
                </button>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 flex items-center justify-center space-x-1.5 transition text-center"
                  title="Buka tab baru jika browser Anda memblokir popup Google Auth di pratinjau"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Buka di Tab Baru</span>
                </a>
              </div>
            </div>
          ) : !accessToken ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-950 space-y-3">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Izin Token Google Sheets Perlu Diperbarui</span>
              </div>
              <p className="text-slate-600">
                Akun terhubung: <strong>{user.email}</strong>. Sesi token akses Google Sheets Anda perlu disegarkan agar aplikasi diizinkan menulis ke spreadsheet Anda.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onLoginGoogle}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center space-x-2 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Segarkan Izin Akses Google</span>
                </button>
                {onLogoutGoogle && (
                  <button
                    onClick={onLogoutGoogle}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg flex items-center space-x-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Ganti Akun</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800 block">{user.displayName || user.email}</span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    ✓ Akun Google & Token Akses Aktif (Siap Menulis ke Sheets)
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={onLoginGoogle}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium text-[11px] transition"
                  title="Perbarui token jika telah kedaluwarsa"
                >
                  Segarkan
                </button>
                {onLogoutGoogle && (
                  <button
                    onClick={onLogoutGoogle}
                    className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 rounded-lg font-medium text-[11px] transition"
                    title="Keluar dari akun Google"
                  >
                    Keluar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Sheet Status */}
          {sheetConfig?.spreadsheetId && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Spreadsheet Aktif:</span>
                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1"
                >
                  <span>Buka di Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{sheetConfig.spreadsheetTitle}</p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  ID: {sheetConfig.spreadsheetId}
                </p>
              </div>

              {/* Action Buttons: Fetch and Push */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="text-xs text-slate-500">
                    Belum tersinkron ke Sheets: <strong className="text-slate-800">{unSyncedCount}</strong> siswa
                  </div>
                  <div className="flex items-center space-x-2">
                    {onFetchFromSheets && (
                      <button
                        type="button"
                        onClick={onFetchFromSheets}
                        disabled={isFetchingFromSheets || !accessToken}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition border ${
                          isFetchingFromSheets || !accessToken
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                        }`}
                        title="Tarik seluruh data pendaftar yang ada di Google Spreadsheet ke dalam aplikasi"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isFetchingFromSheets ? 'animate-spin' : ''}`} />
                        <span>{isFetchingFromSheets ? 'Menarik Data...' : 'Tarik Data dari Sheets'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onSyncAll}
                      disabled={isSyncing || unSyncedCount === 0 || !accessToken}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                        isSyncing || unSyncedCount === 0 || !accessToken
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                      title={!accessToken ? 'Sambungkan akun Google terlebih dahulu' : 'Kirim semua data siswa ke Google Sheets'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Mengirim...' : `Kirim Data (${unSyncedCount})`}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Option 1: Create New Sheet */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 font-bold text-slate-800">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Buat Spreadsheet PPDB Baru Secara Otomatis</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Sistem akan membuat file Google Sheet baru di akun Google Anda lengkap dengan 14 kolom terformat resmi (ID Pendaftaran, Nama, Tanggal Lahir, Asal Sekolah, No WA, NISN, PIP, Status Verifikasi, dll).
            </p>
            <div className="space-y-2">
              <label className="text-slate-600 font-medium block">Nama Spreadsheet Baru:</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-medium"
              />
              <button
                onClick={handleCreateNewSheet}
                disabled={!accessToken || isCreatingNew}
                className={`w-full py-2.5 rounded-lg font-bold text-white flex items-center justify-center space-x-2 transition ${
                  !accessToken || isCreatingNew
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                }`}
              >
                {isCreatingNew ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Membuat Spreadsheet di Google Drive...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Buat & Sambungkan Google Sheet Baru</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Connect Existing Sheet */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 font-bold text-slate-800">
              <Link2 className="w-4 h-4 text-slate-600" />
              <span>Atau Sambungkan ke Google Sheet yang Sudah Ada</span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={existingInput}
                onChange={(e) => setExistingInput(e.target.value)}
                placeholder="Tempel URL atau ID Spreadsheet (contoh: 1BxiMVs0XRA5nFMdKvBdB...)"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
              <button
                onClick={handleConnectExistingSheet}
                disabled={!accessToken || !existingInput.trim()}
                className="w-full py-2 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-white transition disabled:bg-slate-300"
              >
                Hubungkan Spreadsheet
              </button>
            </div>
          </div>

          {/* Manual Token Option (Fallback if popup is blocked by iframe) */}
          <div className="pt-1">
            <button
              onClick={() => setShowManualToken(!showManualToken)}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-1"
            >
              <KeyRound className="w-3 h-3" />
              <span>{showManualToken ? 'Tutup Pengaturan Token Manual' : 'Opsi Lanjutan: Tempel Token Akses Google Manual'}</span>
            </button>
            {showManualToken && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] text-slate-600">
                  Jika browser memblokir popup Google Auth di dalam pratinjau, Anda dapat menempelkan Google OAuth Access Token secara langsung di sini:
                </p>
                <input
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Bearer ya29.a0Ac..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
                <button
                  onClick={handleApplyManualToken}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition"
                >
                  Terapkan Token
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {sheetConfig ? `Terhubung: ${sheetConfig.spreadsheetTitle}` : 'Belum terhubung'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
