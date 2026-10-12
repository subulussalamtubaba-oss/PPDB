import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  School,
  FileCheck,
  MessageSquare,
  Sparkles,
  Phone,
  Printer,
  HeartHandshake,
  ShieldCheck,
  Building2,
  Calendar,
  IdCard,
  MapPin,
  GraduationCap,
  Copy,
  Check,
  Search,
  CreditCard,
  Edit3,
  Clock,
  ArrowRight,
  AlertTriangle,
  Flame,
  Tag,
  Percent,
} from 'lucide-react';
import { Pendaftar, SheetConfig, AcademicYearConfig, DEFAULT_ACADEMIC_YEAR_CONFIG, VerificationStatus } from '../types';
import { generateUniquePpdbId, normalizeWhatsAppNumber } from '../services/whatsappExtractor';
import { runAutomaticVerification } from '../services/verificationEngine';
import {
  buildApplicantNoticeToCommitteeMessage,
  buildRegistrationConfirmationMessage,
} from '../services/whatsappNotification';

interface ChatbotPortalProps {
  onAddApplicant: (applicant: Pendaftar) => void;
  onUpdateApplicant?: (applicant: Pendaftar) => void;
  existingApplicants: Pendaftar[];
  sheetConfig: SheetConfig | null;
  isSheetsConnected: boolean;
  onSwitchToDashboard?: () => void;
  isAdminLoggedIn?: boolean;
  academicYearConfig?: AcademicYearConfig;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  quickReplies?: string[];
  applicantCard?: Pendaftar;
  isSummary?: boolean;
}

interface FormDraft {
  namaLengkap: string;
  tanggalLahir: string;
  namaWali: string;
  alamatTinggal: string;
  asalSekolah: string;
  noWa: string;
  nisn: string;
  pipSebelumnya: 'Ya' | 'Tidak' | '';
  statusPembayaran: 'Sudah' | 'Belum' | '';
  waktuTransfer?: string;
  metodeTransfer?: string;
  namaPengirimTransfer?: string;
  nominalTransfer?: string;
}

const INITIAL_DRAFT: FormDraft = {
  namaLengkap: '',
  tanggalLahir: '',
  namaWali: '',
  alamatTinggal: '',
  asalSekolah: '',
  noWa: '',
  nisn: '',
  pipSebelumnya: '',
  statusPembayaran: '',
  waktuTransfer: '',
  metodeTransfer: '',
  namaPengirimTransfer: '',
  nominalTransfer: '',
};

