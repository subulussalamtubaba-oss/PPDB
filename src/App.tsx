import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Download,
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  Layers,
  Sparkles,
  School,
  ExternalLink,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  Pendaftar,
  SheetConfig,
  WhatsAppNotificationLog,
  VerificationStatus,
  AcademicYearConfig,
  DEFAULT_ACADEMIC_YEAR_CONFIG,
} from './types';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { MonitoringTable } from './components/MonitoringTable';
import { ApplicantDetailModal } from './components/ApplicantDetailModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ChatbotPortal } from './components/ChatbotPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AcademicYearModal } from './components/AcademicYearModal';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from './services/firebaseAuth';
import {
  batchAppendApplicantsToSheet,
  appendApplicantToSheet,
  deleteApplicantFromSheet,
  deleteApplicantsFromSheet,
  fetchApplicantsFromSheet,
} from './services/googleSheets';
import { exportPendaftarToExcel } from './services/excelExporter';
import {
  sendApplicantWhatsAppNotification,
  sendCommitteeWhatsAppNotification,
} from './services/whatsappNotification';

export default function App() {
  const [applicants, setApplicants] = useState<Pendaftar[]>([]);
  const [isFetchingApplicants, setIsFetchingApplicants] = useState(true);

  // Google Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ppdb_google_access_token');
    } catch {
      return null;
    }
  });

  // Sheet configuration state
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(() => {
    try {
      const saved = localStorage.getItem('ppdb_sheet_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // Save sheet config to localStorage and database
  const handleSaveSheetConfig = async (config: SheetConfig) => {
    setSheetConfig(config);
    try {
      localStorage.setItem('ppdb_sheet_config', JSON.stringify(config));
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetConfig: config }),
      });
    } catch {
      // ignore
    }
  };

  // Authentication & UI state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ppdb_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'chatbot'>(() => {
    try {
      return sessionStorage.getItem('ppdb_admin_auth') === 'true' ? 'dashboard' : 'chatbot';
    } catch {
      return 'chatbot';
    }
  });
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedApplicant, setSelectedApplicant] = useState<Pendaftar | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingFromSheets, setIsFetchingFromSheets] = useState(false);
  const [isAcademicYearModalOpen, setIsAcademicYearModalOpen] = useState(false);

  // Dynamic Academic Year Configuration with persistence
  const [academicYearConfig, setAcademicYearConfig] = useState<AcademicYearConfig>(() => {
    try {
      const saved = localStorage.getItem('ppdb_academic_year_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_ACADEMIC_YEAR_CONFIG;
  });

  const handleSaveAcademicYearConfig = async (cfg: AcademicYearConfig) => {
    // 1. Immediately apply to local React state
    setAcademicYearConfig(cfg);

    // 2. Persist to localStorage for instant reload protection
    try {
      localStorage.setItem('ppdb_academic_year_config', JSON.stringify(cfg));
    } catch {
      // ignore
    }

    // 3. Send to server backend MongoDB database
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearConfig: cfg }),
      });

      if (response.ok) {
        const savedData = await response.json();
        if (savedData?.academicYearConfig) {
          setAcademicYearConfig(savedData.academicYearConfig);
          try {
            localStorage.setItem(
              'ppdb_academic_year_config',
              JSON.stringify(savedData.academicYearConfig)
            );
          } catch {}
        }
        showToast(
          'success',
          'Pengaturan Berhasil Disimpan Permanen!',
          `Tahun Pelajaran ${cfg.tahunPelajaran} (Angkatan ${cfg.angkatan}) telah tersimpan ke database.`
        );
      } else {
        const errText = await response.text();
        showToast(
          'error',
          'Gagal Menyimpan ke Server',
          `Pengaturan tersimpan lokal di browser, namun server mengembalikan kode: ${response.status} (${errText.slice(0, 80)})`
        );
      }
    } catch (err: any) {
      showToast(
        'info',
        'Tersimpan di Browser',
        'Pengaturan tersimpan di browser Anda. Pastikan koneksi internet stabil untuk sinkronisasi ke server.'
      );
    }
  };

  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
    subtext?: string;
  } | null>(null);

  // WhatsApp notification logs - default to empty array (clean start)
  const [notificationLogs, setNotificationLogs] = useState<WhatsAppNotificationLog[]>(() => {
    try {
      if (localStorage.getItem('ppdb_notif_logs')) {
        localStorage.removeItem('ppdb_notif_logs');
      }
      const saved = localStorage.getItem('ppdb_notif_logs_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('ppdb_notif_logs_v2', JSON.stringify(notificationLogs));
    } catch {
      // ignore
    }
  }, [notificationLogs]);

  const showToast = (
    type: 'success' | 'info' | 'error',
    text: string,
    subtext?: string
  ) => {
    setToastMessage({ type, text, subtext });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Fetch applicants and global settings from server (MongoDB or local server storage fallback)
  useEffect(() => {
    const loadApplicants = async () => {
      try {
        const response = await fetch('/api/applicants');
        if (response.ok) {
          const data = await response.json();
          setApplicants(Array.isArray(data) ? data : []);
        }
      } catch {
        // Graceful handling without throwing console.error
      } finally {
        setIsFetchingApplicants(false);
      }
    };

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.academicYearConfig) {
            setAcademicYearConfig(data.academicYearConfig);
            localStorage.setItem('ppdb_academic_year_config', JSON.stringify(data.academicYearConfig));
          }
          if (data.sheetConfig) {
            setSheetConfig(data.sheetConfig);
            localStorage.setItem('ppdb_sheet_config', JSON.stringify(data.sheetConfig));
          }
        }
      } catch {
        // ignore
      }
    };

    loadApplicants();
    loadSettings();
  }, []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLoginGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast(
          'success',
          'Berhasil Terhubung dengan Google',
          `Akun: ${result.user.email}. Siap menulis ke Google Sheets.`
        );
      }
    } catch (err: any) {
      showToast('error', 'Gagal masuk dengan Google', err.message);
    }
  };

  const handleLogoutGoogle = async () => {
    await logoutGoogle();
    setUser(null);
    setAccessToken(null);
    showToast('info', 'Keluar dari Google');
  };

  // Handle direct applicant addition from Chatbot Portal
  const handleChatbotAddApplicant = async (newApplicant: Pendaftar) => {
    try {
      const response = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApplicant)
      });
      if (response.ok) {
        const savedApplicant = await response.json();
        setApplicants((prev) => [savedApplicant, ...prev]);

        // Check if Sheets auto-sync is enabled
        if (accessToken && sheetConfig?.spreadsheetId && sheetConfig.autoSync) {
          try {
            const res = await appendApplicantToSheet(
              accessToken,
              sheetConfig.spreadsheetId,
              savedApplicant,
              applicants.length + 1,
              sheetConfig.sheetName
            );
            
            // Mark as synced locally & on server
            const syncResponse = await fetch(`/api/applicants/${savedApplicant.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ syncedToSheets: true })
            });
            if (syncResponse.ok) {
              setApplicants((prev) =>
                prev.map((a) => (a.id === savedApplicant.id ? { ...a, syncedToSheets: true } : a))
              );
            }
            
            showToast(
              'success',
              'Santri Baru Berhasil Terdaftar!',
              `ID: ${savedApplicant.id} (${savedApplicant.namaLengkap}) tercatat di Baris ${res.rowNumber} Google Sheets.`
            );
          } catch (err: any) {
            showToast(
              'info',
              'Santri Berhasil Terdaftar di Aplikasi!',
              `ID: ${savedApplicant.id}. Sinkronisasi Google Sheets tertunda: ${err.message || 'koneksi'}`
            );
          }
        } else {
          showToast(
            'success',
            'Pendaftaran Santri Baru Berhasil!',
            `ID Resmi: ${savedApplicant.id} atas nama ${savedApplicant.namaLengkap} telah masuk ke Meja Panitia.`
          );
        }
      } else {
        // Fallback local addition if server response is not ok
        setApplicants((prev) => [newApplicant, ...prev]);
        showToast(
          'success',
          'Pendaftaran Santri Baru Berhasil!',
          `ID Resmi: ${newApplicant.id} atas nama ${newApplicant.namaLengkap} telah masuk ke Meja Panitia.`
        );
      }
    } catch {
      // Fallback local addition if network issue occurs
      setApplicants((prev) => [newApplicant, ...prev]);
      showToast(
        'success',
        'Pendaftaran Santri Baru Berhasil!',
        `ID Resmi: ${newApplicant.id} atas nama ${newApplicant.namaLengkap} telah masuk ke Meja Panitia.`
      );
    }
  };

  // Lock admin desk and return to public wali portal
  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('ppdb_admin_auth');
    } catch {}
    setCurrentView('chatbot');
    showToast('info', 'Akses Panitia Dikunci', 'Kembali ke portal layanan publik pendaftaran wali murid.');
  };

  // Successfully authenticated as PPDB committee admin
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem('ppdb_admin_auth', 'true');
    } catch {}
    setIsAdminLoginModalOpen(false);
    setCurrentView('dashboard');
    showToast('success', 'Akses Panitia Terbuka', 'Selamat datang di Ruang Kerja Meja Admin PPDB Subulussalam.');
  };

  // Sync a single applicant to Google Sheets
  const handleSyncSingleToSheets = async (applicant: Pendaftar) => {
    if (!sheetConfig?.spreadsheetId) {
      showToast('info', 'Google Sheets Belum Terhubung', 'Silakan sambungkan spreadsheet pendaftaran PPDB Anda terlebih dahulu.');
      setIsSheetsModalOpen(true);
      return;
    }
    if (!accessToken) {
      showToast('info', 'Izin Akses Google Diperlukan', 'Silakan hubungkan akun Google di jendela integrasi untuk mengaktifkan sinkronisasi.');
      setIsSheetsModalOpen(true);
      return;
    }

    try {
      const index = applicants.findIndex((a) => a.id === applicant.id);
      const res = await appendApplicantToSheet(
        accessToken,
        sheetConfig.spreadsheetId,
        applicant,
        index >= 0 ? index + 1 : 1,
        sheetConfig.sheetName
      );

      setApplicants((prev) =>
        prev.map((a) => (a.id === applicant.id ? { ...a, syncedToSheets: true } : a))
      );

      showToast(
        'success',
        'Tersinkron ke Google Sheets!',
        `Data ${applicant.namaLengkap} (${applicant.id}) berhasil masuk di Baris ${res.rowNumber} (Lembar: "${res.sheetTitle}").`
      );
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setAccessToken(null);
      }
      showToast('error', 'Gagal Sinkronisasi Google Sheets', err.message);
    }
  };

  // Sync all unsynced applicants to Google Sheets
  const handleSyncAllToSheets = async () => {
    if (!sheetConfig?.spreadsheetId) {
      showToast('info', 'Google Sheets Belum Terhubung', 'Silakan sambungkan spreadsheet pendaftaran PPDB Anda terlebih dahulu.');
      setIsSheetsModalOpen(true);
      return;
    }
    if (!accessToken) {
      showToast('info', 'Izin Akses Google Diperlukan', 'Silakan hubungkan akun Google di jendela integrasi untuk mengaktifkan sinkronisasi.');
      setIsSheetsModalOpen(true);
      return;
    }

    const unsynced = applicants.filter((a) => !a.syncedToSheets);
    if (unsynced.length === 0) {
      showToast('info', 'Semua data sudah tersinkron ke Google Sheets');
      return;
    }

    setIsSyncing(true);
    try {
      const batchRes = await batchAppendApplicantsToSheet(
        accessToken,
        sheetConfig.spreadsheetId,
        unsynced,
        sheetConfig.sheetName
      );

      setApplicants((prev) => prev.map((a) => ({ ...a, syncedToSheets: true })));

      showToast(
        'success',
        `Berhasil Menyinkronkan ${unsynced.length} Data Pendaftar ke Google Sheets!`,
        `Tersimpan rapi di spreadsheet "${sheetConfig.spreadsheetTitle}" (Lembar: "${batchRes.sheetTitle}").`
      );
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setAccessToken(null);
      }
      showToast('error', 'Gagal sinkronisasi ke Google Sheets', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull / Fetch data directly from Google Sheets into the application
  const handleFetchFromSheets = async () => {
    if (!sheetConfig?.spreadsheetId) {
      showToast(
        'info',
        'Google Sheets Belum Terhubung',
        'Silakan sambungkan atau buat file spreadsheet PPDB terlebih dahulu.'
      );
      setIsSheetsModalOpen(true);
      return;
    }

    if (!accessToken) {
      showToast(
        'info',
        'Izin Akses Google Diperlukan',
        'Silakan sambungkan akun Google di jendela integrasi untuk mengizinkan penarikan data.'
      );
      setIsSheetsModalOpen(true);
      return;
    }

    setIsFetchingFromSheets(true);
    try {
      const fetched = await fetchApplicantsFromSheet(
        accessToken,
        sheetConfig.spreadsheetId,
        sheetConfig.sheetName
      );

      if (fetched.length === 0) {
        showToast(
          'info',
          'Spreadsheet Belum Memiliki Baris Pendaftar',
          `Spreadsheet "${sheetConfig.spreadsheetTitle}" sudah terhubung, namun belum ada baris data siswa yang tercatat.`
        );
      } else {
        // Smart merge: retain locally entered applicants that haven't been synced to sheets yet
        setApplicants((prev) => {
          const sheetIds = new Set(fetched.map((a) => a.id.trim().toLowerCase()));
          const pendingLocal = prev.filter(
            (a) => !a.syncedToSheets && !sheetIds.has(a.id.trim().toLowerCase())
          );
          return [...fetched, ...pendingLocal];
        });

        showToast(
          'success',
          `Berhasil Menarik ${fetched.length} Data Santri dari Google Sheets!`,
          `Data siswa dari spreadsheet "${sheetConfig.spreadsheetTitle}" telah dimuat ke dasbor pemantauan.`
        );
      }
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        setAccessToken(null);
      }
      showToast('error', 'Gagal Menarik Data dari Google Sheets', err.message);
    } finally {
      setIsFetchingFromSheets(false);
    }
  };

  // Update applicant status
  const handleUpdateStatus = async (id: string, newStatus: VerificationStatus) => {
    try {
      const response = await fetch(`/api/applicants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusVerifikasi: newStatus })
      });
      if (response.ok) {
        setApplicants((prev) =>
          prev.map((a) => {
            if (a.id === id) {
              return {
                ...a,
                statusVerifikasi: newStatus,
              };
            }
            return a;
          })
        );
        showToast('info', `Status pendaftar berhasil diubah menjadi ${newStatus}`);
      } else {
        showToast('error', 'Gagal Update Status', 'Koneksi database bermasalah.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Update Status', err.message);
    }
  };

  // Update whole applicant object (from edit modal)
  const handleUpdateApplicant = async (updated: Pendaftar) => {
    try {
      const response = await fetch(`/api/applicants/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (response.ok) {
        setApplicants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setSelectedApplicant(updated);
        showToast('success', 'Data pendaftar berhasil diperbarui');
      } else {
        showToast('error', 'Gagal Update Data', 'Koneksi database bermasalah.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Update Data', err.message);
    }
  };

  // Delete single applicant (with Google Sheets synchronization)
  const handleDeleteApplicant = async (id: string) => {
    const target = applicants.find((a) => a.id === id);
    if (!target) return;
    
    try {
      const response = await fetch(`/api/applicants/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setApplicants((prev) => prev.filter((a) => a.id !== id));

        if (accessToken && sheetConfig?.spreadsheetId) {
          try {
            const res = await deleteApplicantFromSheet(
              accessToken,
              sheetConfig.spreadsheetId,
              id,
              sheetConfig.sheetName
            );
            if (res.deletedCount > 0) {
              showToast(
                'success',
                'Data Dihapus dari Dasbor & Google Sheets',
                `Data santri ${target?.namaLengkap || id} telah dihapus permanen dari spreadsheet "${res.sheetTitle}".`
              );
            } else {
              showToast('info', 'Data pendaftaran dihapus dari dasbor');
            }
          } catch (err: any) {
            showToast(
              'error',
              'Data Dihapus dari Dasbor, namun Gagal di Google Sheets',
              err.message || 'Periksa status koneksi Google Sheets Anda.'
            );
          }
        } else {
          showToast('info', 'Data pendaftaran dihapus dari dasbor');
        }
      } else {
         showToast('error', 'Gagal Hapus', 'Koneksi database bermasalah.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Hapus', err.message);
    }
  };

  // Bulk delete applicants (with Google Sheets synchronization)
  const handleBulkDeleteApplicants = async (ids: string[]) => {
    try {
      const response = await fetch('/api/applicants/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (response.ok) {
        setApplicants((prev) => prev.filter((a) => !ids.includes(a.id)));

        if (accessToken && sheetConfig?.spreadsheetId) {
          try {
            const res = await deleteApplicantsFromSheet(
              accessToken,
              sheetConfig.spreadsheetId,
              ids,
              sheetConfig.sheetName
            );
            if (res.deletedCount > 0) {
              showToast(
                'success',
                'Data Berhasil Dihapus dari Dasbor & Google Sheets',
                `${res.deletedCount} baris data santri terpilih telah dihapus permanen dari spreadsheet "${res.sheetTitle}".`
              );
            } else {
              showToast('info', `${ids.length} data santri dihapus dari dasbor`);
            }
          } catch (err: any) {
            showToast(
              'error',
              'Data Dihapus dari Dasbor, namun Gagal di Google Sheets',
              err.message || 'Periksa status koneksi Google Sheets Anda.'
            );
          }
        } else {
          showToast('info', `${ids.length} data pendaftaran dihapus dari dasbor`);
        }
      } else {
        showToast('error', 'Gagal Hapus Massal', 'Koneksi database bermasalah.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Hapus Massal', err.message);
    }
  };

  // Send WhatsApp Notification directly
  const handleSendNotification = (
    applicant: Pendaftar,
    type:
      | 'KONFIRMASI_PENDAFTARAN'
      | 'VERIFIKASI_BERHASIL'
      | 'PERBAIKAN_BERKAS'
      | 'BERKAS_DITERIMA'
      | 'KURANG_PERSYARATAN'
      | 'JADWAL_TES'
      | 'PENGINGAT_BIAYA'
      | 'CUSTOM'
  ) => {
    const { log } = sendApplicantWhatsAppNotification(
      applicant,
      type,
      academicYearConfig.namaSekolah || 'Pondok Pesantren & Madrasah Subulussalam',
      true
    );

    setNotificationLogs((prev) => [log, ...prev]);

    setApplicants((prev) =>
      prev.map((a) => {
        if (a.id === applicant.id) {
          return {
            ...a,
            notifPendaftaranTerkirim:
              type === 'KONFIRMASI_PENDAFTARAN' ? true : a.notifPendaftaranTerkirim,
            notifVerifikasiTerkirim:
              type === 'VERIFIKASI_BERHASIL' || type === 'BERKAS_DITERIMA'
                ? true
                : a.notifVerifikasiTerkirim,
            lastNotifSentAt: new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        }
        return a;
      })
    );

    const getTitle = () => {
      switch (type) {
        case 'BERKAS_DITERIMA':
          return 'Berkas Diterima & Lengkap';
        case 'KURANG_PERSYARATAN':
        case 'PERBAIKAN_BERKAS':
          return 'Kurang Persyaratan';
        case 'JADWAL_TES':
          return 'Undangan Jadwal Tes Seleksi';
        case 'PENGINGAT_BIAYA':
          return 'Pengingat Biaya Pendaftaran';
        case 'VERIFIKASI_BERHASIL':
          return 'Verifikasi Berkas Berhasil';
        default:
          return 'Konfirmasi ID Pendaftaran';
      }
    };

    showToast(
      'success',
      'Membuka WhatsApp...',
      `Mengirim template "${getTitle()}" ke ${applicant.namaLengkap}`
    );
  };

  // Kirim Pesan Konfirmasi langsung ke Nomor WhatsApp Panitia PPDB
  const handleSendCommitteeNotification = (
    applicant: Pendaftar,
    messageText: string
  ) => {
    const panitiaWa = academicYearConfig?.kontakAdminWa || '081225865715';
    const { log } = sendCommitteeWhatsAppNotification(
      applicant,
      panitiaWa,
      messageText,
      true
    );

    setNotificationLogs((prev) => [log, ...prev]);

    showToast(
      'success',
      'Membuka WhatsApp Panitia...',
      `Konfirmasi pendaftar ${applicant.namaLengkap} diteruskan ke Panitia (${panitiaWa})`
    );
  };

  // Export to Excel handler
  const handleExportExcel = (customList?: Pendaftar[]) => {
    const listToExport = customList && customList.length > 0 ? customList : applicants;
    exportPendaftarToExcel(listToExport, 'PPDB_Subulussalam_Rekap_Pendaftar');
    showToast(
      'success',
      'File Excel Berhasil Diunduh!',
      `Terekspor ${listToExport.length} data calon siswa dengan format administrasi lengkap.`
    );
  };

  return (
    <div
      className={`bg-slate-100/70 text-slate-900 font-sans flex flex-col ${
        currentView === 'chatbot' ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-800 flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-5">
          {toastMessage.type === 'success' && (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {toastMessage.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          {toastMessage.type === 'info' && (
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold text-white">{toastMessage.text}</p>
            {toastMessage.subtext && (
              <p className="text-xs text-slate-300 mt-0.5">{toastMessage.subtext}</p>
            )}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        onLoginGoogle={handleLoginGoogle}
        onLogoutGoogle={handleLogoutGoogle}
        sheetConfig={sheetConfig}
        onOpenSheetSettings={() => setIsSheetsModalOpen(true)}
        onExportExcel={() => handleExportExcel()}
        onSyncAllToSheets={handleSyncAllToSheets}
        isSyncing={isSyncing}
        totalApplicants={applicants.length}
        currentView={currentView}
        onChangeView={(v) => {
          if (v === 'dashboard' && !isAdminAuthenticated) {
            setIsAdminLoginModalOpen(true);
          } else {
            setCurrentView(v);
          }
        }}
        isAdminLoggedIn={isAdminAuthenticated}
        onLockAdmin={handleLockAdmin}
        academicYearConfig={academicYearConfig}
        onOpenAcademicYearSettings={() => setIsAcademicYearModalOpen(true)}
      />

      {/* Main App Canvas */}
      <main
        className={`flex-1 w-full flex flex-col min-h-0 ${
          currentView === 'chatbot'
            ? 'p-0 overflow-hidden'
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'
        }`}
      >
        {!isAdminAuthenticated || currentView === 'chatbot' ? (
          <div className="flex-1 w-full flex flex-col min-h-0 overflow-hidden">
            {/* If admin is currently previewing the public portal */}
            {isAdminAuthenticated && (
              <div className="bg-emerald-950 text-white px-4 py-2.5 flex items-center justify-between text-xs z-30 shrink-0 border-b border-emerald-800">
                <span className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    Anda sedang melihat <strong>Portal Layanan Wali Murid</strong>. Wali murid umum tidak melihat meja admin.
                  </span>
                </span>
                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="bg-white text-emerald-950 font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition text-xs shadow-2xs"
                  >
                    Buka Meja Kerja Admin 📋
                  </button>
                  <button
                    onClick={handleLockAdmin}
                    className="bg-emerald-800 text-emerald-200 hover:text-white px-2.5 py-1.5 rounded-xl transition text-xs flex items-center space-x-1"
                    title="Kunci sesi admin"
                  >
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">Kunci</span>
                  </button>
                </div>
              </div>
            )}

            <ChatbotPortal
              onAddApplicant={handleChatbotAddApplicant}
              onUpdateApplicant={handleUpdateApplicant}
              existingApplicants={applicants}
              sheetConfig={sheetConfig}
              isSheetsConnected={!!accessToken && !!sheetConfig?.spreadsheetId}
              onSwitchToDashboard={() => {
                if (isAdminAuthenticated) {
                  setCurrentView('dashboard');
                } else {
                  setIsAdminLoginModalOpen(true);
                }
              }}
              isAdminLoggedIn={isAdminAuthenticated}
              academicYearConfig={academicYearConfig}
            />
          </div>
        ) : (
          <>
            {/* Admin Desk Header Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900">
                    Ruang Kerja Panitia PPDB Subulussalam
                  </h1>
                  <p className="text-[11px] text-slate-500">
                    Tahun Pelajaran {academicYearConfig.tahunPelajaran} • Angkatan {academicYearConfig.angkatan} • Data Terlindungi & Rahasia
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsAcademicYearModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 transition flex items-center space-x-1.5"
                  title="Atur Tahun Pelajaran, Biaya Pendaftaran & Info Rekening"
                >
                  <span>📅 TP {academicYearConfig.tahunPelajaran}</span>
                </button>
                <button
                  onClick={() => setCurrentView('chatbot')}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition flex items-center space-x-1.5"
                  title="Lihat tampilan percakapan yang diakses oleh wali murid"
                >
                  <span>💬 Tinjau Portal Wali</span>
                </button>
                <button
                  onClick={handleLockAdmin}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-xs font-bold text-rose-800 transition flex items-center space-x-1"
                  title="Kunci meja admin agar tidak terbuka saat ditinggalkan"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kunci Meja Admin</span>
                </button>
              </div>
            </div>

            {/* Banner Alert if Google Sheets Not Connected */}
            {!sheetConfig?.spreadsheetId && (
              <div className="bg-emerald-900 text-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white">
                      Sambungkan Aplikasi ke Google Sheets Anda
                    </h2>
                    <p className="text-xs text-emerald-200">
                      Data pendaftar yang masuk dari Chatbot Wali atau Ekstraktor WhatsApp otomatis dimasukkan ke Google Sheets resmi madrasah. Anda juga dapat menarik data yang sudah ada di Sheets ke dasbor.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSheetsModalOpen(true)}
                  className="px-4 py-2 bg-white text-emerald-950 hover:bg-emerald-50 rounded-lg font-bold text-xs sm:text-sm transition shadow-sm whitespace-nowrap"
                >
                  Aktifkan Google Sheets
                </button>
              </div>
            )}

            {/* Dashboard Statistics */}
            <DashboardStats
              applicants={applicants}
              activeFilter={activeFilter}
              onSelectFilter={(f) => setActiveFilter(f)}
            />

            {/* Monitoring & Administration Table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Dasbor Pemantauan Status Pendaftar Masuk
                  </h2>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    Live Data ({applicants.length})
                  </span>
                </div>

                <button
                  onClick={() => setIsNotifModalOpen(true)}
                  className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs"
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Riwayat Notifikasi WA ({notificationLogs.length})</span>
                </button>
              </div>

              <MonitoringTable
                applicants={applicants}
                onSelectApplicant={(a) => setSelectedApplicant(a)}
                onUpdateStatus={handleUpdateStatus}
                onDeleteApplicant={handleDeleteApplicant}
                onBulkDeleteApplicants={handleBulkDeleteApplicants}
                onSyncSingleToSheets={handleSyncSingleToSheets}
                onExportExcel={handleExportExcel}
                onSendNotification={handleSendNotification}
                isSheetsConnected={!!accessToken && !!sheetConfig?.spreadsheetId}
                activeFilter={activeFilter}
                onFilterChange={(f) => setActiveFilter(f)}
                onFetchFromSheets={handleFetchFromSheets}
                isFetchingFromSheets={isFetchingFromSheets}
                onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
                academicYearConfig={academicYearConfig}
                onSendCommitteeNotification={handleSendCommitteeNotification}
              />
            </div>
          </>
        )}
      </main>

      {/* Footer (Only shown on dashboard view to keep chatbot native & full-screen) */}
      {currentView !== 'chatbot' && (
        <footer className="bg-white border-t border-slate-200 py-4 mt-12 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <School className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">{academicYearConfig.namaSekolah}</span>
              <span>•</span>
              <span>Tahun Pelajaran {academicYearConfig.tahunPelajaran}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="hidden md:inline">Layanan Terpadu WhatsApp & Formulir Digital</span>
              <span className="hidden md:inline text-slate-300">•</span>
              {/* Hidden / Discreet Admin Access Link */}
              <button
                onClick={() => {
                  if (isAdminAuthenticated) {
                    setCurrentView('dashboard');
                  } else {
                    setIsAdminLoginModalOpen(true);
                  }
                }}
                className="text-slate-400 hover:text-slate-700 text-[11px] flex items-center space-x-1 transition opacity-40 hover:opacity-100 py-1 px-2 rounded-md hover:bg-slate-100"
                title="Akses Petugas Panitia PPDB"
              >
                <Lock className="w-3 h-3" />
                <span>{isAdminAuthenticated ? 'Meja Admin PPDB' : 'Akses Panitia'}</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Modals */}
      {isAdminLoginModalOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginModalOpen}
          onClose={() => setIsAdminLoginModalOpen(false)}
          onSuccess={handleAdminLoginSuccess}
        />
      )}

      {selectedApplicant && (
        <ApplicantDetailModal
          applicant={selectedApplicant}
          onClose={() => setSelectedApplicant(null)}
          onUpdateApplicant={handleUpdateApplicant}
          onSyncToSheets={handleSyncSingleToSheets}
          isSheetsConnected={!!accessToken && !!sheetConfig?.spreadsheetId}
          allApplicants={applicants}
          academicYearConfig={academicYearConfig}
        />
      )}

      {isSheetsModalOpen && (
        <GoogleSheetsModal
          isOpen={isSheetsModalOpen}
          onClose={() => setIsSheetsModalOpen(false)}
          user={user}
          onLoginGoogle={handleLoginGoogle}
          onLogoutGoogle={handleLogoutGoogle}
          accessToken={accessToken}
          onSetAccessToken={(token) => setAccessToken(token)}
          sheetConfig={sheetConfig}
          onSaveSheetConfig={handleSaveSheetConfig}
          applicants={applicants}
          onSyncAll={handleSyncAllToSheets}
          isSyncing={isSyncing}
          onFetchFromSheets={handleFetchFromSheets}
          isFetchingFromSheets={isFetchingFromSheets}
        />
      )}

      {isAcademicYearModalOpen && (
        <AcademicYearModal
          isOpen={isAcademicYearModalOpen}
          onClose={() => setIsAcademicYearModalOpen(false)}
          config={academicYearConfig}
          onSaveConfig={handleSaveAcademicYearConfig}
        />
      )}

      {isNotifModalOpen && (
        <NotificationCenterModal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
          logs={notificationLogs}
          onClearLogs={() => setNotificationLogs([])}
        />
      )}
    </div>
  );
}
