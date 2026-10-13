import mongoose, { Schema, Document } from 'mongoose';
import { Pendaftar } from '../../types';

export interface ApplicantDocument extends Omit<Pendaftar, 'id'>, Document {
  id: string; // Ensure id is mapped properly
}

const ApplicantSchema = new Schema<ApplicantDocument>({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  rawMessage: { type: String, required: true },
  namaLengkap: { type: String, required: true },
  tanggalLahir: { type: String, required: true },
  namaWali: { type: String, required: true },
  alamatTinggal: { type: String, required: true },
  asalSekolah: { type: String, required: true },
  noWa: { type: String, required: true },
  normalizedWa: { type: String, required: true },
  nisn: { type: String, required: true },
  pipSebelumnya: { type: String, enum: ['Ya', 'Tidak'], required: true },
  statusPembayaran: { type: String, enum: ['Sudah', 'Belum'], required: true },
  waktuTransfer: { type: String },
  metodeTransfer: { type: String },
  namaPengirimTransfer: { type: String },
  nominalTransfer: { type: String },
  statusVerifikasi: {
    type: String,
    enum: ['TERVERIFIKASI', 'MENUNGGU VERIFIKASI', 'PERLU PERBAIKAN', 'DITOLAK'],
    required: true,
  },
  catatanVerifikasi: { type: [String], default: [] },
  verificationScore: { type: Number, required: true, default: 0 },
  syncedToSheets: { type: Boolean, required: true, default: false },
  sheetsRowIndex: { type: Number },
  notifPendaftaranTerkirim: { type: Boolean, required: true, default: false },
  notifVerifikasiTerkirim: { type: Boolean, required: true, default: false },
  lastNotifSentAt: { type: String },
}, {
  timestamps: true,
});

export const Applicant: mongoose.Model<ApplicantDocument> =
  (mongoose.models.Applicant as mongoose.Model<ApplicantDocument>) ||
  mongoose.model<ApplicantDocument>('Applicant', ApplicantSchema);