export const ChatbotPortal: React.FC<ChatbotPortalProps> = ({
  onAddApplicant,
  onUpdateApplicant,
  existingApplicants,
  sheetConfig,
  isSheetsConnected,
  onSwitchToDashboard,
  isAdminLoggedIn = false,
  academicYearConfig,
}) => {
  const cfg = academicYearConfig || DEFAULT_ACADEMIC_YEAR_CONFIG;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [draft, setDraft] = useState<FormDraft>(INITIAL_DRAFT);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [completedApplicant, setCompletedApplicant] = useState<Pendaftar | null>(null);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  // States for verification / repair / payment update flow
  const [activeApplicantToEdit, setActiveApplicantToEdit] = useState<Pendaftar | null>(null);
  const [editFieldTarget, setEditFieldTarget] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState({
    waktuTransfer: '',
    metodeTransfer: '',
    namaPengirimTransfer: '',
    nominalTransfer: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper untuk menghitung biaya normal, diskon, dan kuota pendaftar pertama
  const parseNumericFee = (feeStr: string): number => {
    const clean = feeStr.replace(/\D/g, '');
    return parseInt(clean, 10) || 150000;
  };

  const normalFeeNum = parseNumericFee(cfg.biayaPendaftaran);
  const diskonPersen = cfg.persenDiskon ?? 50;
  const kuotaMaksimal = cfg.kuotaPendaftarDiskon ?? 15;
  const promoAktif = cfg.promoDiskonAktif ?? true;

  // Cek apakah pendaftar baru saat ini masuk dalam kuota promo pendaftar pertama
  const currentApplicantsCount = existingApplicants.length;
  const isEligibleForPromo = promoAktif && currentApplicantsCount < kuotaMaksimal;
  const sisaSlotPromo = Math.max(0, kuotaMaksimal - currentApplicantsCount);

  // Hitung nominal yang dipotong
  const discountedFeeNum = isEligibleForPromo
    ? Math.round(normalFeeNum * (1 - diskonPersen / 100))
    : normalFeeNum;

  const discountedFeeStr = discountedFeeNum.toLocaleString('id-ID');
  const normalFeeStr = normalFeeNum.toLocaleString('id-ID');

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    startConversation();
  }, [
    cfg.tahunPelajaran,
    cfg.angkatan,
    cfg.namaSekolah,
    cfg.biayaPendaftaran,
    cfg.rekeningPembayaran,
    cfg.promoDiskonAktif,
    cfg.persenDiskon,
    cfg.kuotaPendaftarDiskon,
    existingApplicants.length,
  ]);

  const startConversation = () => {
    setDraft(INITIAL_DRAFT);
    setCurrentStep(0);
    setCompletedApplicant(null);
    setActiveApplicantToEdit(null);
    setEditFieldTarget(null);
    setPaymentDraft({
      waktuTransfer: '',
      metodeTransfer: '',
      namaPengirimTransfer: '',
      nominalTransfer: '',
    });
    setIsTyping(true);

    setTimeout(() => {
      let welcomeMsg = `Assalamu’alaikum Warahmatullahi Wabarakatuh. 🌸\n\nSelamat datang di Layanan Penerimaan Santri Baru (PSB) ${cfg.namaSekolah} Tahun Pelajaran ${cfg.tahunPelajaran} (Angkatan ${cfg.angkatan}).\n\nSaya Husein, asisten layanan pendaftaran santri baru Subulussalam.`;

      // Jika promo aktif dan masih dalam kuota, sampaikan pesan iklan promo
      if (isEligibleForPromo) {
        welcomeMsg += `\n\n🔥 *${cfg.pesanIklanPromo || `PROMO SPESIAL: Potongan Biaya Pendaftaran ${diskonPersen}% untuk ${kuotaMaksimal} Pendaftar Pertama!`}*\n` +
          `• Biaya Normal: ~Rp ${normalFeeStr}~\n` +
          `• *Biaya Spesial Promo:* *Rp ${discountedFeeStr}* (Hemat ${diskonPersen}%)\n` +
          `• Sisa Kuota Promo: *${sisaSlotPromo} Santri Lagi* dari total ${kuotaMaksimal} kuota.\n`;
      } else if (promoAktif && currentApplicantsCount >= kuotaMaksimal) {
        welcomeMsg += `\n\n*(Catatan: Kuota promo diskon ${diskonPersen}% untuk ${kuotaMaksimal} pendaftar pertama telah terpenuhi. Biaya pendaftaran berlaku normal: Rp ${normalFeeStr})*`;
      }

      welcomeMsg += `\n\nSaya siap mendampingi Bapak/Ibu wali murid untuk:\n1. Mengisi formulir pendaftaran ananda baru ✍️\n2. Cek status berkas & perbaiki data yang kurang 🔍\n3. Konfirmasi pembayaran biaya pendaftaran 💳\n\nApa yang bisa saya bantu hari ini?`;

      setMessages([
        {
          id: 'msg-cs-init',
          sender: 'bot',
          text: welcomeMsg,
          timestamp: getCurrentTime(),
          quickReplies: [
            isEligibleForPromo
              ? `Daftar Sekarang (Diskon ${diskonPersen}%) ✍️`
              : 'Bismillah, Mulai Pendaftaran Baru ✍️',
            'Cek & Benarkan Berkas (ID Pendaftaran) 🔍',
            'Lihat Info Biaya & Rekening 💳',
          ],
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  const handleQuickReply = (reply: string) => {
    handleUserResponse(reply);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText('');
    handleUserResponse(userText);
  };

  const botReply = (
    text: string,
    delay: number = 650,
    quickReplies?: string[],
    applicantCard?: Pendaftar,
    isSummary?: boolean
  ) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}-${Math.random()}`,
          sender: 'bot',
          text,
          timestamp: getCurrentTime(),
          quickReplies,
          applicantCard,
          isSummary,
        },
      ]);
      setIsTyping(false);
    }, delay);
  };

  // Helper function to check and present applicant details
  const presentApplicantStatus = (app: Pendaftar) => {
    setActiveApplicantToEdit(app);

    // Run verification check
    const check = runAutomaticVerification(
      {
        namaLengkap: app.namaLengkap,
        tanggalLahir: app.tanggalLahir,
        namaWali: app.namaWali,
        alamatTinggal: app.alamatTinggal,
        asalSekolah: app.asalSekolah,
        noWa: app.noWa,
        nisn: app.nisn,
        pipSebelumnya: app.pipSebelumnya,
        statusPembayaran: app.statusPembayaran,
      },
      existingApplicants,
      app.id
    );

    const issues = check.issues;
    const isPaid = app.statusPembayaran === 'Sudah';

    const feeDisplay = app.nominalTransfer || (isEligibleForPromo ? discountedFeeStr : normalFeeStr);

    let noticeText = `Alhamdulillah, data pendaftaran santri ditemukan! 📋\n\n` +
      `🔖 *Nomor ID:* \`${app.id}\`\n` +
      `👤 *Nama Santri:* *${app.namaLengkap}*\n` +
      `🏫 *Asal Sekolah:* ${app.asalSekolah}\n` +
      `🔢 *NISN:* ${app.nisn || 'Belum Ada'}\n` +
      `📱 *No. WhatsApp:* ${app.noWa}\n` +
      `💳 *Status Biaya (Rp ${feeDisplay}):* *${isPaid ? 'SUDAH DIBAYAR ✅' : 'BELUM DIBAYAR ⏳'}*\n`;

    if (isPaid && app.nominalTransfer) {
      noticeText += `   *(Rincian: Rp ${app.nominalTransfer} via ${app.metodeTransfer || '-'} a/n ${app.namaPengirimTransfer || '-'})*\n`;
    }

    noticeText += `📊 *Status Verifikasi:* *${app.statusVerifikasi}* (Skor: ${check.score}/100)\n\n`;

    // Berikan evaluasi kekurangan berkas atau pengingat pembayaran
    if (issues.length > 0) {
      noticeText += `⚠️ *PERHATIAN: ADA KEKURANGAN / CATATAN PADA BERKAS ANANDA:*\n`;
      issues.forEach((iss, idx) => {
        noticeText += `${idx + 1}. ${iss}\n`;
      });
      noticeText += `\n`;
    } else {
      noticeText += `✅ *Alhamdulillah, berkas data pendaftaran ananda sudah lengkap dan valid!*\n\n`;
    }

    if (!isPaid) {
      noticeText += `💡 *PENGINGAT BIAYA PENDAFTARAN:*\n` +
        `Biaya registrasi sebesar *Rp ${feeDisplay}* belum dikonfirmasi lunas.\n` +
        `🏦 *${cfg.rekeningPembayaran}*\n\n` +
        `Jika Bapak/Ibu sudah melakukan transfer, Bapak/Ibu dapat langsung memilih *Konfirmasi Bayar Sekarang* untuk memasukkan rincian bukti transfer.\n`;
    }

    noticeText += `Bapak/Ibu dapat memilih tindakan yang ingin dilakukan di bawah ini:`;

    const replies: string[] = [];
    if (!isPaid) {
      replies.push('Konfirmasi Bayar Sekarang 💳');
    }
    replies.push('Benarkan / Ubah Data Berkas ✏️');
    replies.push('Kirim Bukti ke WA Panitia 💬');
    replies.push('Selesai / Menu Awal 🏠');

    setCurrentStep(101);
    botReply(noticeText, 700, replies, app);
  };

  const handleUserResponse = (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const cleanInput = text.trim();
    const lower = cleanInput.toLowerCase();

    // Check if user directly enters an Applicant ID anywhere (e.g. A-2026-0001 or 2026-0001)
    const matchIdPattern = cleanInput.match(/\b(A-)?(\d{4})-(\d{3,4})\b/i);
    if (matchIdPattern && (currentStep === 0 || currentStep === 100)) {
      const fullId = matchIdPattern[0].toUpperCase().startsWith('A-')
        ? matchIdPattern[0].toUpperCase()
        : `A-${matchIdPattern[0].toUpperCase()}`;
      
      const found = existingApplicants.find(
        (a) => a.id.toUpperCase() === fullId || a.id.toUpperCase().includes(matchIdPattern[0].toUpperCase())
      );

      if (found) {
        presentApplicantStatus(found);
        return;
      } else {
        botReply(
          `Mohon maaf, nomor ID pendaftaran *${fullId}* belum ditemukan di pangkalan data kami. 🔍\n\nPastikan nomor ID sesuai dengan yang tertera pada bukti pendaftaran (contoh: *A-2026-0001*). Boleh diketikkan kembali atau pilih pendaftaran baru?`,
          600,
          ['Coba Ketik ID Lagi 🔍', 'Bismillah, Mulai Pendaftaran Baru ✍️']
        );
        setCurrentStep(100);
        return;
      }
    }

    // Step 0: Welcome Menu Handling
    if (currentStep === 0) {
      if (lower.includes('cek') || lower.includes('benarkan') || lower.includes('id') || lower.includes('perbaiki')) {
        setCurrentStep(100);
        botReply(
          `Baik Bapak/Ibu. Silakan **ketikkan Nomor ID Pendaftaran resmi ananda** (Contoh: *A-2026-0001*).\n\nSistem kami akan langsung memeriksa berkas ananda, mengecek apakah ada yang kurang, dan memeriksa status pembayaran registrasi.`,
          650
        );
        return;
      }

      if (
        lower.includes('informasi') ||
        lower.includes('biaya') ||
        lower.includes('rekening')
      ) {
        let infoBiayaText = `• *Biaya Normal:* Rp ${normalFeeStr}\n`;
        if (isEligibleForPromo) {
          infoBiayaText = `• *Biaya Normal:* ~Rp ${normalFeeStr}~\n` +
            `• 🔥 *Biaya Spesial Promo (${diskonPersen}%):* *Rp ${discountedFeeStr}*\n` +
            `   *(Khusus ${kuotaMaksimal} pendaftar pertama - Sisa ${sisaSlotPromo} kuota lagi!)*\n`;
        } else if (promoAktif) {
          infoBiayaText += `• *(Info: Kuota promo diskon ${diskonPersen}% untuk ${kuotaMaksimal} pendaftar pertama telah terpenuhi)*\n`;
        }

        botReply(
          `📋 *Informasi Pendaftaran PSB ${cfg.tahunPelajaran} (Angkatan ${cfg.angkatan}):*\n\n` +
          infoBiayaText +
          `• *Rekening Resmi Pembayaran:*\n` +
          `   ${cfg.rekeningPembayaran}\n\n` +
          `• *Nomor Kontak Panitia PSB:*\n` +
          `   ${cfg.kontakAdminWa}\n\n` +
          `• *Kelengkapan yang Perlu Disiapkan:*\n` +
          `   1. Nama lengkap & data kelahiran ananda\n` +
          `   2. Nama orang tua/wali & alamat domisili\n` +
          `   3. Asal sekolah & nomor WhatsApp aktif\n` +
          `   4. Nomor NISN (10 digit, jika ada)\n\n` +
          `Apakah Bapak/Ibu siap untuk kita mulai pengisian formulirnya?`,
          700,
          [
            isEligibleForPromo
              ? `Bismillah, Daftar Sekarang (Diskon ${diskonPersen}%) ✍️`
              : 'Bismillah, Mulai Pendaftaran Baru ✍️',
            'Cek Berkas / ID Pendaftaran 🔍',
          ]
        );
        return;
      }

      // Default: Start Registration (Step 1)
      setCurrentStep(1);
      botReply(
        `Alhamdulillah, bismillah kita mulai ya Bapak/Ibu. 😊\n\nBoleh kami tahu siapa **nama lengkap ananda calon santri** (sesuai yang tertera pada ijazah SD/MI atau akta kelahiran)?`,
        650
      );
      return;
    }

    // -------------------------------------------------------------
    // FLOW: CEK ID & PERBAIKAN BERKAS / KONFIRMASI PEMBAYARAN
    // -------------------------------------------------------------
    if (currentStep === 100) {
      // Searching for applicant by ID or Nama
      let targetId = cleanInput.toUpperCase();
      if (!targetId.startsWith('A-') && /^\d{4}-\d{3,4}$/.test(targetId)) {
        targetId = `A-${targetId}`;
      }

      const found = existingApplicants.find(
        (a) =>
          a.id.toUpperCase() === targetId ||
          a.id.toUpperCase().includes(targetId) ||
          a.namaLengkap.toLowerCase().includes(lower)
      );

      if (found) {
        presentApplicantStatus(found);
      } else {
        botReply(
          `Data dengan ID atau kata kunci *"${cleanInput}"* tidak ditemukan di sistem. 🔍\n\nPastikan format ID benar (contoh: *A-2026-0001*), atau Bapak/Ibu juga bisa mengetikkan nama lengkap calon santri.`,
          600,
          ['Coba Ketik ID Lagi 🔍', 'Kembali ke Menu Awal 🏠']
        );
      }
      return;
    }

    if (currentStep === 101) {
      // Sub-menu when applicant data is shown
      if (lower.includes('bayar') || lower.includes('transfer') || lower.includes('konfirmasi bayar')) {
        // Start payment confirmation flow
        setCurrentStep(120);
        botReply(
          `Alhamdulillah. Mari kita catat rincian bukti transfer Bapak/Ibu untuk ananda *${activeApplicantToEdit?.namaLengkap}*.\n\n` +
          `1️⃣ **Kapan waktu/tanggal transfer dilakukan?**\n*(Contoh: Hari ini jam 10:15 WIB, atau 01-10-2026)*`,
          600,
          ['Hari ini baru saja', 'Kemarin sore']
        );
        return;
      }

      if (lower.includes('ubah') || lower.includes('benarkan') || lower.includes('perbaiki')) {
        setCurrentStep(110);
        botReply(
          `Bagian data mana dari ananda *${activeApplicantToEdit?.namaLengkap}* yang ingin dibenarkan/diperbarui?`,
          550,
          [
            'Nama Lengkap 👤',
            'Nomor NISN 🔢',
            'Tanggal Lahir 📅',
            'Nama Wali 👨‍👩‍👧',
            'Asal Sekolah 🏫',
            'Alamat Tinggal 🏠',
            'Nomor WhatsApp 📱',
            'Bantuan PIP SD 🎁',
            'Batal / Kembali ↩️',
          ]
        );
        return;
      }

      if (lower.includes('wa') || lower.includes('panitia') || lower.includes('bukti')) {
        if (activeApplicantToEdit) {
          const shareUrl = getWhatsAppShareUrl(activeApplicantToEdit);
          botReply(
            `Silakan klik tombol di bawah ini untuk mengirimkan surat pemberitahuan & konfirmasi resmi ke WhatsApp Panitia PPDB:`,
            500,
            ['Menu Awal 🏠']
          );
          window.open(shareUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      // Back to home
      startConversation();
      return;
    }

    // --- SUB-FLOW: Membenarkan Bagian Data Tertentu (Step 110 & 111) ---
    if (currentStep === 110) {
      if (lower.includes('batal') || lower.includes('kembali')) {
        if (activeApplicantToEdit) presentApplicantStatus(activeApplicantToEdit);
        return;
      }

      let fieldName = '';
      let promptText = '';

      if (lower.includes('nama lengkap') || lower.includes('nama')) {
        fieldName = 'namaLengkap';
        promptText = 'Silakan ketikkan **Nama Lengkap** ananda yang benar:';
      } else if (lower.includes('nisn')) {
        fieldName = 'nisn';
        promptText = 'Silakan ketikkan **Nomor NISN (10 Digit Angka)** yang benar:\n*(Contoh: 0123456789 atau ketik "Belum Ada" jika belum ada)*';
      } else if (lower.includes('lahir') || lower.includes('tanggal')) {
        fieldName = 'tanggalLahir';
        promptText = 'Silakan ketikkan **Tempat & Tanggal Lahir** yang benar:\n*(Contoh: GN Sugih, 14 Mei 2013)*';
      } else if (lower.includes('wali') || lower.includes('orang tua')) {
        fieldName = 'namaWali';
        promptText = 'Silakan ketikkan **Nama Lengkap Orang Tua / Wali** yang benar:';
      } else if (lower.includes('sekolah') || lower.includes('asal')) {
        fieldName = 'asalSekolah';
        promptText = 'Silakan ketikkan **Asal Sekolah (SD/MI)** yang benar:';
      } else if (lower.includes('alamat') || lower.includes('tinggal') || lower.includes('domisili')) {
        fieldName = 'alamatTinggal';
        promptText = 'Silakan ketikkan **Alamat Domisili Tinggal** yang lengkap (tiyuh, RT/RW, kec, kab):';
      } else if (lower.includes('wa') || lower.includes('whatsapp') || lower.includes('telepon')) {
        fieldName = 'noWa';
        promptText = 'Silakan ketikkan **Nomor WhatsApp Aktif** yang benar (Contoh: 085832297239):';
      } else if (lower.includes('pip')) {
        fieldName = 'pipSebelumnya';
        promptText = 'Apakah ananda pernah menerima bantuan PIP saat di SD? (Pilih salah satu di bawah)';
      } else {
        botReply('Pilihan tidak dikenali. Silakan pilih bagian data yang ingin diubah:', 500, [
          'Nama Lengkap 👤',
          'Nomor NISN 🔢',
          'Tanggal Lahir 📅',
          'Nomor WhatsApp 📱',
          'Batal ↩️',
        ]);
        return;
      }

      setEditFieldTarget(fieldName);
      setCurrentStep(111);
      botReply(
        promptText,
        500,
        fieldName === 'pipSebelumnya' ? ['Ya, Pernah Terima PIP', 'Tidak Pernah'] : undefined
      );
      return;
    }

    if (currentStep === 111) {
      if (!activeApplicantToEdit || !editFieldTarget) {
        startConversation();
        return;
      }

      let updatedVal: any = cleanInput;
      if (editFieldTarget === 'pipSebelumnya') {
        updatedVal = lower.includes('ya') ? 'Ya' : 'Tidak';
      } else if (editFieldTarget === 'nisn') {
        const match = cleanInput.match(/\b\d{10}\b/);
        if (match) {
          updatedVal = match[0];
        } else if (lower.includes('belum') || lower.includes('tidak')) {
          updatedVal = 'Belum Ada';
        }
      }

      const updatedApplicant: Pendaftar = {
        ...activeApplicantToEdit,
        [editFieldTarget]: updatedVal,
      };

      if (editFieldTarget === 'noWa') {
        updatedApplicant.normalizedWa = normalizeWhatsAppNumber(cleanInput);
      }

      // Re-run verification
      const check = runAutomaticVerification(
        {
          namaLengkap: updatedApplicant.namaLengkap,
          tanggalLahir: updatedApplicant.tanggalLahir,
          namaWali: updatedApplicant.namaWali,
          alamatTinggal: updatedApplicant.alamatTinggal,
          asalSekolah: updatedApplicant.asalSekolah,
          noWa: updatedApplicant.noWa,
          nisn: updatedApplicant.nisn,
          pipSebelumnya: updatedApplicant.pipSebelumnya,
          statusPembayaran: updatedApplicant.statusPembayaran,
        },
        existingApplicants,
        updatedApplicant.id
      );

      updatedApplicant.statusVerifikasi = check.recommendedStatus;
      updatedApplicant.catatanVerifikasi = check.issues;
      updatedApplicant.verificationScore = check.score;

      // Persist to server / app
      if (onUpdateApplicant) {
        onUpdateApplicant(updatedApplicant);
      } else {
        onAddApplicant(updatedApplicant);
      }

      botReply(
        `✅ Alhamdulillah, data *${editFieldTarget}* berhasil diperbarui menjadi:\n*"${updatedVal}"*.\n\nSistem kami telah melakukan verifikasi ulang berkas ananda.`,
        600
      );

      setTimeout(() => {
        presentApplicantStatus(updatedApplicant);
      }, 700);
      return;
    }

    // --- SUB-FLOW: Konfirmasi Rincian Transfer Pembayaran (Step 120 -> 121 -> 122 -> 123) ---
    if (currentStep === 120) {
      // Step 120: Waktu Transfer
      const waktu = cleanInput;
      setPaymentDraft((prev) => ({ ...prev, waktuTransfer: waktu }));
      setCurrentStep(121);
      botReply(
        `Waktu transfer tercatat: *${waktu}*.\n\n2️⃣ **Transfer melalui saluran apa?**\n*(Contoh: Bank BRI, BCA, Mandiri, BSI, DANA, ShopeePay, atau Tunai ke Panitia)*`,
        550,
        ['Bank BRI 🏦', 'Bank BCA 🏦', 'DANA / E-Wallet 📱', 'Tunai di Kantor Panitia 💵']
      );
      return;
    }

    if (currentStep === 121) {
      // Step 121: Saluran / Metode Transfer
      let saluran = cleanInput.replace(/[🏦📱💵]/g, '').trim();
      setPaymentDraft((prev) => ({ ...prev, metodeTransfer: saluran }));
      setCurrentStep(122);
      botReply(
        `Saluran transfer: *${saluran}*.\n\n3️⃣ Siapa **nama pengirim pada rekening / akun e-wallet** yang digunakan?\n*(Contoh: Ahmad Subagyo)*`,
        550
      );
      return;
    }

    if (currentStep === 122) {
      // Step 122: Nama Pengirim
      const pengirim = cleanInput;
      setPaymentDraft((prev) => ({ ...prev, namaPengirimTransfer: pengirim }));
      setCurrentStep(123);
      const suggestedNominal = activeApplicantToEdit?.nominalTransfer || (isEligibleForPromo ? discountedFeeStr : normalFeeStr);
      botReply(
        `Nama pengirim: *${pengirim}*.\n\n4️⃣ Terakhir, berapa **nominal dana yang ditransfer**?\n*(Contoh: ${suggestedNominal})*`,
        550,
        [suggestedNominal, normalFeeStr]
      );
      return;
    }

    if (currentStep === 123) {
      // Step 123: Nominal Transfer & Finalize Payment Update
      const defaultNominal = activeApplicantToEdit?.nominalTransfer || (isEligibleForPromo ? discountedFeeStr : normalFeeStr);
      const nominal = cleanInput.replace(/[^\d.,]/g, '').trim() || defaultNominal;
      const finalPayment = {
        ...paymentDraft,
        nominalTransfer: nominal,
      };

      if (!activeApplicantToEdit) {
        startConversation();
        return;
      }

      const updatedApplicant: Pendaftar = {
        ...activeApplicantToEdit,
        statusPembayaran: 'Sudah',
        waktuTransfer: finalPayment.waktuTransfer,
        metodeTransfer: finalPayment.metodeTransfer,
        namaPengirimTransfer: finalPayment.namaPengirimTransfer,
        nominalTransfer: finalPayment.nominalTransfer,
      };

      // Re-verify with updated payment status
      const check = runAutomaticVerification(
        {
          namaLengkap: updatedApplicant.namaLengkap,
          tanggalLahir: updatedApplicant.tanggalLahir,
          namaWali: updatedApplicant.namaWali,
          alamatTinggal: updatedApplicant.alamatTinggal,
          asalSekolah: updatedApplicant.asalSekolah,
          noWa: updatedApplicant.noWa,
          nisn: updatedApplicant.nisn,
          pipSebelumnya: updatedApplicant.pipSebelumnya,
          statusPembayaran: 'Sudah',
        },
        existingApplicants,
        updatedApplicant.id
      );

      updatedApplicant.statusVerifikasi = check.recommendedStatus;
      updatedApplicant.catatanVerifikasi = check.issues;
      updatedApplicant.verificationScore = check.score;

      // Persist to server / app
      if (onUpdateApplicant) {
        onUpdateApplicant(updatedApplicant);
      } else {
        onAddApplicant(updatedApplicant);
      }

      setActiveApplicantToEdit(updatedApplicant);

      botReply(
        `🎉 *Alhamdulillah wa syukurillah!*\n\n` +
        `Konfirmasi pembayaran registrasi ananda *${updatedApplicant.namaLengkap}* berhasil disimpan:\n` +
        `• *Nominal:* Rp ${finalPayment.nominalTransfer}\n` +
        `• *Saluran:* ${finalPayment.metodeTransfer}\n` +
        `• *Nama Rekening Pengirim:* ${finalPayment.namaPengirimTransfer}\n` +
        `• *Waktu:* ${finalPayment.waktuTransfer}\n\n` +
        `Status pendaftaran telah resmi diperbarui menjadi: **SUDAH DIBAYAR ✅**\n\n` +
        `Bapak/Ibu dapat mengirimkan pesan bukti konfirmasi ini ke WhatsApp Panitia PPDB sekarang.`,
        850,
        ['Kirim Konfirmasi ke WA Panitia 💬', 'Lihat Rincian Status Berkas 📋', 'Menu Awal 🏠'],
        updatedApplicant
      );
      setCurrentStep(101);
      return;
    }

    // -------------------------------------------------------------
    // FLOW: PENDAFTARAN SANTRI BARU STEP-BY-STEP (Step 1 -> 11)
    // -------------------------------------------------------------
    if (currentStep === 1) {
      const nama = cleanInput;
      if (nama.length < 3) {
        botReply(
          `Mohon maaf Bapak/Ibu, namanya tampak terlalu singkat. Boleh diketikkan kembali nama lengkap ananda secara jelas?`,
          500
        );
        return;
      }
      setDraft((prev) => ({ ...prev, namaLengkap: nama }));
      setCurrentStep(2);
      botReply(
        `Maa syaa Allah, ananda *${nama.toUpperCase()}*. Semoga ananda menjadi santri yang sholeh/sholehah. 🤲\n\nSelanjutnya, di mana **tempat kelahiran dan tanggal berapa ananda lahir**?\n*(Contoh: GN Sugih, 21 Januari 2014 atau 12-05-2013)*`,
        650
      );
      return;
    }

    if (currentStep === 2) {
      const ttl = cleanInput;
      setDraft((prev) => ({ ...prev, tanggalLahir: ttl }));
      setCurrentStep(3);
      botReply(
        `Baik, data kelahiran ananda tercatat: *${ttl}*.\n\nKemudian, boleh kami tahu siapa **nama lengkap orang tua atau wali** yang bertanggung jawab atas ananda?`,
        650
      );
      return;
    }

    if (currentStep === 3) {
      const wali = cleanInput;
      setDraft((prev) => ({ ...prev, namaWali: wali }));
      setCurrentStep(4);
      botReply(
        `Salam hormat kami untuk Bapak/Ibu *${wali}*.\n\nDi mana **alamat domisili tempat tinggal** ananda dan keluarga saat ini?\n*(mohon tuliskan nama tiyuh/desa, RT/RW, kecamatan, kabupaten dan provinsi ya)*`,
        650
      );
      return;
    }

    if (currentStep === 4) {
      const alamat = cleanInput;
      setDraft((prev) => ({ ...prev, alamatTinggal: alamat }));
      setCurrentStep(5);
      botReply(
        `Alamat tercatat dengan baik: *${alamat}*.\n\nAlhamdulillah. Selanjutnya, apa **nama sekolah atau madrasah asal (SD/MI)** ananda sebelumnya?\n*(Contoh: SDN 26 TBT atau MIS Subulussalam)*`,
        650
      );
      return;
    }

    if (currentStep === 5) {
      const sekolah = cleanInput;
      setDraft((prev) => ({ ...prev, asalSekolah: sekolah }));
      setCurrentStep(6);
      botReply(
        `Asal sekolah ananda dari *${sekolah}* telah kami simpan.\n\nUntuk kemudahan penyampaian informasi seleksi, jadwal tes, dan pengumuman resmi, boleh kami minta **nomor WhatsApp aktif** Bapak/Ibu yang dapat dihubungi panitia?\n*(Contoh: 085832297239)*`,
        650
      );
      return;
    }

    if (currentStep === 6) {
      const waRaw = cleanInput;
      const normalized = normalizeWhatsAppNumber(waRaw);
      if (!normalized || normalized.length < 10) {
        botReply(
          `Mohon maaf Bapak/Ibu, nomor WhatsApp tampaknya belum sesuai format atau terlalu pendek. Boleh diketikkan nomor ponsel yang aktif (contoh: 081234567890)?`,
          550
        );
        return;
      }
      setDraft((prev) => ({ ...prev, noWa: waRaw }));
      setCurrentStep(7);
      botReply(
        `Nomor WhatsApp aktif Bapak/Ibu telah kami catat: *${waRaw}*.\n\nApakah Bapak/Ibu mengetahui **nomor NISN (10 digit)** ananda dari SD/MI asal?\n*(Jika belum hafal atau belum memiliki NISN, Bapak/Ibu dapat memilih tombol lewati di bawah ya)*`,
        650,
        ['Belum hafal / Lewati sementara']
      );
      return;
    }

    if (currentStep === 7) {
      let nisnVal = cleanInput;
      if (nisnVal.toLowerCase().includes('belum') || nisnVal.toLowerCase().includes('lewati')) {
        nisnVal = 'Belum Ada';
      } else {
        const match = nisnVal.match(/\b\d{10}\b/);
        if (match) {
          nisnVal = match[0];
        }
      }

      setDraft((prev) => ({ ...prev, nisn: nisnVal }));
      setCurrentStep(8);
      botReply(
        `Nomor NISN: *${nisnVal}* telah kami catat.\n\nKemudian, apakah ketika di jenjang SD/MI ananda pernah mendapatkan **bantuan Program Indonesia Pintar (PIP)**?`,
        650,
        ['Ya, Pernah Terima PIP', 'Tidak Pernah']
      );
      return;
    }

    if (currentStep === 8) {
      const isPip = lower.includes('ya') || lower.includes('pernah') ? 'Ya' : 'Tidak';
      setDraft((prev) => ({ ...prev, pipSebelumnya: isPip }));
      setCurrentStep(9);

      let biayaMsg = `Status bantuan PIP: *${isPip === 'Ya' ? 'Penerima PIP' : 'Bukan Penerima PIP'}*.\n\n`;

      if (isEligibleForPromo) {
        biayaMsg += `🎉 *SELAMAT! Ananda masuk dalam ${kuotaMaksimal} pendaftar pertama (Pendaftar ke-${currentApplicantsCount + 1})!*\n` +
          `Ananda berhak mendapatkan **Potongan Biaya Pendaftaran ${diskonPersen}%**:\n` +
          `• Biaya Asli: ~Rp ${normalFeeStr}~\n` +
          `• **Biaya yang Perlu Dibayar: Rp ${discountedFeeStr}**\n\n` +
          `Apakah Bapak/Ibu sudah melakukan transfer pembayaran sebesar *Rp ${discountedFeeStr}* ke rekening resmi pondok pesantren?\n\n` +
          `🏦 *${cfg.rekeningPembayaran}*\n\n` +
          `*(Catatan: Jika belum transfer saat ini, pendaftaran tetap bisa diproses dan bukti transfer dapat disusulkan kemudian)*`;
      } else {
        biayaMsg += `Terakhir untuk administrasi registrasi formulir sebesar **Rp ${normalFeeStr}**, apakah Bapak/Ibu sudah melakukan pembayaran/transfer ke rekening resmi pondok pesantren?\n\n` +
          (promoAktif && currentApplicantsCount >= kuotaMaksimal ? `*(Catatan: Kuota promo ${kuotaMaksimal} pendaftar pertama sudah penuh, berlaku biaya normal)*\n\n` : '') +
          `🏦 *${cfg.rekeningPembayaran}*\n\n` +
          `*(Catatan: Jika belum transfer saat ini, pendaftaran tetap bisa diproses dan bukti transfer dapat disusulkan kemudian)*`;
      }

      botReply(
        biayaMsg,
        650,
        ['Sudah Transfer / Bayar ✅', 'Belum Bayar (Akan Segera Transfer) ⏳']
      );
      return;
    }

    if (currentStep === 9) {
      const isPaid = lower.includes('sudah') || lower.includes('lunas') || lower.includes('bayar') ? 'Sudah' : 'Belum';
      const nominalSeharusnya = isEligibleForPromo ? discountedFeeStr : normalFeeStr;
      
      // Jika user memilih sudah bayar pada pendaftaran baru, kita tanyakan rincian transfernya
      if (isPaid === 'Sudah') {
        setDraft((prev) => ({ ...prev, statusPembayaran: 'Sudah', nominalTransfer: nominalSeharusnya }));
        setCurrentStep(91); // Step 91: Tanya rincian transfer pendaftaran baru
        botReply(
          `Alhamdulillah sudah transfer. Agar panitia dapat memverifikasi lebih cepat, boleh kami tahu:\n\n1️⃣ **Kapan waktu transfer dilakukan?**\n*(Contoh: Hari ini jam 10:15 WIB, atau 01-10-2026)*`,
          600,
          ['Hari ini baru saja', 'Kemarin sore', 'Lewati rincian transfer']
        );
        return;
      }

      // Jika belum bayar, lanjut langsung ke review
      const updatedDraft: FormDraft = { ...draft, statusPembayaran: 'Belum', nominalTransfer: nominalSeharusnya };
      setDraft(updatedDraft);
      setCurrentStep(10);

      botReply(
        `Alhamdulillah, seluruh data ananda telah kami kumpulkan dengan lengkap. 😊\n\nMohon perkenan Bapak/Ibu untuk memeriksa kembali ringkasan biodata calon santri berikut:\n\n` +
        `📝 *BIODATA CALON SANTRI BARU SUBULUSSALAM*\n` +
        `• *Nama Lengkap:* ${updatedDraft.namaLengkap.toUpperCase()}\n` +
        `• *Tempat, Tanggal Lahir:* ${updatedDraft.tanggalLahir}\n` +
        `• *Orang Tua / Wali:* ${updatedDraft.namaWali}\n` +
        `• *Domisili Tinggal:* ${updatedDraft.alamatTinggal}\n` +
        `• *Sekolah Asal:* ${updatedDraft.asalSekolah}\n` +
        `• *Nomor WhatsApp:* ${updatedDraft.noWa}\n` +
        `• *Nomor NISN:* ${updatedDraft.nisn}\n` +
        `• *Bantuan PIP SD:* ${updatedDraft.pipSebelumnya === 'Ya' ? 'Penerima PIP' : 'Bukan'}\n` +
        `• *Biaya Registrasi:* Rp ${nominalSeharusnya} ${isEligibleForPromo ? `(Diskon ${diskonPersen}%)` : ''} - Belum (Menyusul)\n\n` +
        `Apakah data di atas sudah sesuai dan siap kami teruskan ke panitia penerimaan santri baru?`,
        850,
        ['Sudah Sesuai, Kirim Pendaftaran 🚀', 'Ada yang Perlu Diperbaiki ✏️'],
        undefined,
        true
      );
      return;
    }

    // Step 91, 92, 93: Input rincian transfer pada alur pendaftaran baru
    if (currentStep === 91) {
      if (lower.includes('lewati')) {
        setCurrentStep(10);
        botReplyReviewSummary({ ...draft, statusPembayaran: 'Sudah' });
        return;
      }
      setDraft((prev) => ({ ...prev, waktuTransfer: cleanInput }));
      setCurrentStep(92);
      botReply(
        `Waktu transfer: *${cleanInput}*.\n\n2️⃣ **Transfer melalui saluran apa?**\n*(Contoh: Bank BRI, Bank BCA, DANA, atau Tunai)*`,
        550,
        ['Bank BRI 🏦', 'Bank BCA 🏦', 'DANA / E-Wallet 📱', 'Tunai ke Panitia 💵']
      );
      return;
    }

    if (currentStep === 92) {
      const saluran = cleanInput.replace(/[🏦📱💵]/g, '').trim();
      const defaultNominal = isEligibleForPromo ? discountedFeeStr : normalFeeStr;
      setDraft((prev) => ({ ...prev, metodeTransfer: saluran }));
      setCurrentStep(93);
      botReply(
        `Saluran transfer: *${saluran}*.\n\n3️⃣ Siapa **nama pengirim pada rekening/e-wallet** dan berapa **nominal transfer**?\n*(Contoh: Ahmad Subagyo, Rp ${defaultNominal})*`,
        550,
        [`Atas nama ${draft.namaWali || 'Wali'}, Rp ${defaultNominal}`]
      );
      return;
    }

    if (currentStep === 93) {
      const parts = cleanInput.split(/[,;-]/);
      const pengirim = parts[0]?.trim() || cleanInput;
      const nominalMatch = cleanInput.match(/\d[\d.,]*/);
      const defaultNominal = isEligibleForPromo ? discountedFeeStr : normalFeeStr;
      const nominal = nominalMatch ? nominalMatch[0] : defaultNominal;

      const finalDraft: FormDraft = {
        ...draft,
        namaPengirimTransfer: pengirim,
        nominalTransfer: nominal,
      };
      setDraft(finalDraft);
      setCurrentStep(10);
      botReplyReviewSummary(finalDraft);
      return;
    }

    if (currentStep === 10) {
      if (lower.includes('ulang') || lower.includes('perbaiki') || lower.includes('ubah')) {
        startConversation();
        return;
      }

      // Generate official ID A-YYYY-XXXX
      const yearCode = cfg.kodeTahunId || cfg.tahunPelajaran.split('/')[0] || '2026';
      const newId = generateUniquePpdbId(existingApplicants.length, yearCode);
      const normalizedWa = normalizeWhatsAppNumber(draft.noWa);

      const effectiveFee = draft.nominalTransfer || (isEligibleForPromo ? discountedFeeStr : normalFeeStr);
      const rawMessage = `Formulir pendaftaran PSB angkatan ${cfg.angkatan} tapel. ${cfg.tahunPelajaran.replace('/', '-')}

1. Nama lengkap:${draft.namaLengkap}
2. Tanggal lahir:${draft.tanggalLahir}
3. Nama wali :${draft.namaWali}
4. Tempat Tinggal:${draft.alamatTinggal}
5. Asal sekolah:${draft.asalSekolah}
6. No. WhatsApp:${draft.noWa}
7. No. NISN :${draft.nisn}
8. Apakah calon santri mendapatkan bantuan PIP ketika dijenjang SD? (YA/TIDAK):${draft.pipSebelumnya.toUpperCase()}
9. Apakah calon santri sudah membayar biaya pendaftaran sebesar Rp ${effectiveFee}${isEligibleForPromo ? ` (Promo Diskon ${diskonPersen}%)` : ''}? (Sudah/belum):${draft.statusPembayaran === 'Sudah' ? 'Sudah transfer' : 'belum bayar'}
${cfg.rekeningPembayaran}`;

      const verification = runAutomaticVerification(
        {
          namaLengkap: draft.namaLengkap,
          tanggalLahir: draft.tanggalLahir,
          namaWali: draft.namaWali,
          alamatTinggal: draft.alamatTinggal,
          asalSekolah: draft.asalSekolah,
          noWa: draft.noWa,
          nisn: draft.nisn,
          pipSebelumnya: draft.pipSebelumnya as 'Ya' | 'Tidak',
          statusPembayaran: draft.statusPembayaran as 'Sudah' | 'Belum',
        },
        existingApplicants
      );

      const newApplicant: Pendaftar = {
        id: newId,
        timestamp: new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        rawMessage,
        namaLengkap: draft.namaLengkap,
        tanggalLahir: draft.tanggalLahir,
        namaWali: draft.namaWali,
        alamatTinggal: draft.alamatTinggal,
        asalSekolah: draft.asalSekolah,
        noWa: draft.noWa,
        normalizedWa,
        nisn: draft.nisn,
        pipSebelumnya: (draft.pipSebelumnya as 'Ya' | 'Tidak') || 'Tidak',
        statusPembayaran: (draft.statusPembayaran as 'Sudah' | 'Belum') || 'Belum',
        waktuTransfer: draft.waktuTransfer,
        metodeTransfer: draft.metodeTransfer,
        namaPengirimTransfer: draft.namaPengirimTransfer,
        nominalTransfer: draft.nominalTransfer,
        statusVerifikasi: verification.recommendedStatus,
        catatanVerifikasi: verification.issues,
        verificationScore: verification.score,
        syncedToSheets: false,
        notifPendaftaranTerkirim: true,
        notifVerifikasiTerkirim: false,
        lastNotifSentAt: new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      // Save directly into app state
      onAddApplicant(newApplicant);
      setCompletedApplicant(newApplicant);
      setActiveApplicantToEdit(newApplicant);
      setCurrentStep(11);

      botReply(
        `Alhamdulillah wa syukurillah! 🌸\n\nPendaftaran ananda *${draft.namaLengkap.toUpperCase()}* telah resmi kami terima dan tersimpan di buku pendaftaran PSB Ponpes Subulussalam.\n\n` +
        `🔖 *Nomor Registrasi Resmi: ${newId}*\n\n` +
        `Bapak/Ibu dapat menyimpan bukti pendaftaran di bawah ini atau langsung mengirimkan konfirmasi ke WhatsApp panitia untuk penjadwalan observasi/wawancara.`,
        900,
        ['Daftarkan Santri Baru Lainnya ➕', 'Cek / Perbaiki Berkas Nanti 🔍'],
        newApplicant
      );
      return;
    }

    if (currentStep === 11) {
      if (lower.includes('santri') || lower.includes('daftar') || lower.includes('baru')) {
        startConversation();
      } else if (lower.includes('cek') || lower.includes('perbaiki')) {
        setCurrentStep(100);
        botReply('Silakan ketikkan Nomor ID Pendaftaran yang ingin diperiksa (contoh: A-2026-0001):', 500);
      } else {
        botReply(
          `Terima kasih Bapak/Ibu. Ada hal lain seputar pendaftaran santri baru yang dapat kami bantu?`,
          600,
          ['Daftarkan Santri Baru Lainnya ➕', 'Cek Berkas / ID Pendaftaran 🔍']
        );
      }
    }
  };

  const botReplyReviewSummary = (summaryDraft: FormDraft) => {
    let paymentText = summaryDraft.statusPembayaran === 'Sudah'
      ? `Sudah Ditransfer (Rp ${summaryDraft.nominalTransfer || cfg.biayaPendaftaran})`
      : 'Belum (Menyusul)';
    
    if (summaryDraft.statusPembayaran === 'Sudah' && summaryDraft.metodeTransfer) {
      paymentText += ` via ${summaryDraft.metodeTransfer} a/n ${summaryDraft.namaPengirimTransfer || '-'}`;
    }

    botReply(
      `Alhamdulillah, seluruh data ananda telah kami kumpulkan dengan lengkap. 😊\n\nMohon perkenan Bapak/Ibu untuk memeriksa kembali ringkasan biodata calon santri berikut:\n\n` +
      `📝 *BIODATA CALON SANTRI BARU SUBULUSSALAM*\n` +
      `• *Nama Lengkap:* ${summaryDraft.namaLengkap.toUpperCase()}\n` +
      `• *Tempat, Tanggal Lahir:* ${summaryDraft.tanggalLahir}\n` +
      `• *Orang Tua / Wali:* ${summaryDraft.namaWali}\n` +
      `• *Domisili Tinggal:* ${summaryDraft.alamatTinggal}\n` +
      `• *Sekolah Asal:* ${summaryDraft.asalSekolah}\n` +
      `• *Nomor WhatsApp:* ${summaryDraft.noWa}\n` +
      `• *Nomor NISN:* ${summaryDraft.nisn}\n` +
      `• *Bantuan PIP SD:* ${summaryDraft.pipSebelumnya === 'Ya' ? 'Penerima PIP' : 'Bukan'}\n` +
      `• *Biaya Registrasi:* ${paymentText}\n\n` +
      `Apakah data di atas sudah sesuai dan siap kami teruskan ke panitia penerimaan santri baru?`,
      850,
      ['Sudah Sesuai, Kirim Pendaftaran 🚀', 'Ada yang Perlu Diperbaiki ✏️'],
      undefined,
      true
    );
  };

  const getWhatsAppShareUrl = (applicant: Pendaftar) => {
    const text = buildApplicantNoticeToCommitteeMessage(applicant, cfg.namaSekolah, cfg.tahunPelajaran);
    const panitiaWa = cfg.kontakAdminWa.replace(/\D/g, '');
    const cleanPanitiaWa = panitiaWa.startsWith('0') ? '62' + panitiaWa.substring(1) : panitiaWa;
    return `https://wa.me/${cleanPanitiaWa || '6281225865715'}?text=${encodeURIComponent(text)}`;
  };

  const handleCopyNotice = (applicant: Pendaftar) => {
    const text = buildApplicantNoticeToCommitteeMessage(applicant, cfg.namaSekolah, cfg.tahunPelajaran);
    navigator.clipboard.writeText(text);
    setCopiedCardId(applicant.id);
    setTimeout(() => {
      setCopiedCardId(null);
    }, 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100/70 sm:bg-slate-100/50">
      {/* Central chat column */}
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col min-h-0 overflow-hidden bg-white sm:border-x sm:border-slate-200/80 shadow-xs relative">
        {/* Sticky Customer Service Header */}
        <header className="sticky top-0 z-20 bg-emerald-800 text-white px-3.5 sm:px-5 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-700 border-2 border-emerald-400/70 flex items-center justify-center text-white shadow-xs overflow-hidden">
                {cfg.logoUrl ? (
                  <img
                    src={cfg.logoUrl}
                    alt={cfg.namaSekolah}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <School className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-100" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-emerald-800 rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Layanan PSB Subulussalam
                </h1>
                <span className="hidden xs:inline-flex items-center space-x-1 bg-emerald-700/80 text-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 truncate">
                Customer Service Pendaftaran • TP {cfg.tahunPelajaran}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => {
                setCurrentStep(100);
                botReply('Silakan ketikkan Nomor ID Pendaftaran (Contoh: A-2026-0001):', 400);
              }}
              className="px-2.5 py-1.5 bg-emerald-700/90 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition border border-emerald-500/40 flex items-center space-x-1"
              title="Cek Berkas / Konfirmasi Pembayaran dengan ID"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Cek Berkas / ID</span>
            </button>

            <button
              onClick={startConversation}
              className="p-2 sm:px-3 sm:py-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700/80 active:bg-emerald-700 rounded-xl transition text-xs flex items-center space-x-1"
              title="Mulai Ulang Percakapan"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline text-xs font-medium">Ulangi Chat</span>
            </button>

            {isAdminLoggedIn && onSwitchToDashboard && (
              <button
                onClick={onSwitchToDashboard}
                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition border border-emerald-500/40 shrink-0"
              >
                Meja Panitia
              </button>
            )}
          </div>
        </header>

        {/* Informative Security Sub-header */}
        <div className="bg-emerald-50/90 border-b border-emerald-100/90 px-3.5 sm:px-5 py-2 flex items-center justify-between text-[11px] text-emerald-900 shrink-0">
          <div className="flex items-center space-x-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate">Layanan pendaftaran baru & cek berkas mandiri ramah wali murid.</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-emerald-700 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tersimpan Resmi & Terenkripsi</span>
          </div>
        </div>

        {/* Promo Iklan Banner jika promo aktif */}
        {promoAktif && (
          <div
            className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b shrink-0 transition ${
              isEligibleForPromo
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Badge Icon */}
              <div className={`p-1.5 rounded-lg shrink-0 ${isEligibleForPromo ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <Flame className="w-4 h-4 text-current animate-pulse" />
              </div>

              {/* Text Information: Responsive Wrap without ellipsis cut-off */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                    isEligibleForPromo ? 'bg-amber-900/40 text-amber-100 border border-amber-300/30' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isEligibleForPromo ? 'Promo Spesial' : 'Info Kuota'}
                  </span>
                  {isEligibleForPromo && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-orange-700 shadow-2xs">
                      Sisa {sisaSlotPromo} Kuota
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs font-medium leading-snug break-words">
                  {isEligibleForPromo ? (
                    <>
                      Potongan Biaya <strong>{diskonPersen}%</strong> (menjadi <span className="font-bold underline decoration-white/60">Rp {discountedFeeStr}</span>) untuk {kuotaMaksimal} pendaftar pertama!
                    </>
                  ) : (
                    <>
                      Kuota promo potongan {diskonPersen}% ({kuotaMaksimal} pendaftar pertama) telah penuh. Biaya pendaftaran berlaku normal: <strong>Rp {normalFeeStr}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Body - Scrollable without visible scrollbar */}
        <div className="flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-3 sm:p-5 space-y-3 sm:space-y-4 bg-slate-50/80">
          <div className="text-center my-1">
            <span className="bg-slate-200/90 text-slate-600 text-[10px] sm:text-[11px] px-3 py-1 rounded-full font-medium">
              Hari ini • Pelayanan Resmi Ponpes Subulussalam
            </span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                }`}
              >
                {/* Sender Identifier */}
                <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100/80 text-[10px] text-slate-500">
                  <span className="font-semibold flex items-center space-x-1">
                    {msg.sender === 'bot' ? (
                      <>
                        <Bot className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                        <span className="text-emerald-800 font-bold">Layanan PSB Subulussalam</span>
                      </>
                    ) : (
                      <span className="text-emerald-100 font-bold">Wali Murid</span>
                    )}
                  </span>
                  <span className={msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Message Content */}
                <div className="whitespace-pre-line leading-relaxed font-sans text-slate-800 break-words">
                  {msg.text}
                </div>

                {/* Digital Registration Receipt Card (Fully Mobile Responsive) */}
                {msg.applicantCard && (
                  <div className="mt-3 sm:mt-4 p-3.5 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-slate-800 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                      <div className="flex items-center space-x-2">
                        <FileCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="font-bold text-xs text-emerald-950">
                          BUKTI PENDAFTARAN RESMI
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-700 text-white rounded-md font-mono text-xs font-bold shadow-2xs">
                        {msg.applicantCard.id}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] sm:text-xs">
                      <div className="flex justify-between py-0.5 border-b border-emerald-100">
                        <span className="text-slate-500">Nama Santri:</span>
                        <span className="font-bold text-slate-900 text-right">{msg.applicantCard.namaLengkap}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-emerald-100">
                        <span className="text-slate-500">Nomor NISN:</span>
                        <span className="font-semibold text-slate-900 text-right">{msg.applicantCard.nisn}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-emerald-100">
                        <span className="text-slate-500">Orang Tua / Wali:</span>
                        <span className="font-medium text-slate-800 text-right">{msg.applicantCard.namaWali}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-emerald-100">
                        <span className="text-slate-500">Asal Sekolah:</span>
                        <span className="font-medium text-slate-800 text-right">{msg.applicantCard.asalSekolah}</span>
                      </div>
                      <div className="flex justify-between py-0.5 items-center">
                        <span className="text-slate-500">Status Registrasi:</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            msg.applicantCard.statusPembayaran === 'Sudah'
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {msg.applicantCard.statusPembayaran === 'Sudah'
                            ? `Sudah Dibayar (Rp ${msg.applicantCard.nominalTransfer || cfg.biayaPendaftaran})`
                            : 'Belum Bayar (Menyusul)'}
                        </span>
                      </div>
                      {msg.applicantCard.statusPembayaran === 'Sudah' && msg.applicantCard.metodeTransfer && (
                        <div className="text-[10px] text-emerald-800 bg-emerald-100/60 p-2 rounded-lg mt-1 space-y-0.5">
                          <div><strong>Saluran:</strong> {msg.applicantCard.metodeTransfer}</div>
                          <div><strong>Pengirim:</strong> {msg.applicantCard.namaPengirimTransfer || '-'}</div>
                          <div><strong>Waktu:</strong> {msg.applicantCard.waktuTransfer || '-'}</div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2.5 border-t border-emerald-200/90 space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={getWhatsAppShareUrl(msg.applicantCard)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl text-center transition flex items-center justify-center space-x-1.5 shadow-xs"
                          title="Kirim pesan pemberitahuan resmi pendaftaran santri baru ke WhatsApp Panitia PPDB"
                        >
                          <MessageSquare className="w-4 h-4 shrink-0" />
                          <span>Kirim Pemberitahuan ke Panitia PPDB</span>
                        </a>

                        <button
                          onClick={() => handleCopyNotice(msg.applicantCard!)}
                          className="w-full sm:w-auto min-h-[44px] bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-1.5"
                          title="Salin isi format pesan pemberitahuan pendaftaran"
                        >
                          {copiedCardId === msg.applicantCard.id ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-emerald-700 font-bold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                              <span>Salin Teks</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handlePrint}
                          className="w-full sm:w-auto min-h-[44px] bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-1"
                          title="Cetak Bukti Pendaftaran"
                        >
                          <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>Cetak</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-emerald-800/90 leading-tight flex items-center space-x-1">
                        <span className="font-semibold">💡 Info:</span>
                        <span>Format WhatsApp otomatis berisikan surat pemberitahuan santri baru yang ditujukan kepada Panitia PPDB.</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Interactive Quick Replies - Touch Optimized for Mobile */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                    {msg.quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(reply)}
                        className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold transition text-left flex items-center space-x-1.5 active:scale-[0.98] ${
                          msg.sender === 'user'
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <span>{reply}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3 shadow-xs flex items-center space-x-1.5">
                <Bot className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-400 ml-1">Customer service sedang mengetik...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sticky Input Bar at Bottom (Keyboard & Touch friendly) */}
        <footer className="sticky bottom-0 z-20 bg-white border-t border-slate-200/90 p-2.5 sm:p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xs">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                currentStep === 0
                  ? 'Ketik pesan, pilih tombol, atau ketik ID Pendaftaran (A-2026-0001)...'
                  : currentStep === 100
                  ? 'Ketik ID Pendaftaran resmi ananda (contoh: A-2026-0001)...'
                  : currentStep === 111
                  ? 'Ketik data perbaikan yang baru...'
                  : currentStep === 120
                  ? 'Ketik waktu transfer (contoh: Hari ini jam 10:15 WIB)...'
                  : currentStep === 121
                  ? 'Ketik transfer via apa (contoh: Bank BRI / DANA)...'
                  : currentStep === 122
                  ? 'Ketik nama pemilik rekening pengirim...'
                  : currentStep === 123
                  ? `Ketik nominal transfer (contoh: ${cfg.biayaPendaftaran})...`
                  : currentStep === 1
                  ? 'Ketik nama lengkap calon santri...'
                  : currentStep === 2
                  ? 'Ketik tempat & tanggal lahir ananda...'
                  : currentStep === 4
                  ? 'Ketik nama tiyuh/desa, RT/RW, kec, kab, dan prov...'
                  : currentStep === 6
                  ? 'Ketik nomor WhatsApp aktif (0858...)...'
                  : currentStep === 7
                  ? 'Ketik 10 digit nomor NISN...'
                  : 'Ketik jawaban Bapak/Ibu di sini...'
              }
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="min-h-[44px] min-w-[44px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 shadow-xs shrink-0"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>

          <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 px-1">
            <span className="flex items-center space-x-1 truncate">
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">Layanan Mandiri & Interaktif PSB Ponpes Subulussalam</span>
            </span>
            <span className="font-mono text-emerald-700 font-semibold shrink-0 ml-2">
              TP {cfg.tahunPelajaran}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
