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
} from 'lucide-react';
import { Pendaftar, SheetConfig, AcademicYearConfig, DEFAULT_ACADEMIC_YEAR_CONFIG } from '../types';
import { generateUniquePpdbId, normalizeWhatsAppNumber } from '../services/whatsappExtractor';
import { runAutomaticVerification } from '../services/verificationEngine';
import {
  buildApplicantNoticeToCommitteeMessage,
  buildRegistrationConfirmationMessage,
} from '../services/whatsappNotification';

interface ChatbotPortalProps {
  onAddApplicant: (applicant: Pendaftar) => void;
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
};

export const ChatbotPortal: React.FC<ChatbotPortalProps> = ({
  onAddApplicant,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [cfg.tahunPelajaran, cfg.angkatan, cfg.namaSekolah, cfg.biayaPendaftaran, cfg.rekeningPembayaran]);

  const startConversation = () => {
    setDraft(INITIAL_DRAFT);
    setCurrentStep(0);
    setCompletedApplicant(null);
    setIsTyping(true);

    setTimeout(() => {
      setMessages([
        {
          id: 'msg-cs-init',
          sender: 'bot',
          text: `Assalamu’alaikum Warahmatullahi Wabarakatuh. 🌸\n\nSelamat datang di Layanan Penerimaan Santri Baru (PSB) ${cfg.namaSekolah} Tahun Pelajaran ${cfg.tahunPelajaran} (Angkatan ${cfg.angkatan}).\n\nSaya Siti, asisten layanan pendaftaran santri baru Subulussalam. Saya siap mendampingi Bapak/Ibu wali murid untuk mengisi formulir pendaftaran ananda dengan mudah dan nyaman.\n\nApakah Bapak/Ibu berkenan memulai pengisian data sekarang?`,
          timestamp: getCurrentTime(),
          quickReplies: ['Bismillah, Mulai Pendaftaran ✍️', 'Lihat Info Biaya & Rekening 💳'],
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

  const handleUserResponse = (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Customer Service Conversational State Machine
    if (currentStep === 0) {
      if (
        text.toLowerCase().includes('informasi') ||
        text.toLowerCase().includes('biaya') ||
        text.toLowerCase().includes('rekening')
      ) {
        botReply(
          `📋 *Informasi Pendaftaran PSB ${cfg.tahunPelajaran} (Angkatan ${cfg.angkatan}):*\n\n` +
          `• *Biaya Pendaftaran:* Rp ${cfg.biayaPendaftaran}\n` +
          `• *Rekening Resmi Pembayaran:*\n` +
          `   ${cfg.rekeningPembayaran}\n\n` +
          `• *Nomor Kontak Panitia PSB:*\n` +
          `   ${cfg.kontakAdminWa}\n\n` +
          `• *Kelengkapan yang Perlu Disiapkan:*\n` +
          `   1. Nama lengkap & data kelahiran ananda\n` +
          `   2. Nama orang tua/wali & alamat domisili\n` +
          `   3. Asal sekolah & nomor WhatsApp aktif\n` +
          `   4. Nomor NISN (10 digit, jika ada)\n\n` +
          `Apakah Bapak/Ibu sudah siap untuk kita mulai pengisian formulirnya?`,
          700,
          ['Bismillah, Mulai Sekarang ✍️']
        );
        return;
      }

      // Step 1: Nama Lengkap Calon Santri (Friendly CS Tone)
      setCurrentStep(1);
      botReply(
        `Alhamdulillah, bismillah kita mulai ya Bapak/Ibu. 😊\n\nBoleh kami tahu siapa **nama lengkap ananda calon santri** (sesuai yang tertera pada ijazah SD/MI atau akta kelahiran)?`,
        650
      );
      return;
    }

    if (currentStep === 1) {
      const nama = text.trim();
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
      const ttl = text.trim();
      setDraft((prev) => ({ ...prev, tanggalLahir: ttl }));
      setCurrentStep(3);
      botReply(
        `Baik, data kelahiran ananda tercatat: *${ttl}*.\n\nKemudian, boleh kami tahu siapa **nama lengkap orang tua atau wali** yang bertanggung jawab atas ananda?`,
        650
      );
      return;
    }

    if (currentStep === 3) {
      const wali = text.trim();
      setDraft((prev) => ({ ...prev, namaWali: wali }));
      setCurrentStep(4);
      botReply(
        `Salam hormat kami untuk Bapak/Ibu *${wali}*.\n\nDi mana **alamat domisili tempat tinggal** ananda dan keluarga saat ini?\n*(mohon tuliskan nama tiyuh/desa, RT/RW, kecamatan, kabupaten dan provinsi ya)*`,
        650
      );
      return;
    }

    if (currentStep === 4) {
      const alamat = text.trim();
      setDraft((prev) => ({ ...prev, alamatTinggal: alamat }));
      setCurrentStep(5);
      botReply(
        `Alamat tercatat dengan baik: *${alamat}*.\n\nAlhamdulillah. Selanjutnya, apa **nama sekolah atau madrasah asal (SD/MI)** ananda sebelumnya?\n*(Contoh: SDN 26 TBT atau MIS Subulussalam)*`,
        650
      );
      return;
    }

    if (currentStep === 5) {
      const sekolah = text.trim();
      setDraft((prev) => ({ ...prev, asalSekolah: sekolah }));
      setCurrentStep(6);
      botReply(
        `Asal sekolah ananda dari *${sekolah}* telah kami simpan.\n\nUntuk kemudahan penyampaian informasi seleksi, jadwal tes, dan pengumuman resmi, boleh kami minta **nomor WhatsApp aktif** Bapak/Ibu yang dapat dihubungi panitia?\n*(Contoh: 085832297239)*`,
        650
      );
      return;
    }

    if (currentStep === 6) {
      const waRaw = text.trim();
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
      let nisnVal = text.trim();
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
      const lower = text.toLowerCase();
      const isPip = lower.includes('ya') || lower.includes('pernah') ? 'Ya' : 'Tidak';
      setDraft((prev) => ({ ...prev, pipSebelumnya: isPip }));
      setCurrentStep(9);
      botReply(
        `Status bantuan PIP: *${isPip === 'Ya' ? 'Penerima PIP' : 'Bukan Penerima PIP'}*.\n\nTerakhir untuk administrasi registrasi formulir sebesar **Rp ${cfg.biayaPendaftaran}**, apakah Bapak/Ibu sudah melakukan pembayaran/transfer ke rekening resmi pondok pesantren?\n\n🏦 *${cfg.rekeningPembayaran}*\n\n*(Catatan: Jika belum transfer saat ini, pendaftaran tetap bisa diproses dan bukti transfer dapat disusulkan kemudian)*`,
        650,
        ['Sudah Transfer / Bayar ✅', 'Belum Bayar (Akan Segera Transfer) ⏳']
      );
      return;
    }

    if (currentStep === 9) {
      const lower = text.toLowerCase();
      const isPaid = lower.includes('sudah') || lower.includes('lunas') || lower.includes('bayar') ? 'Sudah' : 'Belum';
      const updatedDraft: FormDraft = { ...draft, statusPembayaran: isPaid };
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
        `• *Biaya Registrasi (Rp ${cfg.biayaPendaftaran}):* ${isPaid === 'Sudah' ? 'Sudah Ditransfer' : 'Belum (Menyusul)'}\n\n` +
        `Apakah data di atas sudah sesuai dan siap kami teruskan ke panitia penerimaan santri baru?`,
        850,
        ['Sudah Sesuai, Kirim Pendaftaran 🚀', 'Ada yang Perlu Diperbaiki ✏️'],
        undefined,
        true
      );
      return;
    }

    if (currentStep === 10) {
      if (text.toLowerCase().includes('ulang') || text.toLowerCase().includes('perbaiki') || text.toLowerCase().includes('ubah')) {
        startConversation();
        return;
      }

      // Generate official ID A-YYYY-XXXX
      const yearCode = cfg.kodeTahunId || cfg.tahunPelajaran.split('/')[0] || '2026';
      const newId = generateUniquePpdbId(existingApplicants.length, yearCode);
      const normalizedWa = normalizeWhatsAppNumber(draft.noWa);

      const rawMessage = `Formulir pendaftaran PSB angkatan ${cfg.angkatan} tapel. ${cfg.tahunPelajaran.replace('/', '-')}

1. Nama lengkap:${draft.namaLengkap}
2. Tanggal lahir:${draft.tanggalLahir}
3. Nama wali :${draft.namaWali}
4. Tempat Tinggal:${draft.alamatTinggal}
5. Asal sekolah:${draft.asalSekolah}
6. No. WhatsApp:${draft.noWa}
7. No. NISN :${draft.nisn}
8. Apakah calon santri mendapatkan bantuan PIP ketika dijenjang SD? (YA/TIDAK):${draft.pipSebelumnya.toUpperCase()}
9. Apakah calon santri sudah membayar biaya pendaftaran sebesar Rp ${cfg.biayaPendaftaran}? (Sudah/belum):${draft.statusPembayaran === 'Sudah' ? 'Sudah transfer' : 'belum bayar'}
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
      setCurrentStep(11);

      botReply(
        `Alhamdulillah wa syukurillah! 🌸\n\nPendaftaran ananda *${draft.namaLengkap.toUpperCase()}* telah resmi kami terima dan tersimpan di buku pendaftaran PSB Ponpes Subulussalam.\n\n` +
        `🔖 *Nomor Registrasi Resmi: ${newId}*\n\n` +
        `Bapak/Ibu dapat menyimpan bukti pendaftaran di bawah ini atau langsung mengirimkan konfirmasi ke WhatsApp panitia untuk penjadwalan observasi/wawancara.`,
        900,
        ['Daftarkan Santri Baru Lainnya ➕'],
        newApplicant
      );
      return;
    }

    if (currentStep === 11) {
      if (text.toLowerCase().includes('santri') || text.toLowerCase().includes('daftar')) {
        startConversation();
      } else {
        botReply(
          `Terima kasih Bapak/Ibu. Ada hal lain seputar pendaftaran santri baru yang dapat kami bantu?`,
          600,
          ['Daftarkan Santri Baru Lainnya ➕']
        );
      }
    }
  };

  const getWhatsAppShareUrl = (applicant: Pendaftar) => {
    const text = buildApplicantNoticeToCommitteeMessage(applicant, cfg.namaSekolah, cfg.tahunPelajaran);
    const panitiaWa = cfg.kontakAdminWa.replace(/\D/g, '');
    const cleanPanitiaWa = panitiaWa.startsWith('0') ? '62' + panitiaWa.substring(1) : panitiaWa;
    return `https://wa.me/${cleanPanitiaWa || '6285832297239'}?text=${encodeURIComponent(text)}`;
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
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-700 border-2 border-emerald-400/70 flex items-center justify-center text-white shadow-xs">
                <School className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-100" />
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
            <span className="truncate">Panduan resmi pendaftaran santri baru ramah wali murid.</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-emerald-700 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tersimpan Resmi & Rahasia</span>
          </div>
        </div>

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
                            ? `Sudah Dibayar (Rp ${cfg.biayaPendaftaran})`
                            : 'Belum Bayar (Menyusul)'}
                        </span>
                      </div>
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
                  ? 'Ketik pesan atau pilih opsi di atas...'
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
              <span className="truncate">Layanan Resmi Pendaftaran Ponpes Subulussalam</span>
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
