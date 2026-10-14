import React from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  School,
  Lock,
  Calendar,
} from 'lucide-react';
import { SheetConfig, AcademicYearConfig, DEFAULT_ACADEMIC_YEAR_CONFIG } from '../types';

interface NavbarProps {
  user: User | null;
  onLoginGoogle: () => void;
  onLogoutGoogle: () => void;
  sheetConfig: SheetConfig | null;
  onOpenSheetSettings: () => void;
  onExportExcel: () => void;
  onSyncAllToSheets: () => void;
  isSyncing: boolean;
  totalApplicants: number;
  currentView: 'dashboard' | 'chatbot';
  onChangeView: (view: 'dashboard' | 'chatbot') => void;
  isAdminLoggedIn: boolean;
  onLockAdmin: () => void;
  academicYearConfig?: AcademicYearConfig;
  onOpenAcademicYearSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLoginGoogle,
  onLogoutGoogle,
  sheetConfig,
  onOpenSheetSettings,
  onExportExcel,
  onSyncAllToSheets,
  isSyncing,
  totalApplicants,
  currentView,
  onChangeView,
  isAdminLoggedIn,
  onLockAdmin,
  academicYearConfig = DEFAULT_ACADEMIC_YEAR_CONFIG,
  onOpenAcademicYearSettings,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // If viewing public Chatbot (and not actively browsing admin)
  if (currentView === 'chatbot' && !isAdminLoggedIn) {
    return (
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13 sm:h-14">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <School className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                    PPDB Subulussalam
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                    {academicYearConfig.tahunPelajaran}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden min-[400px]:block truncate max-w-[200px]">
                  {academicYearConfig.namaSekolah}
                </p>
              </div>
            </div>

            {/* Discrete Panitia Access button */}
            <button
              onClick={() => onChangeView('dashboard')}
              className="opacity-20 hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Akses Petugas"
              aria-label="Akses Petugas"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Admin view
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & School Title */}
          <div
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer select-none min-w-0"
            onClick={() => onChangeView('dashboard')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30 shrink-0">
              <School className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-sm sm:text-lg tracking-tight text-white truncate">
                  PPDB Subulussalam
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 shrink-0">
                  Meja Admin
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden min-[400px]:block">
                TP {academicYearConfig.tahunPelajaran} • Angkatan {academicYearConfig.angkatan}
              </p>
            </div>
          </div>

          {/* Desktop Controls (hidden on mobile, visible on md+) */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            {/* Academic Year Settings Button */}
            {onOpenAcademicYearSettings && (
              <button
                onClick={onOpenAcademicYearSettings}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition"
                title="Atur Tahun Pelajaran, Biaya & Rekening"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>TP {academicYearConfig.tahunPelajaran}</span>
              </button>
            )}

            {/* Google Sheets Status */}
            {user && sheetConfig?.spreadsheetId ? (
              <div className="hidden lg:flex items-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 transition text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                <span className="text-slate-300 mr-2 max-w-[140px] truncate font-medium">
                  {sheetConfig.spreadsheetTitle || 'Google Sheets'}
                </span>
                <a
                  href={sheetConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 ml-1 flex items-center"
                  title="Buka Google Sheets di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : null}

            {/* Google Sheets Settings Trigger */}
            <button
              onClick={onOpenSheetSettings}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition"
              title="Atur Integrasi Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Sheets</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={onExportExcel}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition shadow-sm"
              title="Unduh rekap administrasi dalam format Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>

            {/* Lock / Logout Admin Button */}
            <button
              onClick={onLockAdmin}
              className="flex items-center space-x-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-200 text-xs px-3 py-2 rounded-lg transition shadow-2xs"
              title="Kunci Akses Admin & Kembali ke Portal Wali"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Kunci Admin</span>
            </button>

            {/* Google Sign-in / User Profile */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Admin'}
                    className="w-7 h-7 rounded-full border border-emerald-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-200">
                    {user.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                )}
                <button
                  onClick={onLogoutGoogle}
                  className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
                  title="Logout Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginGoogle}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition font-medium flex items-center space-x-1"
                title="Login dengan Google Workspace"
              >
                <span>Login Google</span>
              </button>
            )}
          </div>

          {/* Mobile Right Controls: Compact quick export (icon-only, no text) + Menu Trigger button */}
          <div className="flex md:hidden items-center space-x-1.5">
            <button
              onClick={onExportExcel}
              className="min-h-[40px] min-w-[40px] p-2 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-lg flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
              title="Ekspor Excel"
              aria-label="Ekspor Excel"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="min-h-[40px] min-w-[40px] p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg border border-slate-700 flex items-center justify-center transition"
              aria-label="Buka Menu Admin"
              title="Menu Meja Admin"
            >
              <div className="space-y-1 w-4">
                <span className={`block h-0.5 bg-current transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <span className={`block h-0.5 bg-current transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-current transition-transform duration-200 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Bottom Action Sheet */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Menu Meja Admin</h3>
                <p className="text-[11px] text-slate-400">{academicYearConfig.namaSekolah}</p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {/* Tahun Pelajaran & Biaya */}
              {onOpenAcademicYearSettings && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAcademicYearSettings();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:bg-slate-700 text-left border border-slate-700 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Tahun Pelajaran & Biaya</span>
                      <span className="text-[11px] text-slate-400 block">
                        TP {academicYearConfig.tahunPelajaran} • Biaya Rp {academicYearConfig.biayaPendaftaran}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-semibold">Atur</span>
                </button>
              )}

              {/* Google Sheets */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSheetSettings();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:bg-slate-700 text-left border border-slate-700 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Integrasi Google Sheets</span>
                    <span className="text-[11px] text-slate-400 block">
                      {sheetConfig?.spreadsheetId ? `Tersambung (${sheetConfig.spreadsheetTitle || 'Sheets'})` : 'Belum tersambung'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">Kelola</span>
              </button>

              {/* Ekspor Excel */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onExportExcel();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:bg-slate-700 text-left border border-slate-700 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Unduh Rekap Excel (.xlsx)</span>
                    <span className="text-[11px] text-slate-400 block">Simpan file spreadsheet ke HP</span>
                  </div>
                </div>
                <span className="text-xs text-blue-400 font-semibold">Unduh</span>
              </button>

              {/* Tinjau Portal Wali */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onChangeView('chatbot');
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:bg-slate-700 text-left border border-slate-700 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Tinjau Portal Chatbot Wali</span>
                    <span className="text-[11px] text-slate-400 block">Lihat simulasi pengisian wali murid</span>
                  </div>
                </div>
                <span className="text-xs text-teal-400 font-semibold">Buka</span>
              </button>

              {/* Akun Google */}
              {user ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700 text-xs">
                  <div className="flex items-center space-x-2.5 truncate mr-2">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User"
                        className="w-7 h-7 rounded-full border border-emerald-500 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-200 shrink-0">
                        {user.email?.charAt(0).toUpperCase() || 'A'}
                      </div>
                    )}
                    <span className="text-slate-300 truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLogoutGoogle();
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded bg-rose-950/40 border border-rose-900/50 shrink-0"
                  >
                    Logout Google
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLoginGoogle();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 text-center flex items-center justify-center space-x-2"
                >
                  <span>Hubungkan Akun Google</span>
                </button>
              )}

              {/* Kunci Meja Admin */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLockAdmin();
                }}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition"
              >
                <Lock className="w-4 h-4" />
                <span>Kunci Meja Kerja Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
