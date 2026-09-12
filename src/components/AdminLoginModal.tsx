import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, X, CheckCircle, School } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();

    // Default PIN: 2026 or admin2026 or subulussalam
    if (cleanPin === '2026' || cleanPin === 'admin2026' || cleanPin.toLowerCase() === 'subulussalam') {
      setError('');
      setPin('');
      onSuccess();
    } else {
      setError('PIN Panitia tidak sesuai. Silakan hubungi koordinator PPDB.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Akses Khusus Panitia PPDB
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pondok Pesantren & Madrasah Subulussalam
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Masukkan PIN Pengaman Petugas
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                autoFocus
                placeholder="Ketik PIN Keamanan Panitia..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-center tracking-widest font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            {error && (
              <p className="text-[11px] text-rose-600 mt-1.5 font-medium flex items-center justify-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={!pin.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs"
            >
              Buka Meja Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
