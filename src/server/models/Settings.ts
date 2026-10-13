import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global_settings" },
    academicYearConfig: {
      tahunPelajaran: { type: String, default: "2026/2027" },
      angkatan: { type: String, default: "7" },
      biayaPendaftaran: { type: String, default: "150.000" },
      rekeningPembayaran: { type: String, default: "7702 0102 2580 530 a/n ponpes Subulussalam (Bank BRI)" },
      kontakAdminWa: { type: String, default: "081225865715" },
      kodeTahunId: { type: String, default: "2026" },
      namaSekolah: { type: String, default: "Pondok Pesantren Islam Subulussalam" },
      logoUrl: { type: String, default: "" },
      promoDiskonAktif: { type: Boolean, default: true },
      persenDiskon: { type: Number, default: 50 },
      kuotaPendaftarDiskon: { type: Number, default: 15 },
      pesanIklanPromo: { type: String, default: "PROMO KHUSUS: Potongan Biaya Pendaftaran 50% untuk 15 Pendaftar Pertama!" },
    },
    sheetConfig: {
      spreadsheetId: { type: String, default: "" },
      spreadsheetTitle: { type: String, default: "" },
      spreadsheetUrl: { type: String, default: "" },
      sheetName: { type: String, default: "" },
      autoSync: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const AppSettings: mongoose.Model<any> =
  (mongoose.models.AppSettings as mongoose.Model<any>) ||
  mongoose.model("AppSettings", SettingsSchema);
