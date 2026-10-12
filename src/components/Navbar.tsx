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
                <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">
                  {academicYearConfig.namaSekolah}
                </p>
              </div>
            </div>

            {/* Discrete Panitia Access button - ultra-low opacity / transparent so guardians won't notice */}
            <button
              onClick={() => onChangeView('dashboard')}
              className="opacity-15 hover:opacity-90 transition-opacity p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
              title="Akses Petugas"
              aria-label="Akses Petugas"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Admin view or Admin previewing chatbot
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Title */}
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30 cursor-pointer"
              onClick={() => onChangeView('dashboard')}
            >
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className="font-bold text-lg tracking-tight text-white cursor-pointer"
                  onClick={() => onChangeView('dashboard')}
                >
                  Panitia PPDB Subulussalam
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  Admin Desk
                </span>
              </div>
              <p className="text-xs text-slate-400">{academicYearConfig.namaSekolah}</p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Academic Year Settings Button */}
            {onOpenAcademicYearSettings && (
              <button
                onClick={onOpenAcademicYearSettings}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition"
                title="Atur Tahun Pelajaran, Biaya & Rekening"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">TP {academicYearConfig.tahunPelajaran}</span>
              </button>
            )}

            {/* Google Sheets Status */}
            {user && sheetConfig?.spreadsheetId ? (
              <div className="hidden lg:flex items-center bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 transition text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
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
              <span className="hidden sm:inline">Google Sheets</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={onExportExcel}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition shadow-sm"
              title="Unduh rekap administrasi dalam format Excel (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>

            {/* Lock / Logout Admin Button */}
            <button
              onClick={onLockAdmin}
              className="flex items-center space-x-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-200 text-xs px-3 py-2 rounded-lg transition shadow-2xs"
              title="Kunci Akses Admin & Kembali ke Portal Wali"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kunci Admin</span>
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
                title="Login dengan Google Workspace untuk integrasi Google Sheets"
              >
                <span>Login Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
