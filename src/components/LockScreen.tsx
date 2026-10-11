import React, { useState, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  Clock,
  Download,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  FolderLock,
  Info,
  ExternalLink,
  GraduationCap,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SharePackage } from '../types/share';
import { getTimeRemaining, formatThaiDateTime } from '../utils/timeFormat';

interface LockScreenProps {
  share: SharePackage;
  onUnlockSuccess: (unlockedData: SharePackage) => void;
  lang: 'th' | 'en';
}

export const LockScreen: React.FC<LockScreenProps> = ({
  share,
  onUnlockSuccess,
  lang,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(
    getTimeRemaining(share.security.expiresAt)
  );

  // Update timer every second
  useEffect(() => {
    if (!share.security.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(share.security.expiresAt);
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [share.security.expiresAt]);

  const isExpired =
    share.security.expiresAt !== null && timeLeft.isExpired;

  const isLimitReached =
    share.security.maxDownloads !== null &&
    share.security.maxDownloads !== undefined &&
    share.stats.totalDownloadsCount >= share.security.maxDownloads;

  const handleUnlock = async (e?: React.FormEvent, overridePwd?: string) => {
    if (e) e.preventDefault();
    if (isExpired || isLimitReached) return;

    const pwdToSubmit = overridePwd !== undefined ? overridePwd : password;
    if (!pwdToSubmit && share.security.requirePassword) {
      setErrorMsg(
        lang === 'th'
          ? 'กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ'
          : 'Please enter the access passcode'
      );
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/shares/${share.id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwdToSubmit }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#b30253', '#f43f5e', '#d97706', '#10b981'],
          });
        } catch {}
        onUnlockSuccess(json.data);
      } else {
        setErrorMsg(
          json.message ||
            (lang === 'th'
              ? 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
              : 'Incorrect passcode. Please try again.')
        );
        triggerShake();
      }
    } catch {
      // Offline fallback
      const expected = (share.security.password || '').trim().toLowerCase();
      const provided = pwdToSubmit.trim().toLowerCase();
      if (provided === expected || !share.security.requirePassword) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
        onUnlockSuccess({
          ...share,
          stats: { ...share.stats, unlockedCount: share.stats.unlockedCount + 1 },
        });
      } else {
        setErrorMsg(
          lang === 'th'
            ? 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
            : 'Incorrect passcode. Please try again.'
        );
        triggerShake();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 md:py-12">
      {/* University Main Card */}
      <div
        className={`bg-white/95 backdrop-blur-md rounded-[24px] border border-white/60 shadow-[0_15px_35px_rgba(171,71,188,0.15),0_5px_15px_rgba(0,0,0,0.05)] overflow-hidden transition-transform relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1.5 before:bg-gradient-to-r before:from-[#ec407a] before:to-[#ab47bc] ${
          isShaking ? 'animate-[wiggle_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Top Header Card */}
        <div className="p-6 md:p-8 text-center border-b border-[#f8bbd0]/40 bg-gradient-to-b from-[#fce4ec]/40 via-white to-white">
          {/* Official College Logo in Header */}
          <div className="flex justify-center mb-4">
            <img
              src="/college-logo.png"
              alt="ตราประจำวิทยาลัยสงฆ์พ่อขุนผาเมือง เพชรบูรณ์"
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-xs transition-transform hover:scale-105"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fce4ec] border border-[#f8bbd0] text-[#c2185b] text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#ec407a]" />
            <span>
              {lang === 'th'
                ? 'ระบบบริการเอกสารทางการศึกษา • ไม่ต้องล็อกอิน'
                : 'Zero-Login University Secure Document Portal'}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-gradient-mcu tracking-tight leading-snug">
            {share.title}
          </h1>

          {share.description && (
            <p className="mt-2 text-xs md:text-sm text-[#7b1fa2] max-w-md mx-auto leading-relaxed">
              {share.description}
            </p>
          )}

          {/* Key Parameters Badges in Clean MCU Cards */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-left">
            {/* Total files */}
            <div className="p-3 rounded-2xl bg-[#fdf5f8] border border-[#f8bbd0]/60 shadow-2xs flex flex-col justify-between">
              <span className="text-[#ad1457] text-[11px] font-semibold uppercase tracking-wider">
                {lang === 'th' ? 'จำนวนเอกสาร' : 'Total Files'}
              </span>
              <span className="font-bold text-[#4a148c] text-sm mt-0.5">
                {share.files.length} {lang === 'th' ? 'ไฟล์ (.xls)' : 'Files'}
              </span>
            </div>

            {/* Expiration badge */}
            <div
              className={`p-3 rounded-2xl border shadow-2xs flex flex-col justify-between ${
                isExpired
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-[#fdf5f8] border-[#f8bbd0]/60 text-[#4a148c]'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] text-[#ad1457] font-semibold uppercase tracking-wider">
                <Clock className="w-3 h-3 text-[#ec407a]" />
                <span>{lang === 'th' ? 'กำหนดหมดอายุ' : 'Expires'}</span>
              </div>
              <span
                className={`font-bold text-xs mt-0.5 truncate ${
                  isExpired ? 'text-rose-600' : 'text-[#c2185b]'
                }`}
              >
                {share.security.expiresAt
                  ? isExpired
                    ? lang === 'th'
                      ? 'หมดอายุแล้ว'
                      : 'Expired'
                    : timeLeft.formattedText
                  : lang === 'th'
                  ? 'ตลอดไป'
                  : 'Never'}
              </span>
            </div>

            {/* Downloads limit */}
            <div
              className={`col-span-2 md:col-span-1 p-3 rounded-2xl border shadow-2xs flex flex-col justify-between ${
                isLimitReached
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-[#fdf5f8] border-[#f8bbd0]/60 text-[#4a148c]'
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] text-[#ad1457] font-semibold uppercase tracking-wider">
                <Download className="w-3 h-3 text-[#ec407a]" />
                <span>{lang === 'th' ? 'สิทธิ์ดาวน์โหลด' : 'Downloads'}</span>
              </div>
              <span
                className={`font-bold text-xs mt-0.5 truncate ${
                  isLimitReached ? 'text-amber-600' : 'text-[#4a148c]'
                }`}
              >
                {share.security.maxDownloads !== null &&
                share.security.maxDownloads !== undefined
                  ? `${share.stats.totalDownloadsCount}/${share.security.maxDownloads} ครั้ง`
                  : lang === 'th'
                  ? 'ไม่จำกัด'
                  : 'Unlimited'}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8">
          {/* Status Blockers */}
          {isExpired ? (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-rose-900">
                {lang === 'th'
                  ? 'ลิงก์เอกสารนี้หมดอายุการใช้งานแล้ว'
                  : 'This share link has expired'}
              </h3>
              <p className="text-xs text-rose-700 mt-1">
                {lang === 'th'
                  ? `ลิงก์นี้หมดอายุเมื่อ: ${formatThaiDateTime(
                      share.security.expiresAt
                    )} กรุณาติดต่อฝ่ายวิชาการเพื่อขอลิงก์ใหม่`
                  : `Expired on ${formatThaiDateTime(
                      share.security.expiresAt
                    )}. Please contact the administrator.`}
              </p>
            </div>
          ) : isLimitReached ? (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <Download className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-amber-900">
                {lang === 'th'
                  ? 'สิทธิ์การดาวน์โหลดครบตามจำนวนที่กำหนดแล้ว'
                  : 'Download limit reached'}
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                {lang === 'th'
                  ? `ลิงก์นี้จำกัดการดาวน์โหลดไว้ที่ ${share.security.maxDownloads} ครั้ง และมีการดาวน์โหลดครบแล้ว`
                  : `This link had a limit of ${share.security.maxDownloads} downloads.`}
              </p>
            </div>
          ) : (
            /* Active Unlock Form */
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#b30253]" />
                    {lang === 'th'
                      ? 'กรอกรหัสผ่านเพื่อเข้าสู่ระบบ (Passcode)'
                      : 'Enter Security Passcode'}
                  </span>
                  {share.security.passwordHint && (
                    <button
                      type="button"
                      onClick={() => setShowHint(!showHint)}
                      className="text-[11px] text-[#b30253] hover:text-[#960144] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Info className="w-3 h-3" />
                      <span>
                        {showHint
                          ? lang === 'th'
                            ? 'ซ่อนคำใบ้'
                            : 'Hide hint'
                          : lang === 'th'
                          ? 'ดูคำใบ้รหัสผ่าน'
                          : 'Show hint'}
                      </span>
                    </button>
                  )}
                </label>

                {/* Password input container */}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder={
                      lang === 'th'
                        ? 'กรอกรหัสผ่านเพื่อเข้าสู่ระบบ...'
                        : 'Enter passcode to access files...'
                    }
                    disabled={isLoading}
                    autoFocus
                    className="w-full px-5 py-4 rounded-2xl bg-[#fce4ec] border-2 border-transparent focus:border-[#ec407a] focus:bg-white focus:shadow-[0_4px_20px_rgba(236,64,122,0.15)] text-[#4a148c] placeholder-[#ad1457]/50 text-sm tracking-wide transition-all outline-none pr-12 font-medium"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ad1457] hover:text-[#4a148c] p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Hint reveal */}
                {showHint && share.security.passwordHint && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-700" />
                    <span>
                      <strong className="font-semibold text-amber-950">
                        {lang === 'th' ? 'คำใบ้: ' : 'Hint: '}
                      </strong>
                      {share.security.passwordHint}
                    </span>
                  </div>
                )}

                {/* Error message */}
                {errorMsg && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              {/* Unlock Submit Button in MCU Primary Gradient */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-mcu-primary w-full py-4 px-6 rounded-2xl text-white font-bold text-base shadow-[0_10px_20px_rgba(233,30,99,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {lang === 'th' ? 'กำลังตรวจสอบรหัส...' : 'Verifying...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      {lang === 'th'
                        ? 'ปลดล็อกและดูรายการแบบฟอร์ม'
                        : 'Unlock & View Forms'}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Academic Instruction Note */}
          {share.customNote && (
            <div className="mt-5 p-4 rounded-2xl bg-[#fdf5f8] border border-[#f8bbd0]/60 text-xs text-[#4a148c]">
              <span className="font-bold text-[#ad1457]">
                {lang === 'th' ? 'คำชี้แจงสำหรับอาจารย์: ' : 'Faculty Notice: '}
              </span>
              {share.customNote}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
