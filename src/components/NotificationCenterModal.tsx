import React from 'react';
import { X, MessageSquare, CheckCircle2, Clock, Send, ExternalLink, RefreshCw } from 'lucide-react';
import { WhatsAppNotificationLog } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WhatsAppNotificationLog[];
  onClearLogs: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">Riwayat Notifikasi WhatsApp</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Log pengiriman konfirmasi pendaftaran & verifikasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="font-semibold text-slate-600">Belum ada riwayat notifikasi WhatsApp</p>
              <p className="text-xs text-slate-400 mt-1">
                Notifikasi akan tercatat otomatis saat pesan konfirmasi atau verifikasi dikirimkan ke pendaftar.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {log.pendaftarId}
                    </span>
                    <span className="font-semibold text-slate-900 text-xs">{log.namaLengkap}</span>
                    <span className="text-slate-400 text-[11px]">({log.noWa})</span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{log.timestamp}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full ${
                      log.type === 'KONFIRMASI_PANITIA'
                        ? 'bg-teal-100 text-teal-800'
                        : log.type === 'KONFIRMASI_PENDAFTARAN'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.type === 'VERIFIKASI_BERHASIL'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {log.type === 'KONFIRMASI_PANITIA'
                      ? '📱 Konfirmasi ke Panitia PPDB'
                      : log.type === 'KONFIRMASI_PENDAFTARAN'
                      ? '✓ Konfirmasi Pendaftaran (No ID)'
                      : log.type === 'VERIFIKASI_BERHASIL'
                      ? '✓ Lolos Verifikasi Berkas'
                      : '⚠ Perbaikan Berkas'}
                  </span>

                  <span className="text-emerald-700 font-medium flex items-center space-x-1 text-[10px] sm:text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Terkirim via WhatsApp Gateway</span>
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {log.messageText}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between text-xs">
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-slate-500 hover:text-rose-600 transition"
            >
              Hapus Riwayat
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
