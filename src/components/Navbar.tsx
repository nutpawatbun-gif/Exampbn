import React from 'react';
import {
  ShieldCheck,
  Share2,
  Settings2,
  FolderLock,
  Globe,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
  GraduationCap,
} from 'lucide-react';
import { SharePackage } from '../types/share';

interface NavbarProps {
  currentMode: 'recipient' | 'admin' | 'create' | 'return' | 'return-list';
  onModeChange: (mode: 'recipient' | 'admin' | 'create' | 'return' | 'return-list') => void;
  shares: SharePackage[];
  activeShareId: string;
  onSelectShare: (shareId: string) => void;
  onOpenShareModal: () => void;
  isAdminLoggedIn?: boolean;
  lang: 'th' | 'en';
  onToggleLang: () => void;
  submittedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onModeChange,
  shares,
  activeShareId,
  onSelectShare,
  onOpenShareModal,
  isAdminLoggedIn,
  lang,
  onToggleLang,
  submittedCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#f8bbd0]/60 shadow-xs">
      {/* Top University Brand Ribbon */}
      <div className="bg-gradient-to-r from-[#c2185b] via-[#ec407a] to-[#ab47bc] text-white text-[11px] sm:text-xs py-1.5 px-4 font-normal shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-[#ffca28]" />
            <span className="font-semibold tracking-wide">
              {lang === 'th'
                ? 'วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์'
                : 'Pho Khun Pha Mueang Buddhist College, Phetchabun'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-white/90 text-[11px]">
            <a
              href="https://phetchabun.mcu.ac.th/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ffca28] transition-colors flex items-center gap-1 font-medium"
            >
              <span>phetchabun.mcu.ac.th</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>•</span>
            <span className="text-amber-200 font-medium">ระบบบริการใบกรอกคะแนน ป.ตรี 2569</span>
          </div>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center justify-between gap-3">
          <div
            onClick={() => onModeChange('recipient')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Logo วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์ */}
            <div className="h-12 w-12 rounded-2xl bg-white shadow-xs border border-pink-100 flex items-center justify-center p-1 shrink-0 transition-transform group-hover:scale-105">
              <img
                src="/college-logo.png"
                alt="ตราประจำวิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="border-l-2 border-[#ec407a]/40 pl-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#4a148c] group-hover:text-[#c2185b] transition-colors">
                  วิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fce4ec] text-[#c2185b] border border-[#f8bbd0]">
                  <ShieldCheck className="w-3 h-3 text-[#ec407a]" />
                  <span>ระบบปลอดภัย</span>
                </span>
              </div>
              <p className="text-xs text-[#7b1fa2] font-medium leading-tight mt-0.5">
                {lang === 'th'
                  ? 'ระบบแชร์ใบกรอกคะแนนและเอกสารการศึกษา (ไม่ต้องล็อกอิน)'
                  : 'Zero-Login Academic Document & Score Sheet Portal'}
              </p>
            </div>
          </div>

          {/* Quick link switcher for multiple shares (mobile/compact) */}
          {shares.length > 1 && (
            <div className="hidden xl:block ml-2 pl-3 border-l border-[#f8bbd0]/60">
              <select
                value={activeShareId}
                onChange={(e) => onSelectShare(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-[#fce4ec] border border-[#f8bbd0] text-xs text-[#4a148c] outline-none focus:border-[#ec407a]"
              >
                {shares.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Nav Navigation */}
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 justify-start sm:justify-end">
          {/* Mode Switcher Tabs */}
          <div className="bg-[#fce4ec]/80 p-1.5 rounded-2xl border border-[#f8bbd0] flex items-center gap-1 text-xs font-semibold shadow-2xs overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => onModeChange('recipient')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                currentMode === 'recipient'
                  ? 'btn-mcu-primary shadow-sm font-bold'
                  : 'text-[#7b1fa2] hover:text-[#4a148c] hover:bg-white/70'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {lang === 'th' ? 'ดาวน์โหลดแบบฟอร์ม' : 'Download Forms'}
              </span>
            </button>

            {/* Return Grade Button */}
            <button
              type="button"
              onClick={() => onModeChange('return')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                currentMode === 'return'
                  ? 'btn-mcu-primary shadow-sm font-bold'
                  : 'text-[#7b1fa2] hover:text-[#4a148c] hover:bg-white/70'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>
                {lang === 'th' ? 'ส่งคืนใบกรอกเกรด' : 'Return Grades'}
              </span>
            </button>

            {/* View Submissions List Button */}
            <button
              type="button"
              onClick={() => onModeChange('return-list')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                currentMode === 'return-list'
                  ? 'bg-gradient-to-r from-[#4a148c] to-[#7b1fa2] text-white shadow-sm font-bold'
                  : 'text-[#7b1fa2] hover:text-[#4a148c] hover:bg-white/70'
              }`}
            >
              <span className="text-sm leading-none">📋</span>
              <span>
                {lang === 'th' ? 'รายการที่อัพโหลดแล้ว' : 'Submitted List'}
              </span>
              {submittedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#ec407a] text-white shadow-2xs">
                  {submittedCount}
                </span>
              )}
            </button>

            {/* Admin Management Button */}
            <button
              type="button"
              onClick={() => onModeChange('admin')}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                currentMode === 'admin'
                  ? 'bg-gradient-to-r from-[#4a148c] to-[#7b1fa2] text-white shadow-sm font-bold'
                  : 'text-[#7b1fa2] hover:text-[#4a148c] hover:bg-white/70'
              }`}
              title={lang === 'th' ? 'จัดการลิงก์' : 'Manage Links'}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'th' ? 'จัดการลิงก์' : 'Manage'}</span>
              {isAdminLoggedIn && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white"></span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Share Button (opens QR / link modal) */}
            <button
              type="button"
              onClick={onOpenShareModal}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-pink-50 text-[#c2185b] border border-[#f8bbd0] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
              title="Share & QR Code"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {lang === 'th' ? 'แชร์ & QR' : 'Share'}
              </span>
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={onToggleLang}
              className="px-3 py-2.5 rounded-2xl bg-white hover:bg-pink-50 border border-[#f8bbd0] text-[#7b1fa2] hover:text-[#4a148c] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-[#ec407a]" />
              <span className="uppercase">{lang}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
